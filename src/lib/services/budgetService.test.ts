import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	DexieBudgetRepository,
	DexieCategoryRepository,
	DexieTransactionRepository,
	DexieSettingRepository
} from '../db/repositories';
import { MoneyTrackerDatabase } from '../db/schema';
import { SettingService } from './settingService';
import { BudgetService } from './budgetService';

describe('BudgetService Unit Tests (Dexie & Services)', () => {
	let testDb: MoneyTrackerDatabase;
	let budgetRepo: DexieBudgetRepository;
	let txRepo: DexieTransactionRepository;
	let catRepo: DexieCategoryRepository;
	let settingRepo: DexieSettingRepository;
	let settingSvc: SettingService;
	let budgetSvc: BudgetService;

	beforeEach(() => {
		testDb = new MoneyTrackerDatabase(`BudgetServiceTest_${Date.now()}_${Math.random()}`);
		budgetRepo = new DexieBudgetRepository(testDb);
		txRepo = new DexieTransactionRepository(testDb);
		catRepo = new DexieCategoryRepository(testDb);
		settingRepo = new DexieSettingRepository(testDb);
		settingSvc = new SettingService(settingRepo);
		budgetSvc = new BudgetService(budgetRepo, txRepo, catRepo, settingSvc);
	});

	it('dapat membuat anggaran baru dan melakukan upsert ketika kategori & periode sama', async () => {
		const created = await budgetSvc.setBudget({
			categoryId: 'c_makanan',
			period: '2026-10',
			limit: 1000000,
			alertAt: 80
		});

		expect(created.id).toBeDefined();
		expect(created.limit).toBe(1000000);
		expect(created.alertAt).toBe(80);

		// Panggil lagi dengan limit baru untuk periode yang sama (upsert)
		const updated = await budgetSvc.setBudget({
			categoryId: 'c_makanan',
			period: '2026-10',
			limit: 1200000,
			alertAt: 85
		});

		expect(updated.id).toBe(created.id);
		expect(updated.limit).toBe(1200000);
		expect(updated.alertAt).toBe(85);

		const all = await budgetSvc.getBudgets('2026-10');
		expect(all).toHaveLength(1);
	});

	it('menolak input tidak valid lewat validasi Valibot', async () => {
		await expect(
			budgetSvc.setBudget({
				categoryId: 'c_test',
				period: '2026-10',
				limit: 0, // Limit harus > 0
				alertAt: 80
			})
		).rejects.toThrow();

		await expect(
			budgetSvc.setBudget({
				categoryId: 'c_test',
				period: '2026-10',
				limit: 100000,
				alertAt: 150 // Ambang batas maksimal 100%
			})
		).rejects.toThrow();
	});

	it('dapat melakukan soft delete anggaran', async () => {
		const b = await budgetSvc.setBudget({
			categoryId: 'c_del',
			period: '2026-10',
			limit: 500000,
			alertAt: 80
		});

		await budgetSvc.deleteBudget(b.id);

		const found = await budgetSvc.getBudgetById(b.id);
		expect(found).toBeUndefined();

		const activeList = await budgetSvc.getBudgets('2026-10');
		expect(activeList.find((item) => item.id === b.id)).toBeUndefined();
	});

	it('menghasilkan laporan anggaran lengkap dengan detail kategori dan agregat overall', async () => {
		// 1. Buat kategori
		const cat = await catRepo.create({
			name: 'Makanan & Minuman',
			kind: 'expense',
			parentId: null,
			icon: 'restaurant',
			color: '#bc000a',
			order: 1
		});

		// 2. Set budget
		await budgetSvc.setBudget({
			categoryId: cat.id,
			period: '2026-10',
			limit: 1000000,
			alertAt: 80
		});

		// 3. Catat transaksi pengeluaran
		await txRepo.create({
			walletId: 'w_test',
			toWalletId: null,
			fee: 0,
			attachmentId: null,
			recurringId: null,
			type: 'expense',
			amount: 850000,
			categoryId: cat.id,
			date: '2026-10-15',
			note: 'Belanja bulanan',
			tagIds: []
		});

		// 4. Minta laporan
		const report = await budgetSvc.getBudgetReport(undefined, '2026-10');

		expect(report.items).toHaveLength(1);
		expect(report.items[0].category?.name).toBe('Makanan & Minuman');
		expect(report.items[0].spent).toBe(850000);
		expect(report.items[0].percentage).toBe(85);
		expect(report.items[0].status).toBe('waspada');

		expect(report.overall.totalLimit).toBe(1000000);
		expect(report.overall.totalSpent).toBe(850000);
		expect(report.overall.percentage).toBe(85);
		expect(report.overall.status).toBe('waspada');
	});
});
