import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySqliteDriver } from '../../sqlite/connection';
import {
	SqliteBudgetRepository,
	SqliteCategoryRepository,
	SqliteSettingRepository,
	SqliteTransactionRepository,
	SqliteWalletRepository
} from './index';

describe('SQLite Repositories (IWallet, ICategory, ITransaction, IBudget, ISetting)', () => {
	let driver: InMemorySqliteDriver;
	let walletRepo: SqliteWalletRepository;
	let categoryRepo: SqliteCategoryRepository;
	let txRepo: SqliteTransactionRepository;
	let budgetRepo: SqliteBudgetRepository;
	let settingRepo: SqliteSettingRepository;

	beforeEach(() => {
		driver = new InMemorySqliteDriver();
		walletRepo = new SqliteWalletRepository(driver);
		categoryRepo = new SqliteCategoryRepository(driver);
		txRepo = new SqliteTransactionRepository(driver);
		budgetRepo = new SqliteBudgetRepository(driver);
		settingRepo = new SqliteSettingRepository(driver);
	});

	describe('SqliteWalletRepository', () => {
		it('dapat membuat dompet, mengambil berdasarkan ID dan tipe', async () => {
			const created = await walletRepo.create({
				name: 'BCA Utama',
				type: 'bank',
				openingBalance: 1000000,
				balance: 1000000,
				color: '#0058BC',
				icon: 'account_balance',
				includeInTotal: true,
				archivedAt: null
			});

			expect(created.id).toBeDefined();
			expect(created.name).toBe('BCA Utama');

			const fetched = await walletRepo.getById(created.id);
			expect(fetched).toBeDefined();
			expect(fetched?.balance).toBe(1000000);

			const bankWallets = await walletRepo.getByType('bank');
			expect(bankWallets).toHaveLength(1);
			expect(bankWallets[0].id).toBe(created.id);
		});

		it('dapat memperbarui dan melakukan soft-delete dompet', async () => {
			const created = await walletRepo.create({
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 50000,
				balance: 50000,
				color: '#0070EB',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null
			});

			const updated = await walletRepo.update(created.id, { name: 'GoPay Baru', balance: 75000 });
			expect(updated.name).toBe('GoPay Baru');
			expect(updated.balance).toBe(75000);

			await walletRepo.softDelete(created.id);
			const allActive = await walletRepo.getAll();
			expect(allActive).toHaveLength(0);

			const allWithDeleted = await walletRepo.getAll({ includeDeleted: true });
			expect(allWithDeleted).toHaveLength(1);
			expect(allWithDeleted[0].deletedAt).not.toBeNull();
		});
	});

	describe('SqliteCategoryRepository', () => {
		it('dapat membuat kategori dan memfilter berdasarkan kind', async () => {
			const cat = await categoryRepo.create({
				name: 'Makanan',
				kind: 'expense',
				parentId: null,
				icon: 'restaurant',
				color: '#FF9500',
				order: 1
			});

			expect(cat.id).toBeDefined();
			expect(cat.name).toBe('Makanan');

			const expenses = await categoryRepo.getByKind('expense');
			expect(expenses).toHaveLength(1);

			const incomes = await categoryRepo.getByKind('income');
			expect(incomes).toHaveLength(0);
		});
	});

	describe('SqliteTransactionRepository', () => {
		it('dapat membuat transaksi dan mengambil dengan filter', async () => {
			const tx = await txRepo.create({
				type: 'expense',
				amount: 35000,
				walletId: 'w_test_1',
				toWalletId: null,
				fee: 0,
				categoryId: 'c_test_1',
				date: '2026-10-13',
				note: 'Kopi Kenangan',
				tagIds: ['ngopi'],
				attachmentId: null,
				recurringId: null
			});

			expect(tx.id).toBeDefined();
			expect(tx.amount).toBe(35000);
			expect(tx.tagIds).toEqual(['ngopi']);

			const byWallet = await txRepo.getByWalletId('w_test_1');
			expect(byWallet).toHaveLength(1);

			const byDate = await txRepo.getByDateRange('2026-10-01', '2026-10-31');
			expect(byDate).toHaveLength(1);

			const byCat = await txRepo.getByCategory('c_test_1');
			expect(byCat).toHaveLength(1);
		});
	});

	describe('SqliteBudgetRepository', () => {
		it('dapat membuat anggaran dan mengambil berdasarkan period', async () => {
			const budget = await budgetRepo.create({
				categoryId: 'c_test_1',
				period: '2026-10',
				limit: 1500000,
				alertAt: 80
			});

			expect(budget.id).toBeDefined();
			expect(budget.limit).toBe(1500000);

			const byPeriod = await budgetRepo.getByPeriod('2026-10');
			expect(byPeriod).toHaveLength(1);

			const byCatPeriod = await budgetRepo.getByCategoryAndPeriod('c_test_1', '2026-10');
			expect(byCatPeriod).toBeDefined();
			expect(byCatPeriod?.id).toBe(budget.id);
		});
	});

	describe('SqliteSettingRepository', () => {
		it('dapat menyimpan, membaca dan menghapus key-value pengaturan', async () => {
			await settingRepo.set('salary_date', 25);
			const val = await settingRepo.get<number>('salary_date');
			expect(val).toBe(25);

			await settingRepo.set('nested_config', { dark: true, ratio: 1.5 });
			const nested = await settingRepo.get<{ dark: boolean; ratio: number }>('nested_config');
			expect(nested).toEqual({ dark: true, ratio: 1.5 });

			await settingRepo.delete('salary_date');
			const deletedVal = await settingRepo.get('salary_date');
			expect(deletedVal).toBeNull();
		});
	});
});
