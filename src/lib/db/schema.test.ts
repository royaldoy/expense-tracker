import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { MoneyTrackerDatabase } from './schema';
import type { Budget, Wallet } from '../domain/types';

describe('Database Schema & Migration Test (Dexie IndexedDB)', () => {
	let dbName: string;

	beforeEach(() => {
		dbName = `MigrationTestDB_${Date.now()}_${Math.random()}`;
	});

	it('menginisialisasi basis data langsung pada versi terbaru (versi 4) dengan tabel budgets, recurringRules, dan notifications', async () => {
		const testDb = new MoneyTrackerDatabase(dbName);
		await testDb.open();

		expect(testDb.verno).toBe(4);
		expect(testDb.tables.some((t) => t.name === 'budgets')).toBe(true);
		expect(testDb.tables.some((t) => t.name === 'recurringRules')).toBe(true);
		expect(testDb.tables.some((t) => t.name === 'notifications')).toBe(true);
		expect(testDb.tables.some((t) => t.name === 'wallets')).toBe(true);

		// Dapat menyimpan anggaran baru
		const budget: Budget = {
			id: 'b_test_init',
			categoryId: 'c_food',
			period: '2026-10',
			limit: 1500000,
			alertAt: 80,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		};

		await testDb.budgets.add(budget);
		const found = await testDb.budgets.get('b_test_init');
		expect(found).toBeDefined();
		expect(found?.limit).toBe(1500000);

		await testDb.close();
	});

	it('berhasil melakukan migrasi dari Versi 1 ke Versi 2 tanpa merusak data lama', async () => {
		// 1. Buat database mentah yang hanya memiliki versi 1
		const legacyDb = new Dexie(dbName);
		legacyDb.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});

		await legacyDb.open();
		expect(legacyDb.verno).toBe(1);

		// Isi data wallet di versi 1
		const initialWallet: Wallet = {
			id: 'w_legacy_1',
			name: 'BCA Tabungan',
			type: 'bank',
			openingBalance: 500000,
			balance: 500000,
			color: '#0058bc',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		};
		await legacyDb.table('wallets').add(initialWallet);
		await legacyDb.close();

		// 2. Buka database yang sama menggunakan MoneyTrackerDatabase (yang memiliki versi 1 & versi 2)
		const upgradedDb = new MoneyTrackerDatabase(dbName);
		await upgradedDb.open();

		// Verifikasi nomor versi telah naik ke 4
		expect(upgradedDb.verno).toBe(4);

		// Data lama dari versi 1 tetap utuh
		const preservedWallet = await upgradedDb.wallets.get('w_legacy_1');
		expect(preservedWallet).toBeDefined();
		expect(preservedWallet?.name).toBe('BCA Tabungan');
		expect(preservedWallet?.balance).toBe(500000);

		// Tabel budgets sekarang tersedia dan dapat diisi
		const newBudget: Budget = {
			id: 'b_migrated_1',
			categoryId: 'c_transport',
			period: '2026-10',
			limit: 750000,
			alertAt: 80,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		};
		await upgradedDb.budgets.add(newBudget);

		// Verifikasi query compound index [categoryId+period]
		const queried = await upgradedDb.budgets
			.where('[categoryId+period]')
			.equals(['c_transport', '2026-10'])
			.first();
		expect(queried).toBeDefined();
		expect(queried?.id).toBe('b_migrated_1');
		expect(queried?.limit).toBe(750000);

		// Verifikasi tabel recurringRules pada versi 3
		await upgradedDb.recurringRules.add({
			id: 'rule_1',
			frequency: 'monthly',
			nextRunAt: '2026-11-01',
			autoPost: true,
			template: {
				amount: 50000,
				walletId: 'w_legacy_1'
			},
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		const queriedRule = await upgradedDb.recurringRules
			.where('frequency')
			.equals('monthly')
			.first();
		expect(queriedRule).toBeDefined();
		expect(queriedRule?.id).toBe('rule_1');

		// Verifikasi tabel notifications pada versi 4
		await upgradedDb.notifications.add({
			id: 'notif_1',
			type: 'recurring_due',
			title: 'Tagihan Jatuh Tempo',
			message: 'Tagihan WiFi jatuh tempo hari ini.',
			readAt: null,
			refId: 'rule_1_2026-11-01',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		const queriedNotif = await upgradedDb.notifications
			.where('[type+refId]')
			.equals(['recurring_due', 'rule_1_2026-11-01'])
			.first();
		expect(queriedNotif).toBeDefined();
		expect(queriedNotif?.id).toBe('notif_1');
		expect(queriedNotif?.title).toBe('Tagihan Jatuh Tempo');

		await upgradedDb.close();
	});

	it('menguji rantai migrasi bertahap penuh Dexie v1 -> v2 -> v3 -> v4 dengan data di setiap tabel', async () => {
		const stepDbName = `DexieStepwise_${Date.now()}_${Math.random()}`;

		// Langkah 1: Buat dan isi data di versi 1 (Fase 1/2 skema dasar)
		const v1Db = new Dexie(stepDbName);
		v1Db.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});
		await v1Db.open();
		expect(v1Db.verno).toBe(1);

		await v1Db.table('wallets').add({
			id: 'w_step_1',
			name: 'BCA',
			type: 'bank',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0058bc',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 1000,
			updatedAt: 1000,
			deletedAt: null
		});

		await v1Db.table('categories').add({
			id: 'c_step_1',
			name: 'Makan',
			kind: 'expense',
			parentId: null,
			icon: 'restaurant',
			color: '#ff9500',
			order: 1,
			createdAt: 1000,
			updatedAt: 1000,
			deletedAt: null
		});

		await v1Db.table('transactions').add({
			id: 't_step_1',
			type: 'expense',
			amount: 50000,
			walletId: 'w_step_1',
			toWalletId: null,
			fee: 0,
			categoryId: 'c_step_1',
			date: '2026-10-01',
			note: 'Makan siang',
			tagIds: [],
			attachmentId: 'att_step_1',
			recurringId: null,
			createdAt: 1000,
			updatedAt: 1000,
			deletedAt: null
		});

		await v1Db.table('attachments').add({
			id: 'att_step_1',
			blob: 'base64_foto_struk',
			uri: null,
			mime: 'image/jpeg',
			createdAt: 1000,
			updatedAt: 1000,
			deletedAt: null
		});

		await v1Db.table('settings').add({
			id: 's_step_1',
			key: 'salary_day',
			value: 25,
			createdAt: 1000,
			updatedAt: 1000,
			deletedAt: null
		});
		await v1Db.close();

		// Langkah 2: Buka dan naikkan ke versi 2 (menambahkan tabel budgets)
		const v2Db = new Dexie(stepDbName);
		v2Db.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});
		v2Db.version(2).stores({
			budgets: 'id, categoryId, period, [categoryId+period], deletedAt'
		});
		await v2Db.open();
		expect(v2Db.verno).toBe(2);

		await v2Db.table('budgets').add({
			id: 'b_step_1',
			categoryId: 'c_step_1',
			period: '2026-10',
			limit: 1500000,
			alertAt: 80,
			createdAt: 2000,
			updatedAt: 2000,
			deletedAt: null
		});
		await v2Db.close();

		// Langkah 3: Buka dan naikkan ke versi 3 (indeks transaksi berulang)
		const v3Db = new Dexie(stepDbName);
		v3Db.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});
		v3Db.version(2).stores({
			budgets: 'id, categoryId, period, [categoryId+period], deletedAt'
		});
		v3Db.version(3).stores({
			transactions:
				'id, type, walletId, toWalletId, categoryId, date, [walletId+date], recurringId, [recurringId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, frequency, deletedAt'
		});
		await v3Db.open();
		expect(v3Db.verno).toBe(3);

		await v3Db.table('recurringRules').add({
			id: 'rr_step_1',
			frequency: 'monthly',
			nextRunAt: '2026-11-01',
			autoPost: true,
			template: { amount: 50000 },
			createdAt: 3000,
			updatedAt: 3000,
			deletedAt: null
		});
		await v3Db.close();

		// Langkah 4: Buka database dengan MoneyTrackerDatabase terkini (versi 4 - tabel notifications)
		const latestDb = new MoneyTrackerDatabase(stepDbName);
		await latestDb.open();
		expect(latestDb.verno).toBe(4);

		// Verifikasi SELURUH data dari v1, v2, v3 tetap utuh 100% tanpa ada yang hilang
		const w = await latestDb.wallets.get('w_step_1');
		expect(w).toBeDefined();
		expect(w?.balance).toBe(1000000);

		const c = await latestDb.categories.get('c_step_1');
		expect(c).toBeDefined();
		expect(c?.name).toBe('Makan');

		const tx = await latestDb.transactions.get('t_step_1');
		expect(tx).toBeDefined();
		expect(tx?.amount).toBe(50000);

		const att = await latestDb.attachments.get('att_step_1');
		expect(att).toBeDefined();
		expect(att?.blob).toBe('base64_foto_struk');

		const s = await latestDb.settings.get('salary_day');
		expect(s).toBeDefined();
		expect(s?.value).toBe(25);

		const b = await latestDb.budgets.get('b_step_1');
		expect(b).toBeDefined();
		expect(b?.limit).toBe(1500000);

		const rr = await latestDb.recurringRules.get('rr_step_1');
		expect(rr).toBeDefined();
		expect(rr?.frequency).toBe('monthly');

		// Verifikasi tabel baru versi 4 (notifications) berfungsi penuh
		await latestDb.notifications.add({
			id: 'notif_step_1',
			type: 'budget_alert',
			title: 'Info Anggaran',
			message: 'Anggaran terpakai 80%',
			readAt: null,
			refId: 'b_step_1',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});
		const n = await latestDb.notifications.get('notif_step_1');
		expect(n).toBeDefined();
		expect(n?.title).toBe('Info Anggaran');

		await latestDb.close();
	});
});
