import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	DexieBudgetRepository,
	DexieCategoryRepository,
	DexieTransactionRepository,
	DexieWalletRepository
} from './repositories';
import { MoneyTrackerDatabase } from './schema';

describe('Dexie Repositories (dengan fake-indexeddb)', () => {
	let testDb: MoneyTrackerDatabase;
	let walletRepo: DexieWalletRepository;
	let txRepo: DexieTransactionRepository;
	let catRepo: DexieCategoryRepository;
	let budgetRepo: DexieBudgetRepository;

	beforeEach(() => {
		testDb = new MoneyTrackerDatabase(`RepoTestDB_${Date.now()}_${Math.random()}`);
		walletRepo = new DexieWalletRepository(testDb);
		txRepo = new DexieTransactionRepository(testDb);
		catRepo = new DexieCategoryRepository(testDb);
		budgetRepo = new DexieBudgetRepository(testDb);
	});

	describe('DexieWalletRepository', () => {
		it('dapat membuat, membaca, mengupdate, dan soft delete wallet', async () => {
			const created = await walletRepo.create({
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 50000,
				balance: 50000,
				color: '#00AED6',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null
			});

			expect(created.id).toBeDefined();
			expect(created.name).toBe('GoPay');

			const fetched = await walletRepo.getById(created.id);
			expect(fetched?.id).toBe(created.id);

			const updated = await walletRepo.update(created.id, { name: 'GoPay Utama' });
			expect(updated.name).toBe('GoPay Utama');

			await walletRepo.softDelete(created.id);
			const deleted = await walletRepo.getById(created.id);
			expect(deleted).toBeUndefined();

			const allActive = await walletRepo.getAll();
			expect(allActive).toHaveLength(0);

			const allWithDeleted = await walletRepo.getAll({ includeDeleted: true });
			expect(allWithDeleted).toHaveLength(1);
			expect(allWithDeleted[0].deletedAt).not.toBeNull();
		});
	});

	describe('DexieTransactionRepository', () => {
		it('menggunakan index date dan [walletId+date] untuk query riwayat', async () => {
			const tx1 = await txRepo.create({
				walletId: 'w_1',
				type: 'expense',
				amount: 20000,
				toWalletId: null,
				fee: 0,
				categoryId: 'cat_1',
				date: '2026-10-01',
				note: 'Kopi',
				tagIds: [],
				attachmentId: null,
				recurringId: null
			});

			const tx2 = await txRepo.create({
				walletId: 'w_1',
				type: 'expense',
				amount: 50000,
				toWalletId: null,
				fee: 0,
				categoryId: 'cat_2',
				date: '2026-10-15',
				note: 'Buku',
				tagIds: [],
				attachmentId: null,
				recurringId: null
			});

			const byRange = await txRepo.getByDateRange('2026-10-01', '2026-10-10');
			expect(byRange).toHaveLength(1);
			expect(byRange[0].id).toBe(tx1.id);

			const byWalletAndDate = await txRepo.getByWalletId('w_1', {
				startDate: '2026-10-10',
				endDate: '2026-10-20'
			});
			expect(byWalletAndDate).toHaveLength(1);
			expect(byWalletAndDate[0].id).toBe(tx2.id);
		});
	});

	describe('DexieCategoryRepository', () => {
		it('dapat membuat dan mengurutkan kategori berdasarkan field order', async () => {
			await catRepo.create({
				name: 'Transportasi',
				kind: 'expense',
				parentId: null,
				icon: 'directions_car',
				color: '#EF4444',
				order: 2
			});

			await catRepo.create({
				name: 'Makanan & Minuman',
				kind: 'expense',
				parentId: null,
				icon: 'restaurant',
				color: '#F59E0B',
				order: 1
			});

			const expenses = await catRepo.getByKind('expense');
			expect(expenses).toHaveLength(2);
			expect(expenses[0].name).toBe('Makanan & Minuman');
			expect(expenses[1].name).toBe('Transportasi');
		});
	});

	describe('DexieBudgetRepository', () => {
		it('dapat membuat, membaca per periode, dan mengupdate budget', async () => {
			const budget = await budgetRepo.create({
				categoryId: 'cat_food',
				period: '2026-10',
				limit: 1500000,
				alertAt: 80
			});

			expect(budget.id).toBeDefined();

			const found = await budgetRepo.getByCategoryAndPeriod('cat_food', '2026-10');
			expect(found?.limit).toBe(1500000);

			await budgetRepo.update(budget.id, { limit: 2000000 });
			const updated = await budgetRepo.getById(budget.id);
			expect(updated?.limit).toBe(2000000);
		});
	});
});
