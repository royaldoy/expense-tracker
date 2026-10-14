/**
 * Domain Aggregation - Pure TypeScript Financial Analysis Functions
 * DILARANG import svelte, dexie, atau capacitor.
 */

import { addDays, differenceInCalendarDays, eachDayOfInterval, format, subDays } from 'date-fns';
import { getPeriodForDate, isDateInPeriod, type Period } from './period';
import type { Category, Transaction, ULID, Wallet } from './types';

export interface ReportFilterOptions {
	period: Period;
	walletId?: ULID;
}

export interface CashflowReportSummary {
	income: number;
	expense: number;
	net: number;
	transferCount: number;
	transferVolume: number;
	totalFees: number;
	savingsRate: number; // Persentase 0 - 100
	dailyAverageExpense: number; // Integer Rupiah
}

export interface CategoryBreakdownItem {
	categoryId: ULID | 'uncategorized';
	name: string;
	color: string;
	icon: string;
	total: number;
	percentage: number; // 0 - 100
	transactionCount: number;
}

export interface CategoryBreakdownReport {
	type: 'expense' | 'income';
	totalAmount: number;
	items: CategoryBreakdownItem[];
}

export interface WalletBreakdownItem {
	walletId: ULID;
	name: string;
	color: string;
	icon: string;
	income: number;
	expense: number;
	transferIn: number;
	transferOut: number;
	netChange: number;
	transactionCount: number;
}

export interface DailyCashflowPoint {
	date: string; // YYYY-MM-DD
	income: number;
	expense: number;
	net: number;
	cumulativeNet: number;
}

export interface TrendDelta {
	current: number;
	previous: number;
	deltaAmount: number;
	deltaPercentage: number;
}

export interface TrendComparisonReport {
	currentPeriod: Period;
	previousPeriod: Period;
	incomeDelta: TrendDelta;
	expenseDelta: TrendDelta;
	netDelta: TrendDelta;
	dailySeries: DailyCashflowPoint[];
}

/**
 * Filter transaksi yang masih aktif (deletedAt === null) dalam rentang periode.
 * Jika walletId diberikan, hanya menyertakan transaksi yang terkait dompet tersebut.
 */
export function filterTransactionsByPeriod(
	transactions: Transaction[],
	period: Period,
	walletId?: ULID
): Transaction[] {
	return transactions.filter((tx) => {
		if (tx.deletedAt !== null) return false;
		if (!isDateInPeriod(tx.date, period)) return false;

		if (walletId) {
			const isOrigin = tx.walletId === walletId;
			const isDestination = tx.type === 'transfer' && tx.toWalletId === walletId;
			return isOrigin || isDestination;
		}

		return true;
	});
}

/**
 * Agregasi ringkasan arus kas periode (Income, Expense, Net, Fee, dsb).
 * Aturan data uang:
 * - Pokok transfer tidak masuk income maupun expense.
 * - Fee transfer dihitung sebagai expense dan totalFees.
 */
export function aggregateSummary(
	transactions: Transaction[],
	period: Period
): CashflowReportSummary {
	let income = 0;
	let expense = 0;
	let transferCount = 0;
	let transferVolume = 0;
	let totalFees = 0;

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;

		if (tx.type === 'income') {
			income += tx.amount;
		} else if (tx.type === 'expense') {
			expense += tx.amount;
		} else if (tx.type === 'transfer') {
			transferCount += 1;
			transferVolume += tx.amount;
			const fee = tx.fee ?? 0;
			if (fee > 0) {
				expense += fee;
				totalFees += fee;
			}
		}
	}

	const net = income - expense;

	// Rasio tabungan: (net / income) * 100 saat income > 0
	let savingsRate = 0;
	if (income > 0) {
		savingsRate = Math.max(0, Math.round(((income - expense) / income) * 10000) / 100);
	}

	// Jumlah hari dalam periode inklusif
	const daysCount = Math.max(1, differenceInCalendarDays(period.endDate, period.startDate) + 1);
	const dailyAverageExpense = Math.round(expense / daysCount);

	return {
		income,
		expense,
		net,
		transferCount,
		transferVolume,
		totalFees,
		savingsRate,
		dailyAverageExpense
	};
}

/**
 * Agregasi pengeluaran atau pemasukan per kategori.
 * Transfer dikecualikan.
 */
export function aggregateCategoryBreakdown(
	transactions: Transaction[],
	categories: Category[],
	kind: 'expense' | 'income' = 'expense'
): CategoryBreakdownReport {
	const categoryMap = new Map<string, Category>();
	for (const cat of categories) {
		categoryMap.set(cat.id, cat);
	}

	const groupTotals = new Map<
		string,
		{ total: number; count: number; name: string; color: string; icon: string }
	>();

	let totalAmount = 0;

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;
		if (tx.type !== kind) continue;

		totalAmount += tx.amount;
		const catId = tx.categoryId ?? 'uncategorized';

		let entry = groupTotals.get(catId);
		if (!entry) {
			const meta = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
			entry = {
				total: 0,
				count: 0,
				name: meta?.name ?? (catId === 'uncategorized' ? 'Tanpa Kategori' : 'Lainnya'),
				color: meta?.color ?? '#94A3B8',
				icon: meta?.icon ?? 'category'
			};
			groupTotals.set(catId, entry);
		}

		entry.total += tx.amount;
		entry.count += 1;
	}

	const items: CategoryBreakdownItem[] = [];
	for (const [catId, data] of groupTotals.entries()) {
		const percentage = totalAmount > 0 ? Math.round((data.total / totalAmount) * 1000) / 10 : 0;
		items.push({
			categoryId: catId,
			name: data.name,
			color: data.color,
			icon: data.icon,
			total: data.total,
			percentage,
			transactionCount: data.count
		});
	}

	// Urutkan terbesar ke terkecil
	items.sort((a, b) => b.total - a.total);

	return {
		type: kind,
		totalAmount,
		items
	};
}

/**
 * Agregasi per dompet (Income, Expense, Transfer Masuk, Transfer Keluar, Net Change).
 */
export function aggregateWalletBreakdown(
	transactions: Transaction[],
	wallets: Wallet[]
): WalletBreakdownItem[] {
	const result = new Map<
		string,
		{
			wallet: Wallet;
			income: number;
			expense: number;
			transferIn: number;
			transferOut: number;
			count: number;
		}
	>();

	for (const w of wallets) {
		result.set(w.id, {
			wallet: w,
			income: 0,
			expense: 0,
			transferIn: 0,
			transferOut: 0,
			count: 0
		});
	}

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;

		const origin = result.get(tx.walletId);
		if (origin) {
			origin.count += 1;
			if (tx.type === 'income') {
				origin.income += tx.amount;
			} else if (tx.type === 'expense') {
				origin.expense += tx.amount;
			} else if (tx.type === 'transfer') {
				origin.transferOut += tx.amount;
				if ((tx.fee ?? 0) > 0) {
					origin.expense += tx.fee;
				}
			}
		}

		if (tx.type === 'transfer' && tx.toWalletId) {
			const dest = result.get(tx.toWalletId);
			if (dest) {
				dest.transferIn += tx.amount;
				dest.count += 1;
			}
		}
	}

	const items: WalletBreakdownItem[] = [];
	for (const entry of result.values()) {
		const netChange = entry.income - entry.expense - entry.transferOut + entry.transferIn;
		items.push({
			walletId: entry.wallet.id,
			name: entry.wallet.name,
			color: entry.wallet.color,
			icon: entry.wallet.icon,
			income: entry.income,
			expense: entry.expense,
			transferIn: entry.transferIn,
			transferOut: entry.transferOut,
			netChange,
			transactionCount: entry.count
		});
	}

	return items;
}

/**
 * Deret harian sepanjang periode (setiap hari terwakili, tanpa tanggal bolong).
 */
export function generateDailyCashflowSeries(
	transactions: Transaction[],
	period: Period
): DailyCashflowPoint[] {
	const days = eachDayOfInterval({
		start: period.startDate,
		end: period.endDate
	});

	// Petakan agregat per tanggal (YYYY-MM-DD)
	const dailyMap = new Map<string, { income: number; expense: number }>();
	for (const d of days) {
		const key = format(d, 'yyyy-MM-dd');
		dailyMap.set(key, { income: 0, expense: 0 });
	}

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;
		const dateKey = tx.date.slice(0, 10);
		const dayEntry = dailyMap.get(dateKey);
		if (!dayEntry) continue;

		if (tx.type === 'income') {
			dayEntry.income += tx.amount;
		} else if (tx.type === 'expense') {
			dayEntry.expense += tx.amount;
		} else if (tx.type === 'transfer') {
			const fee = tx.fee ?? 0;
			if (fee > 0) {
				dayEntry.expense += fee;
			}
		}
	}

	const series: DailyCashflowPoint[] = [];
	let cumulativeNet = 0;

	for (const d of days) {
		const dateKey = format(d, 'yyyy-MM-dd');
		const { income, expense } = dailyMap.get(dateKey)!;
		const net = income - expense;
		cumulativeNet += net;

		series.push({
			date: dateKey,
			income,
			expense,
			net,
			cumulativeNet
		});
	}

	return series;
}

/**
 * Hitung selisih metrik dan persentase perubahan periode sebelumnya.
 */
export function calculateTrendDelta(current: number, previous: number): TrendDelta {
	const deltaAmount = current - previous;
	const deltaPercentage =
		previous === 0 ? 0 : Math.round((deltaAmount / Math.abs(previous)) * 10000) / 100;

	return {
		current,
		previous,
		deltaAmount,
		deltaPercentage
	};
}

/**
 * Menghitung periode sebelumnya dengan startDay yang sama.
 */
export function getPreviousPeriod(period: Period): Period {
	const prevRefDate = subDays(period.startDate, 1);
	return getPeriodForDate(prevRefDate, period.startDay);
}

/**
 * Menghitung periode berikutnya dengan startDay yang sama.
 */
export function getNextPeriod(period: Period): Period {
	const nextRefDate = addDays(period.endDate, 1);
	return getPeriodForDate(nextRefDate, period.startDay);
}
