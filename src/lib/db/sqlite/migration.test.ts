import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySqliteDriver } from './connection';
import { migrateBackupJsonToSqlite } from './migration';

describe('migrateBackupJsonToSqlite', () => {
	let driver: InMemorySqliteDriver;

	beforeEach(() => {
		driver = new InMemorySqliteDriver();
	});

	it('mengimpor data cadangan JSON valid ke SQLite dan menghitung saldo dompet', async () => {
		const validBackup = {
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '1.0.0',
				exportedAt: '2026-10-13T00:00:00.000Z'
			},
			data: {
				wallets: [
					{
						id: 'w_test_1',
						name: 'BCA Utama',
						type: 'bank',
						openingBalance: 100000,
						balance: 0, // cache awal sembarang, akan dihitung ulang
						color: '#0058BC',
						icon: 'account_balance',
						includeInTotal: true,
						archivedAt: null,
						createdAt: 1700000000000,
						updatedAt: 1700000000000,
						deletedAt: null
					}
				],
				categories: [
					{
						id: 'c_test_1',
						name: 'Makanan',
						kind: 'expense',
						parentId: null,
						icon: 'restaurant',
						color: '#FF9500',
						order: 1,
						createdAt: 1700000000000,
						updatedAt: 1700000000000,
						deletedAt: null
					}
				],
				transactions: [
					{
						id: 't_test_1',
						type: 'expense',
						amount: 25000,
						walletId: 'w_test_1',
						toWalletId: null,
						fee: 0,
						categoryId: 'c_test_1',
						date: '2026-10-13',
						note: 'Makan siang',
						tagIds: ['lunch'],
						attachmentId: null,
						recurringId: null,
						createdAt: 1700000000000,
						updatedAt: 1700000000000,
						deletedAt: null
					}
				],
				budgets: [],
				settings: [
					{
						id: 's_test_1',
						key: 'salary_date',
						value: 25,
						createdAt: 1700000000000,
						updatedAt: 1700000000000,
						deletedAt: null
					}
				]
			}
		};

		const result = await migrateBackupJsonToSqlite(JSON.stringify(validBackup), driver);

		expect(result.success).toBe(true);
		expect(result.counts.wallets).toBe(1);
		expect(result.counts.categories).toBe(1);
		expect(result.counts.transactions).toBe(1);
		expect(result.counts.settings).toBe(1);

		// Periksa saldo dihitung: openingBalance (100.000) - expense (25.000) = 75.000
		const wallets = await driver.query<{ id: string; balance: number }>(
			'SELECT id, balance FROM wallets WHERE id = ?;',
			['w_test_1']
		);
		expect(wallets[0].balance).toBe(75000);
	});

	it('menolak file JSON yang rusak secara sintaks', async () => {
		await expect(migrateBackupJsonToSqlite('{ rusak json ...', driver)).rejects.toThrow(
			/File cadangan rusak/
		);
	});

	it('menolak data yang melanggar integritas relasional (walletId tidak ditemukan)', async () => {
		const invalidRefBackup = {
			meta: {
				version: 1,
				appName: 'Money Tracker',
				appVersion: '1.0.0',
				exportedAt: '2026-10-13T00:00:00.000Z'
			},
			data: {
				wallets: [],
				categories: [],
				transactions: [
					{
						id: 't_test_orphan',
						type: 'expense',
						amount: 10000,
						walletId: 'w_nonexistent',
						toWalletId: null,
						fee: 0,
						categoryId: null,
						date: '2026-10-13',
						note: 'Anomali',
						tagIds: [],
						attachmentId: null,
						recurringId: null,
						createdAt: 1700000000000,
						updatedAt: 1700000000000,
						deletedAt: null
					}
				],
				budgets: [],
				settings: []
			}
		};

		await expect(
			migrateBackupJsonToSqlite(JSON.stringify(invalidRefBackup), driver)
		).rejects.toThrow(/Integritas data tidak terpenuhi/);
	});
});
