/**
 * Domain Budget - Logika Penganggaran Finansial per Kategori (Pure TypeScript)
 * DILARANG import svelte, dexie, atau capacitor.
 * Aturan data uang: Integer Rupiah murni, tanpa floating point.
 */

import { isDateInPeriod, type Period } from './period';
import type { Budget, Transaction } from './types';

export type BudgetStatus = 'aman' | 'waspada' | 'lewat';

export interface BudgetUsageResult {
	budget: Budget;
	spent: number; // Integer Rupiah
	remaining: number; // limit - spent (dapat bernilai negatif jika over-budget)
	percentage: number; // Integer persentase 0 s/d >100
	status: BudgetStatus;
}

export interface OverallBudgetSummary {
	totalLimit: number;
	totalSpent: number;
	totalRemaining: number;
	percentage: number;
	status: BudgetStatus;
	budgetCount: number;
}

/**
 * Menghitung realisasi penggunaan anggaran untuk satu entitas Budget dalam suatu periode.
 * Aturan finansial:
 * - Pokok transfer tidak dihitung ("Transfer tidak dihitung").
 * - Biaya admin transfer dihitung bila kategorinya cocok ("biaya admin dihitung bila kategorinya cocok").
 * - Pemasukan (income) tidak mengurangi penggunaan anggaran pengeluaran.
 * - Transaksi soft-deleted (deletedAt !== null) diabaikan.
 */
export function calculateBudgetUsage(
	budget: Budget,
	transactions: Transaction[],
	period: Period,
	subcategoryIds?: string[]
): BudgetUsageResult {
	const limit = Math.round(budget.limit);
	const alertAt = Math.round(budget.alertAt);
	let spent = 0;

	// Himpunan ID kategori yang cocok (kategori utama + subkategori bila ada)
	const matchedCategoryIds = new Set<string>();
	if (budget.categoryId) {
		matchedCategoryIds.add(budget.categoryId);
		if (subcategoryIds && subcategoryIds.length > 0) {
			for (const subId of subcategoryIds) {
				matchedCategoryIds.add(subId);
			}
		}
	}

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;
		if (!isDateInPeriod(tx.date, period)) continue;

		if (tx.type === 'expense') {
			if (budget.categoryId === null) {
				// Anggaran global / semua kategori
				spent += tx.amount;
			} else if (tx.categoryId && matchedCategoryIds.has(tx.categoryId)) {
				// Anggaran kategori spesifik
				spent += tx.amount;
			}
		} else if (tx.type === 'transfer') {
			// Pokok transfer tidak dihitung.
			// Biaya admin transfer (fee) dihitung bila kategorinya cocok.
			const fee = tx.fee ?? 0;
			if (fee > 0) {
				if (budget.categoryId === null) {
					spent += fee;
				} else if (tx.categoryId && matchedCategoryIds.has(tx.categoryId)) {
					spent += fee;
				}
			}
		}
	}

	spent = Math.round(spent);
	const remaining = limit - spent;
	const percentage = limit > 0 ? Math.round((spent / limit) * 100) : spent > 0 ? 100 : 0;

	let status: BudgetStatus = 'aman';
	if (spent > limit) {
		status = 'lewat';
	} else if (percentage >= alertAt) {
		status = 'waspada';
	}

	return {
		budget,
		spent,
		remaining,
		percentage,
		status
	};
}

/**
 * Menghitung ringkasan anggaran keseluruhan (agregat) untuk Dashboard dan Header Halaman Anggaran.
 * Menggunakan logika murni yang identik sehingga tidak terjadi perbedaan perhitungan di komponen.
 */
export function calculateOverallBudget(
	budgets: Budget[],
	transactions: Transaction[],
	period: Period,
	categoryHierarchy?: Map<string, string[]>
): OverallBudgetSummary {
	const activeBudgets = budgets.filter((b) => b.deletedAt === null);

	if (activeBudgets.length === 0) {
		return {
			totalLimit: 0,
			totalSpent: 0,
			totalRemaining: 0,
			percentage: 0,
			status: 'aman',
			budgetCount: 0
		};
	}

	let totalLimit = 0;
	let totalSpent = 0;

	for (const budget of activeBudgets) {
		totalLimit += Math.round(budget.limit);
		const subIds = budget.categoryId ? categoryHierarchy?.get(budget.categoryId) : undefined;
		const usage = calculateBudgetUsage(budget, transactions, period, subIds);
		totalSpent += usage.spent;
	}

	const totalRemaining = totalLimit - totalSpent;
	const percentage =
		totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : totalSpent > 0 ? 100 : 0;

	let status: BudgetStatus = 'aman';
	if (totalSpent > totalLimit) {
		status = 'lewat';
	} else if (percentage >= 80) {
		status = 'waspada';
	}

	return {
		totalLimit,
		totalSpent,
		totalRemaining,
		percentage,
		status,
		budgetCount: activeBudgets.length
	};
}
