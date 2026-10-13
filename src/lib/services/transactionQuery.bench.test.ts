import 'fake-indexeddb/auto';
import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { DexieCategoryRepository } from '../db/repositories/categoryRepository';
import { DexieTransactionRepository } from '../db/repositories/transactionRepository';
import { DexieWalletRepository } from '../db/repositories/walletRepository';
import { MoneyTrackerDatabase } from '../db/schema';
import { generateSeedTransactions } from '../domain/seedData';
import type { Category, Wallet } from '../domain/types';

describe('Benchmark Tolak Ukur Query Transaksi (5.000 Transaksi)', () => {
	it('mengukur dan melaporkan waktu eksekusi queryTransactions pada 5.000 transaksi', async () => {
		const dbName = `Bench5kDB_${Date.now()}_${Math.random()}`;
		const testDb = new MoneyTrackerDatabase(dbName);
		await testDb.open();

		const txRepo = new DexieTransactionRepository(testDb);
		const catRepo = new DexieCategoryRepository(testDb);
		const walletRepo = new DexieWalletRepository(testDb);

		// 1. Buat 5 dompet
		const wallets: Wallet[] = [];
		const walletDefs = [
			{ name: 'BCA Utama', type: 'bank' as const },
			{ name: 'Mandiri', type: 'bank' as const },
			{ name: 'GoPay', type: 'ewallet' as const },
			{ name: 'ShopeePay', type: 'ewallet' as const },
			{ name: 'Dompet Tunai', type: 'cash' as const }
		];
		for (const w of walletDefs) {
			const created = await walletRepo.create({
				name: w.name,
				type: w.type,
				openingBalance: 5000000,
				balance: 5000000,
				color: '#0058bc',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null
			});
			wallets.push(created);
		}

		// 2. Buat 10 kategori (8 pengeluaran, 2 pemasukan)
		const categories: Category[] = [];
		const catDefs = [
			{ name: 'Makanan & Minuman', kind: 'expense' as const },
			{ name: 'Transportasi', kind: 'expense' as const },
			{ name: 'Belanja Bulanan', kind: 'expense' as const },
			{ name: 'Hiburan', kind: 'expense' as const },
			{ name: 'Tagihan Listrik & WiFi', kind: 'expense' as const },
			{ name: 'Kesehatan', kind: 'expense' as const },
			{ name: 'Pendidikan', kind: 'expense' as const },
			{ name: 'Investasi', kind: 'expense' as const },
			{ name: 'Gaji Pokok', kind: 'income' as const },
			{ name: 'Bonus & Dividen', kind: 'income' as const }
		];
		for (let i = 0; i < catDefs.length; i++) {
			const c = catDefs[i];
			const created = await catRepo.create({
				name: c.name,
				kind: c.kind,
				parentId: null,
				icon: 'category',
				color: '#ff9800',
				order: i + 1
			});
			categories.push(created);
		}

		// 3. Generate & Bulk insert 5.000 transaksi
		const seedData = generateSeedTransactions({
			count: 5000,
			wallets,
			categories
		});

		const insertStart = performance.now();
		await testDb.transactions.bulkAdd(seedData);
		const insertDuration = performance.now() - insertStart;

		const totalCount = await testDb.transactions.count();
		expect(totalCount).toBe(5000);

		const now = new Date();
		const startDate30d = subDays(now, 30).toISOString().slice(0, 10);
		const endDateToday = now.toISOString().slice(0, 10);

		// ========================================================
		// Benchmark Skenario Query Berindeks
		// ========================================================

		// Skenario 1: Filter Rentang Tanggal 30 Hari (Index 'date')
		const t1Start = performance.now();
		const res1 = await txRepo.queryTransactions({
			startDate: startDate30d,
			endDate: endDateToday
		});
		const t1Duration = performance.now() - t1Start;

		// Skenario 2: Filter Single Dompet + Tanggal 30 Hari (Compound Index '[walletId+date]')
		const t2Start = performance.now();
		const res2 = await txRepo.queryTransactions({
			startDate: startDate30d,
			endDate: endDateToday,
			walletIds: [wallets[0].id]
		});
		const t2Duration = performance.now() - t2Start;

		// Skenario 3: Filter Multi-Dompet (3 Dompet) + Tanggal 30 Hari
		const t3Start = performance.now();
		const res3 = await txRepo.queryTransactions({
			startDate: startDate30d,
			endDate: endDateToday,
			walletIds: [wallets[0].id, wallets[1].id, wallets[2].id]
		});
		const t3Duration = performance.now() - t3Start;

		// Skenario 4: Filter Multi-Kategori + Tipe Transaksi
		const t4Start = performance.now();
		const res4 = await txRepo.queryTransactions({
			categoryIds: [categories[0].id, categories[1].id, categories[2].id],
			types: ['expense']
		});
		const t4Duration = performance.now() - t4Start;

		// Skenario 5: Filter Pencarian Teks Catatan / Kategori
		const t5Start = performance.now();
		const res5 = await txRepo.queryTransactions({
			search: 'makanan'
		});
		const t5Duration = performance.now() - t5Start;

		// Skenario 6: Filter Kombinasi Lengkap (Tanggal + Multi-Dompet + Multi-Kategori + Nominal Min-Max + Search)
		const t6Start = performance.now();
		const res6 = await txRepo.queryTransactions({
			startDate: startDate30d,
			endDate: endDateToday,
			walletIds: [wallets[0].id, wallets[1].id],
			categoryIds: [categories[0].id, categories[1].id],
			types: ['expense'],
			minAmount: 20000,
			maxAmount: 500000,
			search: 'makanan'
		});
		const t6Duration = performance.now() - t6Start;

		// ========================================================
		// Pelaporan Hasil Benchmark
		// ========================================================
		console.log('\n======================================================');
		console.log('📊 LAPORAN BENCHMARK QUERY TRANSAKSI (5.000 TRANSAKSI)');
		console.log('======================================================');
		console.log(`• Bulk insert 5.000 transaksi: ${insertDuration.toFixed(2)} ms`);
		console.log(
			`• Skenario 1 (Index date 30 hari): ${t1Duration.toFixed(2)} ms (${res1.length} hasil)`
		);
		console.log(
			`• Skenario 2 (Index [walletId+date]): ${t2Duration.toFixed(2)} ms (${res2.length} hasil)`
		);
		console.log(
			`• Skenario 3 (Multi-dompet + date): ${t3Duration.toFixed(2)} ms (${res3.length} hasil)`
		);
		console.log(
			`• Skenario 4 (Multi-kategori + tipe): ${t4Duration.toFixed(2)} ms (${res4.length} hasil)`
		);
		console.log(
			`• Skenario 5 (Pencarian teks catatan/kategori): ${t5Duration.toFixed(2)} ms (${res5.length} hasil)`
		);
		console.log(
			`• Skenario 6 (Filter kombinasi penuh): ${t6Duration.toFixed(2)} ms (${res6.length} hasil)`
		);
		console.log('======================================================\n');

		// Ambang batas performa di lingkungan simulasi fake-indexeddb
		expect(t1Duration).toBeLessThan(1000);
		expect(t2Duration).toBeLessThan(1000);
		expect(t3Duration).toBeLessThan(1000);
		expect(t4Duration).toBeLessThan(2500);
		expect(t5Duration).toBeLessThan(2500);
		expect(t6Duration).toBeLessThan(1000);

		await testDb.close();
	}, 30000);
});
