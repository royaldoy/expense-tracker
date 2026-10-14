import { describe, expect, it } from 'vitest';
import {
	aggregateCategoryBreakdown,
	aggregateSummary,
	filterTransactionsByPeriod
} from '../domain/aggregation';
import { getPeriodForDate } from '../domain/period';
import { generateSeedTransactions } from '../domain/seedData';
import type { Category, Wallet } from '../domain/types';
import {
	exportAndShareReport,
	generateReportCsv,
	generateReportPdf,
	generateReportXlsx,
	prepareReportExportContent,
	type ReportExportData
} from './reportExportService';

const mockWallets: Wallet[] = [
	{
		id: 'w_bca',
		name: 'Bank BCA',
		type: 'bank',
		openingBalance: 5000000,
		balance: 5000000,
		color: '#0066AE',
		icon: 'account_balance',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'w_gopay',
		name: 'GoPay Utama',
		type: 'ewallet',
		openingBalance: 1000000,
		balance: 1000000,
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
		id: 'c_food',
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
		id: 'c_trans',
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
		id: 'c_salary',
		name: 'Gaji Pokok',
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

describe('Report Export Service (Unit Test)', () => {
	// Periode pengujian: 1 Okt 2026 - 31 Okt 2026
	const period = getPeriodForDate('2026-10-15', 1);

	// Pembangkitan data seed 150 transaksi realistis
	const seedTransactions = generateSeedTransactions({
		count: 150,
		wallets: mockWallets,
		categories: mockCategories,
		startDate: new Date('2026-08-01'),
		endDate: new Date('2026-10-31')
	});

	const exportData: ReportExportData = {
		period,
		wallets: mockWallets,
		categories: mockCategories,
		transactions: seedTransactions
	};

	it('menggunakan angka fungsi domain Fase 5 secara langsung tanpa dihitung ulang', () => {
		const prepared = prepareReportExportContent(exportData);
		const filteredTxs = filterTransactionsByPeriod(seedTransactions, period);
		const expectedSummary = aggregateSummary(filteredTxs, period);
		const expectedExpense = aggregateCategoryBreakdown(filteredTxs, mockCategories, 'expense');
		const expectedIncome = aggregateCategoryBreakdown(filteredTxs, mockCategories, 'income');

		// Verifikasi 100% identik
		expect(prepared.summary).toEqual(expectedSummary);
		expect(prepared.expenseBreakdown).toEqual(expectedExpense);
		expect(prepared.incomeBreakdown).toEqual(expectedIncome);
		expect(prepared.filteredTransactions.length).toBe(filteredTxs.length);
	});

	it('ekspor CSV: jumlah di file sama dengan jumlah fungsi domain laporan untuk data seed', () => {
		const filteredTxs = filterTransactionsByPeriod(seedTransactions, period);
		const summary = aggregateSummary(filteredTxs, period);
		const expenseBreakdown = aggregateCategoryBreakdown(filteredTxs, mockCategories, 'expense');

		const csv = generateReportCsv(exportData);

		// Harus diawali UTF-8 BOM
		expect(csv.startsWith('﻿')).toBe(true);

		// Periksa kecocokan baris metrik ringkasan
		expect(csv).toContain(`Total Pemasukan,${summary.income}`);
		expect(csv).toContain(`Total Pengeluaran,${summary.expense}`);
		expect(csv).toContain(`Arus Kas Bersih (Net),${summary.net}`);
		expect(csv).toContain(`Rasio Tabungan (%),${summary.savingsRate}`);
		expect(csv).toContain(`Rata-rata Pengeluaran / Hari,${summary.dailyAverageExpense}`);
		expect(csv).toContain(`Jumlah Transfer (kali),${summary.transferCount}`);
		expect(csv).toContain(`Volume Transfer,${summary.transferVolume}`);
		expect(csv).toContain(`Total Biaya Admin,${summary.totalFees}`);

		// Periksa kecocokan rincian kategori
		for (const item of expenseBreakdown.items) {
			expect(csv).toContain(
				`${item.name},${item.total},${item.percentage},${item.transactionCount}`
			);
		}

		// Periksa jumlah baris transaksi langsung dari seksi DAFTAR TRANSAKSI
		const parts = csv.split('=== DAFTAR TRANSAKSI ===\r\n');
		const txSection = parts[1] || '';
		const txLines = txSection
			.trim()
			.split('\r\n')
			.slice(1) // Lewati baris header: ID, Tanggal, Tipe, ...
			.filter((line) => line.trim().length > 0);

		expect(txLines.length).toBe(filteredTxs.length);
	});

	it('ekspor CSV mendukung filter dompet spesifik', () => {
		const specificWallet = mockWallets[0];
		const walletExportData: ReportExportData = {
			...exportData,
			wallet: specificWallet
		};

		const filteredWalletTxs = filterTransactionsByPeriod(
			seedTransactions,
			period,
			specificWallet.id
		);
		const walletSummary = aggregateSummary(filteredWalletTxs, period);

		const csv = generateReportCsv(walletExportData);

		expect(csv).toContain(`Filter Dompet,${specificWallet.name}`);
		expect(csv).toContain(`Total Pemasukan,${walletSummary.income}`);
		expect(csv).toContain(`Total Pengeluaran,${walletSummary.expense}`);
		expect(csv).toContain(`Arus Kas Bersih (Net),${walletSummary.net}`);
	});

	it('ekspor Excel (.xlsx) menghasilkan berkas OpenXML multi-sheet valid', async () => {
		const blob = await generateReportXlsx(exportData);

		expect(blob).toBeDefined();
		expect(blob.size).toBeGreaterThan(1000);
		expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	});

	it('ekspor PDF menghasilkan berkas binary PDF valid yang diawali %PDF-', async () => {
		const blob = await generateReportPdf(exportData);

		expect(blob).toBeDefined();
		expect(blob.size).toBeGreaterThan(1000);
		expect(blob.type).toBe('application/pdf');

		const buffer = await blob.arrayBuffer();
		const header = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 5)));
		expect(header).toBe('%PDF-');
	});

	it('exportAndShareReport mengorkestrasi ekspor dan penamaan berkas dengan benar', async () => {
		const resultCsv = await exportAndShareReport('csv', exportData);
		expect(resultCsv.format).toBe('csv');
		expect(resultCsv.filename).toMatch(/^money-tracker-laporan-20261001-20261031\.csv$/);

		const resultXlsx = await exportAndShareReport('xlsx', exportData);
		expect(resultXlsx.format).toBe('xlsx');
		expect(resultXlsx.filename).toMatch(/^money-tracker-laporan-20261001-20261031\.xlsx$/);

		const resultPdf = await exportAndShareReport('pdf', exportData);
		expect(resultPdf.format).toBe('pdf');
		expect(resultPdf.filename).toMatch(/^money-tracker-laporan-20261001-20261031\.pdf$/);
	});
});
