import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
	backupService,
	CURRENT_BACKUP_VERSION,
	escapeCsvCell,
	migrateBackupData
} from './backupService';
import { db } from '../db/schema';
import type { Wallet, Category, Transaction } from '../domain/types';

describe('BackupService (Versioned JSON, Valibot Validation, Migrations & RFC 4180 CSV)', () => {
	beforeEach(async () => {
		await db.transaction(
			'rw',
			[db.wallets, db.categories, db.transactions, db.budgets, db.settings],
			async () => {
				await db.wallets.clear();
				await db.categories.clear();
				await db.transactions.clear();
				await db.budgets.clear();
				await db.settings.clear();
			}
		);
	});

	it('escapeCsvCell meng-escape koma, kutip ganda, dan baris baru secara benar', () => {
		expect(escapeCsvCell('Halo')).toBe('Halo');
		expect(escapeCsvCell('Buku, Pulpen')).toBe('"Buku, Pulpen"');
		expect(escapeCsvCell('Kata "kutip"')).toBe('"Kata ""kutip"""');
		expect(escapeCsvCell('Baris 1\nBaris 2')).toBe('"Baris 1\nBaris 2"');
		expect(escapeCsvCell(null)).toBe('');
		expect(escapeCsvCell(undefined)).toBe('');
		expect(escapeCsvCell(1250000)).toBe('1250000');
	});

	it('ekspor cadangan menghasilkan envelope JSON dengan metadata dan data yang valid', async () => {
		// Isi data contoh
		const now = Date.now();
		const wallet: Wallet = {
			id: 'w_test_1',
			name: 'BCA Utama',
			type: 'bank',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0058BC',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await db.wallets.add(wallet);

		const jsonString = await backupService.exportBackupJson();
		const parsed = JSON.parse(jsonString);

		expect(parsed.meta).toBeDefined();
		expect(parsed.meta.version).toBe(CURRENT_BACKUP_VERSION);
		expect(parsed.meta.appName).toBe('Money Tracker');
		expect(parsed.meta.exportedAt).toBeDefined();
		expect(parsed.data).toBeDefined();
		expect(parsed.data.wallets).toHaveLength(1);
		expect(parsed.data.wallets[0].id).toBe('w_test_1');
	});

	it('siklus backup lalu restore menghasilkan data identik 100%', async () => {
		const now = Date.now();
		const wallet: Wallet = {
			id: 'w_identik_1',
			name: 'GoPay',
			type: 'ewallet',
			openingBalance: 500000,
			balance: 450000,
			color: '#0070EB',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		const category: Category = {
			id: 'c_identik_1',
			name: 'Makan & Minum',
			kind: 'expense',
			parentId: null,
			icon: 'restaurant',
			color: '#FF9500',
			order: 1,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		const transaction: Transaction = {
			id: 't_identik_1',
			type: 'expense',
			amount: 50000,
			walletId: 'w_identik_1',
			toWalletId: null,
			fee: 0,
			categoryId: 'c_identik_1',
			date: '2026-10-12',
			note: 'Makan siang nasi padang',
			tagIds: ['makan'],
			attachmentId: null,
			recurringId: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await db.wallets.add(wallet);
		await db.categories.add(category);
		await db.transactions.add(transaction);

		// Ekspor ke JSON
		const backupJson = await backupService.exportBackupJson();

		// Hapus atau ubah data di DB
		await db.wallets.clear();
		await db.categories.clear();
		await db.transactions.clear();
		expect(await db.wallets.count()).toBe(0);

		// Pulihkan dari JSON
		const restoreResult = await backupService.restoreBackupJson(backupJson);
		expect(restoreResult.success).toBe(true);
		expect(restoreResult.counts.wallets).toBe(1);
		expect(restoreResult.counts.categories).toBe(1);
		expect(restoreResult.counts.transactions).toBe(1);

		// Verifikasi data di DB pulih identik
		const restoredWallet = await db.wallets.get('w_identik_1');
		expect(restoredWallet).toBeDefined();
		expect(restoredWallet?.name).toBe('GoPay');
		expect(restoredWallet?.balance).toBe(450000);

		const restoredCat = await db.categories.get('c_identik_1');
		expect(restoredCat?.name).toBe('Makan & Minum');

		const restoredTx = await db.transactions.get('t_identik_1');
		expect(restoredTx?.amount).toBe(50000);
		expect(restoredTx?.note).toBe('Makan siang nasi padang');
	});

	it('menolak file rusak dengan pesan jelas dan TIDAK menimpa data lama', async () => {
		// Simpan data awal yang valid
		const initialWallet: Wallet = {
			id: 'w_safe_1',
			name: 'Dompet Asli Yang Aman',
			type: 'cash',
			openingBalance: 250000,
			balance: 250000,
			color: '#006E28',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		};
		await db.wallets.add(initialWallet);

		// Coba restore file JSON korup (sintaks rusak)
		const corruptedJson = '{"meta": {"version": 1}, "data": { wallets: [ broken json...';
		await expect(backupService.restoreBackupJson(corruptedJson)).rejects.toThrow(
			/File cadangan rusak atau format JSON tidak valid/
		);

		// Pastikan data lama tetap utuh di database
		const currentWallets = await db.wallets.toArray();
		expect(currentWallets).toHaveLength(1);
		expect(currentWallets[0].id).toBe('w_safe_1');
		expect(currentWallets[0].name).toBe('Dompet Asli Yang Aman');
	});

	it('menolak struktur skema yang tidak valid via Valibot dan TIDAK menimpa data lama', async () => {
		const initialWallet: Wallet = {
			id: 'w_safe_2',
			name: 'Dompet Tetap Ada',
			type: 'cash',
			openingBalance: 100000,
			balance: 100000,
			color: '#006E28',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		};
		await db.wallets.add(initialWallet);

		// File JSON dengan skema invalid (tipe dompet salah, openingBalance bukan angka)
		const invalidSchemaJson = JSON.stringify({
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '0.0.1',
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets: [
					{
						id: 'w_bad',
						name: 'Bad Wallet',
						type: 'invalid_type', // Salahi tipe
						openingBalance: 'bukan_angka', // Salahi angka
						color: '#000',
						icon: 'wallet'
					}
				],
				categories: [],
				transactions: []
			}
		});

		await expect(backupService.restoreBackupJson(invalidSchemaJson)).rejects.toThrow(
			/Format data cadangan tidak sesuai skema sistem/
		);

		// Data lama tetap aman
		const remaining = await db.wallets.toArray();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe('w_safe_2');
	});

	it('menolak integritas referensial yang cacat (transaksi merujuk ke dompet fiktif)', async () => {
		const invalidRelationalJson = JSON.stringify({
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '0.0.1',
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets: [
					{
						id: 'w_real_1',
						name: 'Real Wallet',
						type: 'bank',
						openingBalance: 500000,
						balance: 500000,
						color: '#0058BC',
						icon: 'account_balance',
						includeInTotal: true,
						archivedAt: null,
						createdAt: 1000,
						updatedAt: 1000,
						deletedAt: null
					}
				],
				categories: [],
				transactions: [
					{
						id: 't_ghost_1',
						type: 'expense',
						amount: 50000,
						walletId: 'w_ghost_nonexistent', // Merujuk ke dompet yang tidak ada!
						toWalletId: null,
						fee: 0,
						categoryId: null,
						date: '2026-10-12',
						note: null,
						tagIds: [],
						attachmentId: null,
						recurringId: null,
						createdAt: 1000,
						updatedAt: 1000,
						deletedAt: null
					}
				],
				budgets: [],
				settings: []
			}
		});

		await expect(backupService.restoreBackupJson(invalidRelationalJson)).rejects.toThrow(
			/Integritas data tidak terpenuhi: Transaksi t_ghost_1 merujuk ke dompet yang tidak ditemukan/
		);
	});

	it('restore dari backup versi lama (versi 0 / tanpa envelope) berhasil lewat migrasi otomatis', async () => {
		// Format versi lama (misal diekspor tanpa meta envelope, raw array)
		const legacyV0Data = {
			wallets: [
				{
					id: 'w_legacy_1',
					name: 'Dompet Lama',
					type: 'cash',
					openingBalance: 200000,
					// balance tidak ada di versi lama
					color: '#006E28',
					icon: 'payments'
				}
			],
			categories: [
				{
					id: 'c_legacy_1',
					name: 'Gaji',
					kind: 'income',
					icon: 'work',
					color: '#006E28'
				}
			],
			transactions: [
				{
					id: 't_legacy_1',
					type: 'income',
					amount: 1500000,
					walletId: 'w_legacy_1',
					date: '2026-09-25'
				}
			]
		};

		const migrated = migrateBackupData(legacyV0Data);
		expect(migrated.meta.version).toBe(CURRENT_BACKUP_VERSION);
		expect(migrated.data.wallets[0].balance).toBe(200000);
		expect(migrated.data.transactions[0].fee).toBe(0);

		// Lakukan restore langsung menggunakan string JSON versi lama
		const result = await backupService.restoreBackupJson(JSON.stringify(legacyV0Data));
		expect(result.success).toBe(true);
		expect(result.counts.wallets).toBe(1);
		expect(result.counts.transactions).toBe(1);

		const restoredWallet = await db.wallets.get('w_legacy_1');
		// Saldo dihitung dari openingBalance (200k) + income (1500k) = 1.700.000
		expect(restoredWallet?.balance).toBe(1700000);
	});

	it('prekalkulasi saldo memulihkan integritas saldo dompet yang corrupt di dalam file backup', async () => {
		const corruptedBalanceBackup = JSON.stringify({
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '0.0.1',
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets: [
					{
						id: 'w_corrupt_cache',
						name: 'Dompet Corrupt',
						type: 'bank',
						openingBalance: 1000000,
						balance: 999999999, // Cache saldo salah!
						color: '#0058BC',
						icon: 'account_balance',
						includeInTotal: true,
						archivedAt: null,
						createdAt: 1000,
						updatedAt: 1000,
						deletedAt: null
					}
				],
				categories: [],
				transactions: [
					{
						id: 't_valid_1',
						type: 'expense',
						amount: 250000,
						walletId: 'w_corrupt_cache',
						toWalletId: null,
						fee: 0,
						categoryId: null,
						date: '2026-10-12',
						note: null,
						tagIds: [],
						attachmentId: null,
						recurringId: null,
						createdAt: 1000,
						updatedAt: 1000,
						deletedAt: null
					}
				],
				budgets: [],
				settings: []
			}
		});

		await backupService.restoreBackupJson(corruptedBalanceBackup);

		const wallet = await db.wallets.get('w_corrupt_cache');
		// Harus dipulihkan: 1.000.000 - 250.000 = 750.000 (bukan 999999999)
		expect(wallet?.balance).toBe(750000);
	});

	it('ekspor CSV transaksi sesuai RFC 4180 dengan UTF-8 BOM dan resolusi nama', async () => {
		const now = Date.now();
		await db.wallets.add({
			id: 'w_csv_1',
			name: 'BCA Utama',
			type: 'bank',
			openingBalance: 5000000,
			balance: 4750000,
			color: '#0058BC',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		});

		await db.categories.add({
			id: 'c_parent_1',
			name: 'Kebutuhan',
			kind: 'expense',
			parentId: null,
			icon: 'category',
			color: '#0058BC',
			order: 1,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		});

		await db.categories.add({
			id: 'c_sub_1',
			name: 'Makan & Minum',
			kind: 'expense',
			parentId: 'c_parent_1',
			icon: 'restaurant',
			color: '#FF9500',
			order: 2,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		});

		await db.transactions.add({
			id: 't_csv_1',
			type: 'expense',
			amount: 75000,
			walletId: 'w_csv_1',
			toWalletId: null,
			fee: 0,
			categoryId: 'c_sub_1',
			date: '2026-10-12',
			note: 'Beli "Kopi, Teh & Snack"',
			tagIds: [],
			attachmentId: null,
			recurringId: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		});

		const csv = await backupService.exportTransactionsCsv();

		// Cek UTF-8 BOM
		expect(csv.startsWith('﻿')).toBe(true);

		// Cek Header
		expect(csv).toContain(
			'ID,Tanggal,Tipe,Nominal,Biaya Admin,Dompet Asal,Dompet Tujuan,Kategori,Kategori Induk,Catatan'
		);

		// Cek Isi baris terexport dengan benar
		expect(csv).toContain('BCA Utama');
		expect(csv).toContain('Makan & Minum');
		expect(csv).toContain('Kebutuhan');
		expect(csv).toContain('Pengeluaran');
		expect(csv).toContain('75000');
		// Cek escaping kutip ganda dan koma dalam catatan
		expect(csv).toContain('"Beli ""Kopi, Teh & Snack"""');
	});

	it('resetAllData membersihkan tabel dan men-seed ulang kategori default', async () => {
		await db.wallets.add({
			id: 'w_reset',
			name: 'Dompet Akan Dihapus',
			type: 'cash',
			openingBalance: 50000,
			balance: 50000,
			color: '#006E28',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		await backupService.resetAllData();

		expect(await db.wallets.count()).toBe(0);
		expect(await db.transactions.count()).toBe(0);

		// Kategori bawaan otomatis terisi kembali
		const categories = await db.categories.toArray();
		expect(categories.length).toBeGreaterThan(0);
	});

	it('keamanan: exportBackupJson TIDAK MEMUAT pin_security di dalam berkas cadangan', async () => {
		// Simpan pengaturan PIN aktif di database
		await db.settings.put({
			id: 'setting_pin_security',
			key: 'pin_security',
			value: {
				enabled: true,
				hashHex: 'a1b2c3d4e5f6',
				saltHex: '1234567890abcdef'
			},
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		// Simpan pengaturan non-PIN (misal salary_day)
		await db.settings.put({
			id: 'setting_salary_day',
			key: 'salary_day',
			value: 25,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		const jsonString = await backupService.exportBackupJson();
		const parsed = JSON.parse(jsonString);

		// Verifikasi pin_security sama sekali TIDAK ADA di settings data cadangan
		const exportedPinSetting = parsed.data.settings.find((s: { key: string }) => s.key === 'pin_security');
		expect(exportedPinSetting).toBeUndefined();

		// Pengaturan lain (salary_day) tetap ada
		const exportedSalarySetting = parsed.data.settings.find((s: { key: string }) => s.key === 'salary_day');
		expect(exportedSalarySetting).toBeDefined();
		expect(exportedSalarySetting.value).toBe(25);
	});

	it('keamanan: restoreBackupJson TIDAK MENIMPA status PIN aktif dan mengabaikan pin_security dari berkas', async () => {
		// Pasang PIN aktif di database
		const activePinConfig = {
			enabled: true,
			hashHex: 'hash_asli_aktif_pengguna',
			saltHex: 'salt_asli_aktif_pengguna'
		};
		await db.settings.put({
			id: 'setting_pin_security',
			key: 'pin_security',
			value: activePinConfig,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			deletedAt: null
		});

		// Siapkan berkas cadangan (yang mencoba menyusupkan pin_security lain atau tidak memilikinya)
		const backupWithMaliciousPin = JSON.stringify({
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '0.0.1',
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets: [
					{
						id: 'w_restore_pin_test',
						name: 'Dompet Pulih',
						type: 'cash',
						openingBalance: 100000,
						balance: 100000,
						color: '#0058bc',
						icon: 'wallet',
						includeInTotal: true,
						archivedAt: null,
						createdAt: 1000,
						updatedAt: 1000,
						deletedAt: null
					}
				],
				categories: [],
				transactions: [],
				budgets: [],
				settings: [
					{
						id: 'setting_palsu',
						key: 'pin_security',
						value: {
							enabled: false,
							hashHex: 'hacked_hash',
							saltHex: 'hacked_salt'
						}
					},
					{
						id: 'setting_tema',
						key: 'theme',
						value: 'dark'
					}
				]
			}
		});

		await backupService.restoreBackupJson(backupWithMaliciousPin);

		// Status PIN aktif pengguna TETAP TERJAGA dan TIDAK TERTIMPA
		const currentPinSetting = await db.settings.get('pin_security');
		expect(currentPinSetting).toBeDefined();
		expect(currentPinSetting?.value).toEqual(activePinConfig);

		// Pengaturan lain (theme) berhasil dipulihkan
		const themeSetting = await db.settings.get('theme');
		expect(themeSetting).toBeDefined();
		expect(themeSetting?.value).toBe('dark');
	});
});
