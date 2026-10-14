/**
 * Script Seeding 1.000 Transaksi Acak & Benchmark Performa
 * Eksekusi: pnpm seed
 */

import 'fake-indexeddb/auto';
import {
	categoryRepository,
	transactionRepository,
	walletRepository
} from '../src/lib/db/repositories';
import { db } from '../src/lib/db/schema';
import {
	aggregateCategoryBreakdown,
	aggregateSummary,
	aggregateWalletBreakdown,
	generateDailyCashflowSeries
} from '../src/lib/domain/aggregation';
import { calculateWalletBalances } from '../src/lib/domain/balance';
import { formatRupiah } from '../src/lib/domain/money';
import { getPeriodForDate } from '../src/lib/domain/period';
import { seedService } from '../src/lib/services/seedService';

async function runSeed() {
	console.log('🚀 Memulai proses seeding 1.000 transaksi acak...');

	const result = await seedService.seedTransactions(1000);
	console.log(`✅ Berhasil menulis ${result.count} transaksi dalam ${result.elapsedMs}ms!`);

	// Ambil data untuk benchmark kalkulasi domain
	const wallets = await walletRepository.getAll();
	const categories = await categoryRepository.getAll();
	const transactions = await transactionRepository.getAllActive();

	console.log(
		`📊 Basis data aktif: ${wallets.length} dompet, ${categories.length} kategori, ${transactions.length} transaksi`
	);

	// Verifikasi integritas saldo
	const balances = calculateWalletBalances(wallets, transactions);
	console.log('\n💼 Ringkasan Saldo Dompet:');
	for (const w of wallets) {
		const verifiedBalance = balances.get(w.id) ?? w.openingBalance;
		console.log(
			`   - ${w.name}: ${formatRupiah(w.balance)} (Integritas OK: ${w.balance === verifiedBalance})`
		);
	}

	// Benchmark kalkulasi agregasi
	console.log('\n⏱️ Menjalankan benchmark agregasi laporan (Target <50ms)...');
	const period = getPeriodForDate(new Date(), 25);

	const startBench = performance.now();
	const summary = aggregateSummary(transactions, period);
	const catSummary = aggregateCategoryBreakdown(transactions, categories, 'expense');
	const walletBreakdown = aggregateWalletBreakdown(transactions, wallets);
	const dailySeries = generateDailyCashflowSeries(transactions, period);
	const totalBenchMs = performance.now() - startBench;

	console.log(`📈 Hasil Agregasi Periode (${period.startDay}th cycle):`);
	console.log(`   - Pemasukan: ${formatRupiah(summary.income)}`);
	console.log(`   - Pengeluaran: ${formatRupiah(summary.expense)}`);
	console.log(`   - Arus Kas Bersih: ${formatRupiah(summary.net)}`);
	console.log(
		`   - Volume Transfer: ${formatRupiah(summary.transferVolume)} (${summary.transferCount} tx)`
	);
	console.log(`   - Biaya Admin: ${formatRupiah(summary.totalFees)}`);
	console.log(`   - Rasio Tabungan: ${summary.savingsRate}%`);
	console.log(`   - Rata-rata Harian: ${formatRupiah(summary.dailyAverageExpense)}/hari`);
	console.log(
		`   - Kategori Teratas: ${catSummary.items[0]?.name ?? '-'} (${catSummary.items[0]?.percentage ?? 0}%)`
	);
	console.log(`   - Dompet Terlibat: ${walletBreakdown.length} akun`);
	console.log(`   - Titik Deret Harian: ${dailySeries.length} hari`);

	console.log(`\n⚡ Total durasi agregasi 1.000 transaksi: ${totalBenchMs.toFixed(2)}ms`);
	if (totalBenchMs < 50) {
		console.log('🎉 Benchmark SUKSES: Performa jauh di bawah ambang batas <50ms!');
	} else {
		console.warn('⚠️ Peringatan: Durasi melampaui 50ms.');
	}

	await db.close();
}

runSeed().catch((err) => {
	console.error('❌ Gagal menjalankan seeding:', err);
	process.exit(1);
});
