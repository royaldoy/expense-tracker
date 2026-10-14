/**
 * Report Export Service
 * Menyediakan layanan ekspor laporan keuangan ke format CSV, Excel (.xlsx), dan PDF.
 * Pustaka eksternal (write-excel-file, jspdf, jspdf-autotable) di-lazy-load saat eksekusi.
 * Angka diambil langsung dari fungsi domain laporan Fase 5 di aggregation.ts.
 */

import { format } from 'date-fns';
import {
	aggregateCategoryBreakdown,
	aggregateSummary,
	filterTransactionsByPeriod,
	type CashflowReportSummary,
	type CategoryBreakdownReport
} from '../domain/aggregation';
import { formatRupiah } from '../domain/money';
import { formatPeriod, type Period } from '../domain/period';
import type { Category, Transaction, Wallet } from '../domain/types';
import { platform } from '../platform';
import { escapeCsvCell } from './backupService';

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportExportData {
	period: Period;
	wallet?: Wallet; // undefined berarti Semua Dompet
	wallets: Wallet[];
	categories: Category[];
	transactions: Transaction[];
}

export interface PreparedExportContent {
	period: Period;
	periodLabel: string;
	walletName: string;
	exportTimestamp: string;
	summary: CashflowReportSummary;
	expenseBreakdown: CategoryBreakdownReport;
	incomeBreakdown: CategoryBreakdownReport;
	filteredTransactions: Transaction[];
	walletMap: Map<string, string>;
	categoryMap: Map<string, Category>;
}

/**
 * Mempersiapkan data laporan dengan mengekstraksi metrik langsung dari fungsi domain murni Fase 5.
 */
export function prepareReportExportContent(data: ReportExportData): PreparedExportContent {
	const filteredTransactions = filterTransactionsByPeriod(
		data.transactions,
		data.period,
		data.wallet?.id
	);

	// Urutkan transaksi terfilter: date DESC, createdAt DESC
	filteredTransactions.sort((a, b) => {
		const dateCmp = b.date.localeCompare(a.date);
		if (dateCmp !== 0) return dateCmp;
		return b.createdAt - a.createdAt;
	});

	const summary = aggregateSummary(filteredTransactions, data.period);
	const expenseBreakdown = aggregateCategoryBreakdown(
		filteredTransactions,
		data.categories,
		'expense'
	);
	const incomeBreakdown = aggregateCategoryBreakdown(
		filteredTransactions,
		data.categories,
		'income'
	);

	const walletMap = new Map<string, string>();
	for (const w of data.wallets) {
		walletMap.set(w.id, w.name);
	}

	const categoryMap = new Map<string, Category>();
	for (const c of data.categories) {
		categoryMap.set(c.id, c);
	}

	return {
		period: data.period,
		periodLabel: formatPeriod(data.period),
		walletName: data.wallet ? data.wallet.name : 'Semua Dompet',
		exportTimestamp: format(new Date(), 'dd MMM yyyy HH:mm'),
		summary,
		expenseBreakdown,
		incomeBreakdown,
		filteredTransactions,
		walletMap,
		categoryMap
	};
}

/**
 * 1. Generator CSV RFC 4180 dengan UTF-8 BOM
 */
export function generateReportCsv(data: ReportExportData): string {
	const content = prepareReportExportContent(data);
	const rows: string[] = [];

	// Awalan UTF-8 BOM agar Excel dapat membuka karakter UTF-8 dengan baik
	const pushRow = (...cells: unknown[]) => {
		rows.push(cells.map(escapeCsvCell).join(','));
	};

	// Metadata Laporan
	pushRow('=== LAPORAN KEUANGAN MONEY TRACKER ===');
	pushRow('Periode', content.periodLabel);
	pushRow('Filter Dompet', content.walletName);
	pushRow('Tanggal Ekspor', content.exportTimestamp);
	pushRow('');

	// Seksi 1: Ringkasan Arus Kas
	pushRow('=== RINGKASAN ARUS KAS ===');
	pushRow('Metrik', 'Nilai');
	pushRow('Total Pemasukan', content.summary.income);
	pushRow('Total Pengeluaran', content.summary.expense);
	pushRow('Arus Kas Bersih (Net)', content.summary.net);
	pushRow('Rasio Tabungan (%)', content.summary.savingsRate);
	pushRow('Rata-rata Pengeluaran / Hari', content.summary.dailyAverageExpense);
	pushRow('Jumlah Transfer (kali)', content.summary.transferCount);
	pushRow('Volume Transfer', content.summary.transferVolume);
	pushRow('Total Biaya Admin', content.summary.totalFees);
	pushRow('');

	// Seksi 2: Rincian Pengeluaran per Kategori
	pushRow('=== RINCIAN PENGELUARAN PER KATEGORI ===');
	pushRow('Kategori', 'Total Pengeluaran', 'Porsi (%)', 'Jumlah Transaksi');
	if (content.expenseBreakdown.items.length === 0) {
		pushRow('Tidak ada pengeluaran pada periode ini', 0, 0, 0);
	} else {
		for (const item of content.expenseBreakdown.items) {
			pushRow(item.name, item.total, item.percentage, item.transactionCount);
		}
	}
	pushRow('');

	// Seksi 3: Rincian Pemasukan per Kategori
	pushRow('=== RINCIAN PEMASUKAN PER KATEGORI ===');
	pushRow('Kategori', 'Total Pemasukan', 'Porsi (%)', 'Jumlah Transaksi');
	if (content.incomeBreakdown.items.length === 0) {
		pushRow('Tidak ada pemasukan pada periode ini', 0, 0, 0);
	} else {
		for (const item of content.incomeBreakdown.items) {
			pushRow(item.name, item.total, item.percentage, item.transactionCount);
		}
	}
	pushRow('');

	// Seksi 4: Riwayat Transaksi
	pushRow('=== DAFTAR TRANSAKSI ===');
	pushRow(
		'ID',
		'Tanggal',
		'Tipe',
		'Dompet Asal',
		'Dompet Tujuan',
		'Kategori',
		'Catatan',
		'Nominal',
		'Biaya Admin'
	);

	for (const tx of content.filteredTransactions) {
		const typeLabel =
			tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
		const fromWallet = content.walletMap.get(tx.walletId) ?? tx.walletId;
		const toWallet = tx.toWalletId ? (content.walletMap.get(tx.toWalletId) ?? tx.toWalletId) : '';
		const catName = tx.categoryId
			? (content.categoryMap.get(tx.categoryId)?.name ?? tx.categoryId)
			: '-';
		const note = tx.note ?? '-';

		pushRow(tx.id, tx.date, typeLabel, fromWallet, toWallet, catName, note, tx.amount, tx.fee ?? 0);
	}

	return '﻿' + rows.join('\r\n');
}

/**
 * 2. Generator Excel (.xlsx) Multi-Sheet via write-excel-file (Lazy-Loaded)
 */
export async function generateReportXlsx(data: ReportExportData): Promise<Blob> {
	// Lazy load write-excel-file
	const { default: writeXlsxFile } = await import('write-excel-file/universal');
	const content = prepareReportExportContent(data);

	// Tipe Cell write-excel-file
	type ExcelCell = {
		value?: string | number | boolean | Date;
		type?: typeof String | typeof Number | typeof Boolean | typeof Date;
		fontWeight?: 'bold';
		format?: string;
		align?: 'left' | 'center' | 'right';
		color?: string;
		backgroundColor?: string;
	};

	// --- SHEET 1: RINGKASAN ---
	const sheet1Data: ExcelCell[][] = [
		[{ value: 'LAPORAN KEUANGAN MONEY TRACKER', fontWeight: 'bold' }],
		[{ value: `Periode: ${content.periodLabel}` }],
		[{ value: `Filter Dompet: ${content.walletName}` }],
		[{ value: `Tanggal Ekspor: ${content.exportTimestamp}` }],
		[],
		[
			{ value: 'Metrik Arus Kas', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Nilai (Rupiah)', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' }
		],
		[
			{ value: 'Total Pemasukan' },
			{ value: content.summary.income, type: Number, format: '#,##0', align: 'right' }
		],
		[
			{ value: 'Total Pengeluaran' },
			{ value: content.summary.expense, type: Number, format: '#,##0', align: 'right' }
		],
		[
			{ value: 'Arus Kas Bersih (Net)', fontWeight: 'bold' },
			{
				value: content.summary.net,
				type: Number,
				format: '#,##0',
				fontWeight: 'bold',
				align: 'right'
			}
		],
		[
			{ value: 'Rasio Tabungan (%)' },
			{ value: content.summary.savingsRate, type: Number, align: 'right' }
		],
		[
			{ value: 'Rata-rata Pengeluaran / Hari' },
			{ value: content.summary.dailyAverageExpense, type: Number, format: '#,##0', align: 'right' }
		],
		[
			{ value: 'Jumlah Transfer (kali)' },
			{ value: content.summary.transferCount, type: Number, align: 'right' }
		],
		[
			{ value: 'Volume Transfer' },
			{ value: content.summary.transferVolume, type: Number, format: '#,##0', align: 'right' }
		],
		[
			{ value: 'Total Biaya Admin' },
			{ value: content.summary.totalFees, type: Number, format: '#,##0', align: 'right' }
		]
	];

	// --- SHEET 2: KATEGORI ---
	const sheet2Data: ExcelCell[][] = [
		[{ value: 'RINCIAN PENGELUARAN PER KATEGORI', fontWeight: 'bold' }],
		[
			{ value: 'Kategori', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{
				value: 'Total Pengeluaran',
				fontWeight: 'bold',
				backgroundColor: '#E2E8F0',
				align: 'right'
			},
			{ value: 'Porsi (%)', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' },
			{ value: 'Jumlah Transaksi', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' }
		]
	];

	if (content.expenseBreakdown.items.length === 0) {
		sheet2Data.push([{ value: 'Tidak ada pengeluaran' }, { value: 0 }, { value: 0 }, { value: 0 }]);
	} else {
		for (const item of content.expenseBreakdown.items) {
			sheet2Data.push([
				{ value: item.name },
				{ value: item.total, type: Number, format: '#,##0', align: 'right' },
				{ value: item.percentage, type: Number, align: 'right' },
				{ value: item.transactionCount, type: Number, align: 'right' }
			]);
		}
	}

	sheet2Data.push([]);
	sheet2Data.push([{ value: 'RINCIAN PEMASUKAN PER KATEGORI', fontWeight: 'bold' }]);
	sheet2Data.push([
		{ value: 'Kategori', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
		{ value: 'Total Pemasukan', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' },
		{ value: 'Porsi (%)', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' },
		{ value: 'Jumlah Transaksi', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' }
	]);

	if (content.incomeBreakdown.items.length === 0) {
		sheet2Data.push([{ value: 'Tidak ada pemasukan' }, { value: 0 }, { value: 0 }, { value: 0 }]);
	} else {
		for (const item of content.incomeBreakdown.items) {
			sheet2Data.push([
				{ value: item.name },
				{ value: item.total, type: Number, format: '#,##0', align: 'right' },
				{ value: item.percentage, type: Number, align: 'right' },
				{ value: item.transactionCount, type: Number, align: 'right' }
			]);
		}
	}

	// --- SHEET 3: TRANSAKSI ---
	const sheet3Data: ExcelCell[][] = [
		[{ value: 'DAFTAR TRANSAKSI PERIODE', fontWeight: 'bold' }],
		[
			{ value: 'Tanggal', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Tipe', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Dompet Asal', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Dompet Tujuan', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Kategori', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Catatan', fontWeight: 'bold', backgroundColor: '#E2E8F0' },
			{ value: 'Nominal', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' },
			{ value: 'Biaya Admin', fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'right' }
		]
	];

	for (const tx of content.filteredTransactions) {
		const typeLabel =
			tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
		const fromWallet = content.walletMap.get(tx.walletId) ?? tx.walletId;
		const toWallet = tx.toWalletId ? (content.walletMap.get(tx.toWalletId) ?? tx.toWalletId) : '';
		const catName = tx.categoryId
			? (content.categoryMap.get(tx.categoryId)?.name ?? tx.categoryId)
			: '-';
		const note = tx.note ?? '-';

		sheet3Data.push([
			{ value: tx.date },
			{ value: typeLabel },
			{ value: fromWallet },
			{ value: toWallet },
			{ value: catName },
			{ value: note },
			{ value: tx.amount, type: Number, format: '#,##0', align: 'right' },
			{ value: tx.fee ?? 0, type: Number, format: '#,##0', align: 'right' }
		]);
	}

	const sheets = [
		{ name: 'Ringkasan', data: sheet1Data },
		{ name: 'Kategori', data: sheet2Data },
		{ name: 'Transaksi', data: sheet3Data }
	];

	const output = await writeXlsxFile(sheets);
	return await output.toBlob();
}

/**
 * 3. Generator PDF via jspdf & jspdf-autotable (Lazy-Loaded)
 */
export async function generateReportPdf(data: ReportExportData): Promise<Blob> {
	// Lazy load jspdf dan jspdf-autotable
	const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
	const autoTable = autoTableMod.default || autoTableMod;

	const content = prepareReportExportContent(data);
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	// Warna Tema
	const primaryColor = [79, 70, 229]; // Indigo #4F46E5
	const textColor = [30, 41, 59]; // Slate #1E293B
	const secondaryColor = [100, 116, 139]; // Slate #64748B

	// Header Laporan
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
	doc.text('Money Tracker - Laporan Keuangan', 14, 18);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
	doc.text(
		`Periode: ${content.periodLabel}   |   Dompet: ${content.walletName}   |   Dicetak: ${content.exportTimestamp}`,
		14,
		24
	);

	// Garis Pemisah Tipis
	doc.setDrawColor(226, 232, 240);
	doc.setLineWidth(0.4);
	doc.line(14, 27, 196, 27);

	let currentY = 32;

	// Seksi 1: Tabel Ringkasan Arus Kas
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(textColor[0], textColor[1], textColor[2]);
	doc.text('Ringkasan Arus Kas Periode', 14, currentY);

	autoTable(doc, {
		startY: currentY + 3,
		margin: { left: 14, right: 14 },
		head: [['Metrik Finansial', 'Nilai (Rupiah)', 'Metrik Lainnya', 'Keterangan']],
		body: [
			[
				'Total Pemasukan',
				formatRupiah(content.summary.income),
				'Rasio Tabungan',
				`${content.summary.savingsRate}%`
			],
			[
				'Total Pengeluaran',
				formatRupiah(content.summary.expense),
				'Rata-rata Pengeluaran / Hari',
				formatRupiah(content.summary.dailyAverageExpense)
			],
			[
				'Arus Kas Bersih (Net)',
				(content.summary.net >= 0 ? '+' : '') + formatRupiah(content.summary.net),
				'Aktivitas Transfer',
				`${content.summary.transferCount} kali (${formatRupiah(content.summary.transferVolume)})`
			],
			['Biaya Admin Transfer', formatRupiah(content.summary.totalFees), '-', '-']
		],
		theme: 'striped',
		headStyles: {
			fillColor: [79, 70, 229],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		bodyStyles: {
			fontSize: 8,
			textColor: [30, 41, 59]
		},
		styles: { cellPadding: 2 }
	});

	// Ambil koordinat Y setelah tabel pertama
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	currentY = (doc as any).lastAutoTable.finalY + 8;

	// Seksi 2: Rincian Pengeluaran per Kategori
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.text('Rincian Pengeluaran per Kategori', 14, currentY);

	const categoryRows = content.expenseBreakdown.items.map((item, idx) => [
		String(idx + 1),
		item.name,
		formatRupiah(item.total),
		`${item.percentage}%`,
		`${item.transactionCount} transaksi`
	]);

	if (categoryRows.length === 0) {
		categoryRows.push(['-', 'Tidak ada pengeluaran pada periode ini', 'Rp0', '0%', '0 transaksi']);
	}

	autoTable(doc, {
		startY: currentY + 3,
		margin: { left: 14, right: 14 },
		head: [['No', 'Kategori', 'Total Nominal', 'Porsi', 'Jumlah']],
		body: categoryRows,
		theme: 'striped',
		headStyles: {
			fillColor: [59, 130, 246], // Biru
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		bodyStyles: {
			fontSize: 8,
			textColor: [30, 41, 59]
		},
		styles: { cellPadding: 2 }
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	currentY = (doc as any).lastAutoTable.finalY + 8;

	// Seksi 3: Daftar Riwayat Transaksi Terpilih
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.text(`Daftar Transaksi Terpilih (${content.filteredTransactions.length})`, 14, currentY);

	const txRows = content.filteredTransactions.map((tx) => {
		const typeLabel =
			tx.type === 'income' ? 'Masuk' : tx.type === 'expense' ? 'Keluar' : 'Transfer';
		const walletInfo = content.walletMap.get(tx.walletId) ?? tx.walletId;
		const catName = tx.categoryId
			? (content.categoryMap.get(tx.categoryId)?.name ?? tx.categoryId)
			: '-';
		const note = tx.note || '-';
		const amountFormatted =
			(tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '') + formatRupiah(tx.amount);

		return [tx.date, typeLabel, walletInfo, catName, note, amountFormatted];
	});

	if (txRows.length === 0) {
		txRows.push(['-', '-', '-', '-', 'Belum ada transaksi', 'Rp0']);
	}

	autoTable(doc, {
		startY: currentY + 3,
		margin: { left: 14, right: 14 },
		head: [['Tanggal', 'Tipe', 'Dompet', 'Kategori', 'Catatan', 'Nominal']],
		body: txRows,
		theme: 'striped',
		headStyles: {
			fillColor: [71, 85, 105], // Slate
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		bodyStyles: {
			fontSize: 7.5,
			textColor: [30, 41, 59]
		},
		styles: { cellPadding: 2 }
	});

	// Nomor Halaman di Footer
	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(148, 163, 184);
		doc.text(`Money Tracker - Halaman ${i} dari ${totalPages}`, 196, 290, { align: 'right' });
	}

	return doc.output('blob');
}

/**
 * Helper konversi Uint8Array/ArrayBuffer ke base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = '';
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export interface ExportReportResult {
	filename: string;
	format: ReportExportFormat;
	shared: boolean;
}

/**
 * 4. Fungsi Orkestrasi Ekspor dan Berbagi via Platform (@capacitor/share / download)
 */
export async function exportAndShareReport(
	formatType: ReportExportFormat,
	data: ReportExportData
): Promise<ExportReportResult> {
	const periodSlug = `${format(data.period.startDate, 'yyyyMMdd')}-${format(data.period.endDate, 'yyyyMMdd')}`;
	const filename = `money-tracker-laporan-${periodSlug}.${formatType}`;

	if (platform.isNative) {
		// --- NATIVE ANDROID CAPACITOR ---
		let dataToWrite: string;
		let encoding: 'utf8' | 'base64';

		if (formatType === 'csv') {
			dataToWrite = generateReportCsv(data);
			encoding = 'utf8';
		} else if (formatType === 'xlsx') {
			const blob = await generateReportXlsx(data);
			const buffer = await blob.arrayBuffer();
			dataToWrite = uint8ArrayToBase64(new Uint8Array(buffer));
			encoding = 'base64';
		} else {
			const blob = await generateReportPdf(data);
			const buffer = await blob.arrayBuffer();
			dataToWrite = uint8ArrayToBase64(new Uint8Array(buffer));
			encoding = 'base64';
		}

		// Tulis ke direktori cache perangkat
		const writeRes = await platform.filesystem.writeFile({
			path: filename,
			data: dataToWrite,
			directory: 'cache',
			encoding
		});

		// Bagikan via @capacitor/share
		await platform.share.share({
			title: 'Laporan Keuangan Money Tracker',
			dialogTitle: 'Bagikan Laporan Keuangan',
			files: [writeRes.uri]
		});

		return { filename, format: formatType, shared: true };
	}

	// --- WEB BROWSER FALLBACK ---
	let blob: Blob;
	let mimeType: string;

	if (formatType === 'csv') {
		const csvText = generateReportCsv(data);
		mimeType = 'text/csv;charset=utf-8;';
		blob = new Blob([csvText], { type: mimeType });
	} else if (formatType === 'xlsx') {
		mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		blob = await generateReportXlsx(data);
	} else {
		mimeType = 'application/pdf';
		blob = await generateReportPdf(data);
	}

	// Cek apakah Web Share API mendukung berbagi berkas
	if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && navigator.share) {
		try {
			const file = new File([blob], filename, { type: mimeType });
			if (navigator.canShare && navigator.canShare({ files: [file] })) {
				await navigator.share({
					title: 'Laporan Keuangan Money Tracker',
					files: [file]
				});
				return { filename, format: formatType, shared: true };
			}
		} catch (e) {
			if ((e as Error).name === 'AbortError') {
				return { filename, format: formatType, shared: false };
			}
			// Abaikan dan lanjutkan ke fallback unduh
		}
	}

	// Fallback pemicu download di browser
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		setTimeout(() => URL.revokeObjectURL(url), 2000);
	}

	return { filename, format: formatType, shared: true };
}
