import { describe, expect, it } from 'vitest';
import type { Category, Transaction, Wallet } from './types';
import { getPeriodForDate } from './period';
import {
	aggregateCategoryBreakdown,
	aggregateSummary,
	aggregateWalletBreakdown,
	calculateTrendDelta,
	filterTransactionsByPeriod,
	generateDailyCashflowSeries,
	getNextPeriod,
	getPreviousPeriod
} from './aggregation';

const mockWallets: Wallet[] = [
	{
		id: 'w1',
		name: 'Bank BCA',
		type: 'bank',
		openingBalance: 1000000,
		balance: 1000000,
		color: '#0066AE',
		icon: 'account_balance',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'w2',
		name: 'GoPay',
		type: 'ewallet',
		openingBalance: 500000,
		balance: 500000,
		color: '#00AED6',
		icon: 'wallet',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	}
];

const mockCategories: Category[] = [
	{
		id: 'c1',
		name: 'Makanan & Minuman',
		kind: 'expense',
		parentId: null,
		icon: 'restaurant',
		color: '#F97316',
		order: 1,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'c2',
		name: 'Transportasi',
		kind: 'expense',
		parentId: null,
		icon: 'directions_car',
		color: '#3B82F6',
		order: 2,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'c3',
		name: 'Gaji',
		kind: 'income',
		parentId: null,
		icon: 'payments',
		color: '#10B981',
		order: 3,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	}
];

describe('Domain Aggregation (Pure TypeScript)', () => {
	const period = getPeriodForDate('2026-10-15', 1); // 1 Okt 2026 - 31 Okt 2026

	describe('filterTransactionsByPeriod', () => {
		it('menyaring transaksi berdasarkan rentang tanggal dan mengecualikan soft-delete', () => {
			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'expense',
					amount: 50000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-05',
					note: 'Makan',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't2',
					type: 'expense',
					amount: 25000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-09-30', // Di luar periode
					note: 'Kemarin',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't3',
					type: 'expense',
					amount: 30000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-10',
					note: 'Dihapus',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: 1200 // Soft-deleted
				}
			];

			const filtered = filterTransactionsByPeriod(txs, period);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('t1');
		});

		it('menyaring per dompet spesifik baik sebagai dompet asal maupun dompet tujuan transfer', () => {
			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'expense',
					amount: 50000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-05',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't2',
					type: 'transfer',
					amount: 100000,
					walletId: 'w1',
					toWalletId: 'w2',
					fee: 2500,
					categoryId: null,
					date: '2026-10-06',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			// w2 harus menyertakan transfer t2 karena toWalletId === 'w2'
			const filteredW2 = filterTransactionsByPeriod(txs, period, 'w2');
			expect(filteredW2).toHaveLength(1);
			expect(filteredW2[0].id).toBe('t2');
		});
	});

	describe('aggregateSummary', () => {
		it('menghitung income, expense, net, dan mengecualikan pokok transfer dari income/expense', () => {
			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'income',
					amount: 5000000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c3',
					date: '2026-10-01',
					note: 'Gaji',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't2',
					type: 'expense',
					amount: 1500000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-05',
					note: 'Makan',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				// Transfer Rp500.000 dengan fee Rp2.500: pokok tidak masuk income/expense, fee masuk expense
				{
					id: 't3',
					type: 'transfer',
					amount: 500000,
					walletId: 'w1',
					toWalletId: 'w2',
					fee: 2500,
					categoryId: null,
					date: '2026-10-06',
					note: 'Topup',
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			const summary = aggregateSummary(txs, period);
			expect(summary.income).toBe(5000000);
			// expense = 1.500.000 + 2.500 fee = 1.502.500
			expect(summary.expense).toBe(1502500);
			expect(summary.net).toBe(5000000 - 1502500);
			expect(summary.transferCount).toBe(1);
			expect(summary.transferVolume).toBe(500000);
			expect(summary.totalFees).toBe(2500);

			// Savings rate: ((5.000.000 - 1.502.500) / 5.000.000) * 100 = 69.95%
			expect(summary.savingsRate).toBeCloseTo(69.95, 1);
			// Daily average expense: 1.502.500 / 31 hari = ~48.468
			expect(summary.dailyAverageExpense).toBe(Math.round(1502500 / 31));
		});

		it('menangani periode tanpa transaksi secara aman tanpa NaN', () => {
			const summary = aggregateSummary([], period);
			expect(summary.income).toBe(0);
			expect(summary.expense).toBe(0);
			expect(summary.net).toBe(0);
			expect(summary.savingsRate).toBe(0);
			expect(summary.dailyAverageExpense).toBe(0);
		});
	});

	describe('aggregateCategoryBreakdown', () => {
		it('mengelompokkan pengeluaran per kategori secara descending dengan persentase tepat', () => {
			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'expense',
					amount: 600000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1', // Makanan
					date: '2026-10-02',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't2',
					type: 'expense',
					amount: 400000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c2', // Transport
					date: '2026-10-03',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				// Transfer diabaikan dalam breakdown kategori
				{
					id: 't3',
					type: 'transfer',
					amount: 200000,
					walletId: 'w1',
					toWalletId: 'w2',
					fee: 0,
					categoryId: null,
					date: '2026-10-04',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			const report = aggregateCategoryBreakdown(txs, mockCategories, 'expense');
			expect(report.totalAmount).toBe(1000000);
			expect(report.items).toHaveLength(2);

			expect(report.items[0].name).toBe('Makanan & Minuman');
			expect(report.items[0].total).toBe(600000);
			expect(report.items[0].percentage).toBe(60);

			expect(report.items[1].name).toBe('Transportasi');
			expect(report.items[1].total).toBe(400000);
			expect(report.items[1].percentage).toBe(40);
		});

		it('mengalokasikan transaksi tanpa kategori ke uncategorized', () => {
			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'expense',
					amount: 100000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: null,
					date: '2026-10-02',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			const report = aggregateCategoryBreakdown(txs, mockCategories, 'expense');
			expect(report.items).toHaveLength(1);
			expect(report.items[0].categoryId).toBe('uncategorized');
			expect(report.items[0].percentage).toBe(100);
		});
	});

	describe('aggregateWalletBreakdown', () => {
		it('menghitung mutasi tiap dompet dan memastikan transfer bersifat zero-sum di luar fee', () => {
			const txs: Transaction[] = [
				// w1 dapat income 1.000.000
				{
					id: 't1',
					type: 'income',
					amount: 1000000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c3',
					date: '2026-10-01',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				// w1 bayar expense 200.000
				{
					id: 't2',
					type: 'expense',
					amount: 200000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-02',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				// Transfer w1 -> w2 sebesar 300.000 dengan fee 2.500
				{
					id: 't3',
					type: 'transfer',
					amount: 300000,
					walletId: 'w1',
					toWalletId: 'w2',
					fee: 2500,
					categoryId: null,
					date: '2026-10-03',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			const breakdown = aggregateWalletBreakdown(txs, mockWallets);
			const w1 = breakdown.find((b) => b.walletId === 'w1')!;
			const w2 = breakdown.find((b) => b.walletId === 'w2')!;

			// w1: income 1.000.000, expense 200.000 + 2.500 (fee) = 202.500, transferOut 300.000
			// netChange = 1.000.000 - 202.500 - 300.000 = 497.500
			expect(w1.income).toBe(1000000);
			expect(w1.expense).toBe(202500);
			expect(w1.transferOut).toBe(300000);
			expect(w1.transferIn).toBe(0);
			expect(w1.netChange).toBe(497500);

			// w2: transferIn 300.000
			// netChange = +300.000
			expect(w2.transferIn).toBe(300000);
			expect(w2.netChange).toBe(300000);

			// Zero-sum check lintas seluruh dompet:
			// total netChange (497.500 + 300.000 = 797.500)
			// Net arus kas total = income (1.000.000) - expense (202.500) = 797.500!
			const totalNetChange = breakdown.reduce((sum, b) => sum + b.netChange, 0);
			expect(totalNetChange).toBe(797500);
		});
	});

	describe('generateDailyCashflowSeries', () => {
		it('menghasilkan deret setiap hari tanpa tanggal bolong beserta kumulatif berjalan', () => {
			const shortPeriod = {
				startDate: new Date(2026, 9, 1), // 1 Okt 2026
				endDate: new Date(2026, 9, 3, 23, 59, 59, 999), // 3 Okt 2026
				startDay: 1
			};

			const txs: Transaction[] = [
				{
					id: 't1',
					type: 'income',
					amount: 100000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c3',
					date: '2026-10-01',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				},
				{
					id: 't2',
					type: 'expense',
					amount: 40000,
					walletId: 'w1',
					toWalletId: null,
					fee: 0,
					categoryId: 'c1',
					date: '2026-10-03',
					note: null,
					tagIds: [],
					attachmentId: null,
					recurringId: null,
					createdAt: 1000,
					updatedAt: 1000,
					deletedAt: null
				}
			];

			const series = generateDailyCashflowSeries(txs, shortPeriod);
			expect(series).toHaveLength(3); // 1, 2, 3 Okt 2026

			expect(series[0].date).toBe('2026-10-01');
			expect(series[0].income).toBe(100000);
			expect(series[0].expense).toBe(0);
			expect(series[0].net).toBe(100000);
			expect(series[0].cumulativeNet).toBe(100000);

			// Tanggal 2 Okt tidak ada transaksi, nilai harus 0 dan kumulatif tetap
			expect(series[1].date).toBe('2026-10-02');
			expect(series[1].income).toBe(0);
			expect(series[1].expense).toBe(0);
			expect(series[1].net).toBe(0);
			expect(series[1].cumulativeNet).toBe(100000);

			// Tanggal 3 Okt: expense 40.000, cumulativeNet = 100.000 - 40.000 = 60.000
			expect(series[2].date).toBe('2026-10-03');
			expect(series[2].expense).toBe(40000);
			expect(series[2].net).toBe(-40000);
			expect(series[2].cumulativeNet).toBe(60000);
		});
	});

	describe('calculateTrendDelta', () => {
		it('menghitung selisih nominal dan persentase perubahan', () => {
			const deltaIncrease = calculateTrendDelta(120000, 100000);
			expect(deltaIncrease.deltaAmount).toBe(20000);
			expect(deltaIncrease.deltaPercentage).toBe(20);

			const deltaDecrease = calculateTrendDelta(80000, 100000);
			expect(deltaDecrease.deltaAmount).toBe(-20000);
			expect(deltaDecrease.deltaPercentage).toBe(-20);

			const deltaZeroPrev = calculateTrendDelta(50000, 0);
			expect(deltaZeroPrev.deltaAmount).toBe(50000);
			expect(deltaZeroPrev.deltaPercentage).toBe(0);
		});
	});

	describe('getPreviousPeriod & getNextPeriod', () => {
		it('menggeser siklus gajian mundur dan maju dengan konsisten pada startDay yang sama', () => {
			const paydayPeriod = getPeriodForDate('2026-10-26', 25); // 25 Okt 2026 - 24 Nov 2026
			expect(paydayPeriod.startDay).toBe(25);

			const prevPeriod = getPreviousPeriod(paydayPeriod);
			expect(prevPeriod.startDay).toBe(25);
			// Prev period harus 25 Sep 2026 - 24 Okt 2026
			expect(prevPeriod.startDate.getFullYear()).toBe(2026);
			expect(prevPeriod.startDate.getMonth()).toBe(8); // September (0-indexed)
			expect(prevPeriod.startDate.getDate()).toBe(25);

			const nextPeriod = getNextPeriod(paydayPeriod);
			expect(nextPeriod.startDay).toBe(25);
			// Next period harus 25 Nov 2026 - 24 Des 2026
			expect(nextPeriod.startDate.getFullYear()).toBe(2026);
			expect(nextPeriod.startDate.getMonth()).toBe(10); // November (0-indexed)
			expect(nextPeriod.startDate.getDate()).toBe(25);
		});
	});
});
