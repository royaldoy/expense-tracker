import { describe, expect, it } from 'vitest';
import { getPeriodForDate } from './period';
import type { Budget, Transaction } from './types';
import {
	calculateBudgetUsage,
	calculateOverallBudget,
	type BudgetUsageResult,
	type OverallBudgetSummary
} from './budget';

function createMockBudget(overrides: Partial<Budget> = {}): Budget {
	return {
		id: 'b_1',
		categoryId: 'c_food',
		period: '2026-10',
		limit: 1000000, // Rp1.000.000
		alertAt: 80, // 80%
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null,
		...overrides
	};
}

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: 't_1',
		type: 'expense',
		amount: 50000,
		walletId: 'w_1',
		toWalletId: null,
		fee: 0,
		categoryId: 'c_food',
		date: '2026-10-15',
		note: 'Makan',
		tagIds: [],
		attachmentId: null,
		recurringId: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null,
		...overrides
	};
}

describe('Domain Budget (TDD Core Pure TypeScript)', () => {
	const standardPeriod = getPeriodForDate('2026-10-15', 1); // 1 Okt 2026 - 31 Okt 2026

	describe('calculateBudgetUsage - Perhitungan Pengeluaran, Sisa & Persentase', () => {
		it('menghitung pengeluaran dan sisa dengan status aman ketika di bawah ambang alertAt', () => {
			const budget = createMockBudget({ limit: 1000000, alertAt: 80 });
			const txs: Transaction[] = [
				createMockTransaction({ amount: 500000, date: '2026-10-05' }),
				createMockTransaction({ amount: 250000, date: '2026-10-10' })
			];

			const result: BudgetUsageResult = calculateBudgetUsage(budget, txs, standardPeriod);

			// Terpakai = 750.000 (75%)
			expect(result.spent).toBe(750000);
			expect(result.remaining).toBe(250000);
			expect(result.percentage).toBe(75);
			expect(result.status).toBe('aman');
		});

		it('mengevaluasi status waspada tepat di ambang batas alertAt (persentase === alertAt)', () => {
			const budget = createMockBudget({ limit: 1000000, alertAt: 80 });
			const txs: Transaction[] = [createMockTransaction({ amount: 800000, date: '2026-10-12' })];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			// Tepat 80%
			expect(result.spent).toBe(800000);
			expect(result.remaining).toBe(200000);
			expect(result.percentage).toBe(80);
			expect(result.status).toBe('waspada');
		});

		it('mengevaluasi status waspada ketika antara alertAt dan 100%', () => {
			const budget = createMockBudget({ limit: 1000000, alertAt: 80 });
			const txs: Transaction[] = [createMockTransaction({ amount: 950000, date: '2026-10-20' })];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			expect(result.spent).toBe(950000);
			expect(result.remaining).toBe(50000);
			expect(result.percentage).toBe(95);
			expect(result.status).toBe('waspada');
		});

		it('mengevaluasi status lewat ketika pengeluaran melebihi limit (> 100%) dengan sisa negatif', () => {
			const budget = createMockBudget({ limit: 1000000, alertAt: 80 });
			const txs: Transaction[] = [createMockTransaction({ amount: 1250000, date: '2026-10-25' })];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			expect(result.spent).toBe(1250000);
			expect(result.remaining).toBe(-250000);
			expect(result.percentage).toBe(125);
			expect(result.status).toBe('lewat');
		});

		it('mengabaikan pokok transfer namun menghitung biaya admin jika kategorinya cocok', () => {
			const budget = createMockBudget({ categoryId: 'c_admin', limit: 50000, alertAt: 80 });
			const txs: Transaction[] = [
				// Transfer Rp500.000 dengan fee Rp6.500 berkategori c_admin
				createMockTransaction({
					type: 'transfer',
					amount: 500000, // Pokok transfer TIDAK boleh dihitung
					fee: 6500, // Fee transfer dihitung karena kategorinya cocok
					categoryId: 'c_admin',
					date: '2026-10-10'
				}),
				// Transfer lain tanpa fee
				createMockTransaction({
					type: 'transfer',
					amount: 200000,
					fee: 0,
					categoryId: 'c_admin',
					date: '2026-10-11'
				}),
				// Transfer dengan fee tetapi kategori berbeda
				createMockTransaction({
					type: 'transfer',
					amount: 100000,
					fee: 2500,
					categoryId: 'c_other',
					date: '2026-10-12'
				})
			];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			expect(result.spent).toBe(6500); // Hanya fee 6.500
			expect(result.remaining).toBe(43500);
			expect(result.percentage).toBe(13);
			expect(result.status).toBe('aman');
		});

		it('tidak menghitung transaksi pemasukan (income)', () => {
			const budget = createMockBudget({ categoryId: 'c_food', limit: 500000 });
			const txs: Transaction[] = [
				createMockTransaction({
					type: 'income',
					amount: 1000000,
					categoryId: 'c_food',
					date: '2026-10-10'
				}),
				createMockTransaction({
					type: 'expense',
					amount: 100000,
					categoryId: 'c_food',
					date: '2026-10-10'
				})
			];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			expect(result.spent).toBe(100000);
			expect(result.remaining).toBe(400000);
		});

		it('mengabaikan transaksi yang sudah dihapus (soft-deleted)', () => {
			const budget = createMockBudget({ limit: 500000 });
			const txs: Transaction[] = [
				createMockTransaction({ amount: 100000, deletedAt: null }),
				createMockTransaction({ amount: 200000, deletedAt: 999999 })
			];

			const result = calculateBudgetUsage(budget, txs, standardPeriod);

			expect(result.spent).toBe(100000);
		});

		it('mendukung subkategori yang berada di bawah kategori anggaran induk', () => {
			const parentBudget = createMockBudget({ categoryId: 'c_transport', limit: 600000 });
			const subcategoryIds = ['c_bensin', 'c_tol', 'c_parkir'];

			const txs: Transaction[] = [
				createMockTransaction({ categoryId: 'c_bensin', amount: 200000 }),
				createMockTransaction({ categoryId: 'c_tol', amount: 50000 }),
				createMockTransaction({ categoryId: 'c_food', amount: 75000 }) // kategori lain
			];

			const result = calculateBudgetUsage(parentBudget, txs, standardPeriod, subcategoryIds);

			expect(result.spent).toBe(250000);
			expect(result.remaining).toBe(350000);
		});
	});

	describe('Periode Lintas Tahun & Siklus Tanggal Gajian', () => {
		it('menghitung transaksi secara tepat pada siklus gajian melintasi akhir tahun (Desember ke Januari)', () => {
			// Siklus gajian tanggal 25 Des 2026 -> 24 Jan 2027
			const crossYearPeriod = getPeriodForDate('2026-12-28', 25);
			expect(crossYearPeriod.startDate.getFullYear()).toBe(2026);
			expect(crossYearPeriod.startDate.getMonth()).toBe(11); // Des
			expect(crossYearPeriod.startDate.getDate()).toBe(25);
			expect(crossYearPeriod.endDate.getFullYear()).toBe(2027);
			expect(crossYearPeriod.endDate.getMonth()).toBe(0); // Jan
			expect(crossYearPeriod.endDate.getDate()).toBe(24);

			const budget = createMockBudget({
				period: '2026-12',
				limit: 2000000,
				alertAt: 80
			});

			const txs: Transaction[] = [
				// Di luar periode (sebelum 25 Des 2026) -> Diabaikan
				createMockTransaction({ amount: 100000, date: '2026-12-24' }),
				// Tepat awal periode -> Dihitung
				createMockTransaction({ amount: 400000, date: '2026-12-25' }),
				// Akhir tahun 2026 -> Dihitung
				createMockTransaction({ amount: 600000, date: '2026-12-31' }),
				// Awal tahun baru 2027 -> Dihitung
				createMockTransaction({ amount: 500000, date: '2027-01-01' }),
				// Tepat batas akhir periode (24 Jan 2027) -> Dihitung
				createMockTransaction({ amount: 300000, date: '2027-01-24' }),
				// Di luar periode (gajian berikutnya 25 Jan 2027) -> Diabaikan
				createMockTransaction({ amount: 900000, date: '2027-01-25' })
			];

			const result = calculateBudgetUsage(budget, txs, crossYearPeriod);

			// Total = 400.000 + 600.000 + 500.000 + 300.000 = 1.800.000 (90%)
			expect(result.spent).toBe(1800000);
			expect(result.remaining).toBe(200000);
			expect(result.percentage).toBe(90);
			expect(result.status).toBe('waspada');
		});
	});

	describe('calculateOverallBudget - Ringkasan Dashboard & Global', () => {
		it('menghitung total limit, total terpakai, dan status agregat untuk dashboard', () => {
			const b1 = createMockBudget({ id: 'b1', categoryId: 'c1', limit: 1000000, alertAt: 80 });
			const b2 = createMockBudget({ id: 'b2', categoryId: 'c2', limit: 500000, alertAt: 80 });
			const budgets = [b1, b2];

			const txs: Transaction[] = [
				createMockTransaction({ categoryId: 'c1', amount: 700000, date: '2026-10-10' }),
				createMockTransaction({ categoryId: 'c2', amount: 450000, date: '2026-10-11' }),
				createMockTransaction({ categoryId: 'c3', amount: 100000, date: '2026-10-12' }) // Tidak ada budget
			];

			const summary: OverallBudgetSummary = calculateOverallBudget(budgets, txs, standardPeriod);

			// Total limit = 1.000.000 + 500.000 = 1.500.000
			expect(summary.totalLimit).toBe(1500000);
			// Total terpakai dari anggaran yang dipantau = 700.000 + 450.000 = 1.150.000
			expect(summary.totalSpent).toBe(1150000);
			// Sisa alokasi = 1.500.000 - 1.150.000 = 350.000
			expect(summary.totalRemaining).toBe(350000);
			// Persentase = 1.150.000 / 1.500.000 = ~77%
			expect(summary.percentage).toBe(77);
			expect(summary.status).toBe('aman');
			expect(summary.budgetCount).toBe(2);
		});

		it('mengembalikan status lewat jika total pengeluaran melampaui total limit agregat', () => {
			const b1 = createMockBudget({ id: 'b1', categoryId: 'c1', limit: 500000 });
			const budgets = [b1];
			const txs: Transaction[] = [createMockTransaction({ categoryId: 'c1', amount: 600000 })];

			const summary = calculateOverallBudget(budgets, txs, standardPeriod);

			expect(summary.totalSpent).toBe(600000);
			expect(summary.totalRemaining).toBe(-100000);
			expect(summary.percentage).toBe(120);
			expect(summary.status).toBe('lewat');
		});

		it('menangani daftar anggaran kosong tanpa error atau division by zero', () => {
			const summary = calculateOverallBudget([], [], standardPeriod);

			expect(summary.totalLimit).toBe(0);
			expect(summary.totalSpent).toBe(0);
			expect(summary.totalRemaining).toBe(0);
			expect(summary.percentage).toBe(0);
			expect(summary.status).toBe('aman');
			expect(summary.budgetCount).toBe(0);
		});
	});
});
