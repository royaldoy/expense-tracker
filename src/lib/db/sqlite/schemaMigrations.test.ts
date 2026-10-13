import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySqliteDriver } from './connection';
import { runSqliteMigrations, SQLITE_LATEST_VERSION } from './schemaMigrations';

describe('SQLite Versioned DDL Schema Migrations', () => {
	let driver: InMemorySqliteDriver;

	beforeEach(() => {
		driver = new InMemorySqliteDriver();
	});

	it('menginisialisasi basis data kosong langsung ke versi terbaru dan mencatat riwayat versi', async () => {
		const version = await runSqliteMigrations(driver);
		expect(version).toBe(SQLITE_LATEST_VERSION);

		const versions = await driver.query<{ version: number; applied_at: number }>(
			'SELECT version FROM schema_version ORDER BY version ASC'
		);
		expect(versions).toHaveLength(4);
		expect(versions.map((v) => Number(v.version))).toEqual([1, 2, 3, 4]);
	});

	it('memigrasikan basis data SQLite dari skema Fase 1 ke skema terbaru tanpa kehilangan data', async () => {
		// 1. Simulasikan basis data SQLite yang berada pada skema Fase 1 (versi 1)
		await driver.execute(`
			CREATE TABLE IF NOT EXISTS schema_version (
				version INTEGER PRIMARY KEY,
				applied_at INTEGER NOT NULL
			);
		`);
		await driver.execute(
			'INSERT INTO schema_version (version, applied_at) VALUES (?, ?);',
			[1, 1700000000000]
		);

		// 2. Isi data Fase 1 (wallets, categories, transactions, settings)
		await driver.execute(
			'INSERT INTO wallets (id, name, type, openingBalance, balance, color, icon, includeInTotal, archivedAt, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
			[
				'w_phase1_1',
				'BCA Tabungan',
				'bank',
				5000000,
				4850000,
				'#0058bc',
				'account_balance',
				1,
				null,
				1700000000000,
				1700000000000,
				null
			]
		);

		await driver.execute(
			'INSERT INTO categories (id, name, kind, parentId, icon, color, display_order, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
			[
				'c_phase1_1',
				'Makan & Minum',
				'expense',
				null,
				'restaurant',
				'#ff9500',
				1,
				1700000000000,
				1700000000000,
				null
			]
		);

		await driver.execute(
			'INSERT INTO transactions (id, type, amount, walletId, toWalletId, fee, categoryId, date, note, tagIds, attachmentId, recurringId, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
			[
				't_phase1_1',
				'expense',
				150000,
				'w_phase1_1',
				null,
				0,
				'c_phase1_1',
				'2026-10-10',
				'Makan malam bersama keluarga',
				'[]',
				null,
				null,
				1700000000000,
				1700000000000,
				null
			]
		);

		await driver.execute(
			'INSERT INTO settings (id, key, value, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?);',
			['s_phase1_1', 'salary_day', '25', 1700000000000, 1700000000000, null]
		);

		// 3. Jalankan migrasi inkremental ke versi terbaru
		const latestVersion = await runSqliteMigrations(driver);
		expect(latestVersion).toBe(SQLITE_LATEST_VERSION);

		// 4. Verifikasi seluruh data Fase 1 tetap utuh 100% tanpa ada data yang hilang
		const wallets = await driver.query<{ id: string; name: string; balance: number }>(
			'SELECT id, name, balance FROM wallets WHERE id = ?;',
			['w_phase1_1']
		);
		expect(wallets).toHaveLength(1);
		expect(wallets[0].name).toBe('BCA Tabungan');
		expect(wallets[0].balance).toBe(4850000);

		const categories = await driver.query<{ id: string; name: string }>(
			'SELECT id, name FROM categories WHERE id = ?;',
			['c_phase1_1']
		);
		expect(categories).toHaveLength(1);
		expect(categories[0].name).toBe('Makan & Minum');

		const transactions = await driver.query<{ id: string; amount: number; note: string }>(
			'SELECT id, amount, note FROM transactions WHERE id = ?;',
			['t_phase1_1']
		);
		expect(transactions).toHaveLength(1);
		expect(transactions[0].amount).toBe(150000);
		expect(transactions[0].note).toBe('Makan malam bersama keluarga');

		const settings = await driver.query<{ key: string; value: string }>(
			'SELECT key, value FROM settings WHERE key = ?;',
			['salary_day']
		);
		expect(settings).toHaveLength(1);
		expect(settings[0].value).toBe('25');

		// 5. Verifikasi tabel-tabel baru hasil migrasi (budgets, recurring_rules, notifications) dapat diisi
		await driver.execute(
			'INSERT INTO budgets (id, categoryId, period, limit_amount, alertAt, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
			['b_new_1', 'c_phase1_1', '2026-10', 2000000, 80, Date.now(), Date.now(), null]
		);
		const budgets = await driver.query<{ id: string; limit_amount: number }>(
			'SELECT id, limit_amount FROM budgets WHERE id = ?;',
			['b_new_1']
		);
		expect(budgets).toHaveLength(1);
		expect(budgets[0].limit_amount).toBe(2000000);

		await driver.execute(
			'INSERT INTO notifications (id, type, title, message, readAt, refId, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
			[
				'n_new_1',
				'budget_alert',
				'Peringatan',
				'Anggaran menipis',
				null,
				'b_new_1',
				Date.now(),
				Date.now(),
				null
			]
		);
		const notifs = await driver.query<{ id: string; title: string }>(
			'SELECT id, title FROM notifications WHERE id = ?;',
			['n_new_1']
		);
		expect(notifs).toHaveLength(1);
		expect(notifs[0].title).toBe('Peringatan');

		// 6. Verifikasi migrasi berulang bersifat idempoten
		const repeatVersion = await runSqliteMigrations(driver);
		expect(repeatVersion).toBe(SQLITE_LATEST_VERSION);
	});
});
