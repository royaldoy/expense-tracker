import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
	DexieCategoryRepository,
	DexieTransactionRepository,
	DexieWalletRepository
} from '../db/repositories';
import { MoneyTrackerDatabase } from '../db/schema';
import {
	aggregateCategoryBreakdown,
	aggregateSummary,
	aggregateWalletBreakdown,
	generateDailyCashflowSeries
} from '../domain/aggregation';
import { calculateWalletBalances } from '../domain/balance';
import { getPeriodForDate } from '../domain/period';
import { generateSeedTransactions } from '../domain/seedData';
import type { Category, Wallet } from '../domain/types';

describe('Seed & Performance Benchmark (1.000 Transaksi)', () => {
	it('menghasilkan 1.000 transaksi dan menguji performa agregasi in-memory (<50ms)', async () => {
		const testDb = new MoneyTrackerDatabase(`BenchDB_${Date.now()}`);
		const walletRepo = new DexieWalletRepository(testDb);
		const catRepo = new DexieCategoryRepository(testDb);
		const txRepo = new DexieTransactionRepository(testDb);

		// 1. Setup 3 Dompet
		const w1 = await walletRepo.create({
			name: 'BCA Utama',
			type: 'bank',
			openingBalance: 15000000,
			balance: 15000000,
			color: '#0066AE',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});
		const w2 = await walletRepo.create({
			name: 'GoPay Daily',
			type: 'ewallet',
			openingBalance: 2500000,
			balance: 2500000,
			color: '#00AED6',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});
		const w3 = await walletRepo.create({
			name: 'Uang Tunai',
			type: 'cash',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#10B981',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null
		});

		const wallets: Wallet[] = [w1, w2, w3];

		// 2. Setup 5 Kategori
		const cats: Category[] = [
			await catRepo.create({
				name: 'Makan & Minum',
				kind: 'expense',
				parentId: null,
				icon: 'restaurant',
				color: '#F97316',
				order: 1
			}),
			await catRepo.create({
				name: 'Transportasi',
				kind: 'expense',
				parentId: null,
				icon: 'directions_car',
				color: '#3B82F6',
				order: 2
			}),
			await catRepo.create({
				name: 'Belanja Bulanan',
				kind: 'expense',
				parentId: null,
				icon: 'shopping_bag',
				color: '#EC4899',
				order: 3
			}),
			await catRepo.create({
				name: 'Gaji Pokok',
				kind: 'income',
				parentId: null,
				icon: 'payments',
				color: '#10B981',
				order: 4
			}),
			await catRepo.create({
				name: 'Bonus / Freelance',
				kind: 'income',
				parentId: null,
				icon: 'redeem',
				color: '#8B5CF6',
				order: 5
			})
		];

		// 3. Generate 1.000 Transaksi
		const generatedTxs = generateSeedTransactions({
			count: 1000,
			wallets,
			categories: cats
		});
		expect(generatedTxs).toHaveLength(1000);

		// 4. Bulk Write ke Dexie
		const bulkStart = performance.now();
		await testDb.transactions.bulkAdd(generatedTxs);
		const bulkDuration = performance.now() - bulkStart;
		// IndexedDB bulk insert harus sangat cepat
		expect(bulkDuration).toBeLessThan(1000);

		// 5. Verifikasi Integritas Saldo dengan calculateWalletBalances
		const allTxs = await txRepo.getAllActive();
		expect(allTxs).toHaveLength(1000);

		const expectedBalances = calculateWalletBalances(wallets, allTxs);
		expect(expectedBalances.size).toBe(3);

		// 6. Benchmark Agregasi Domain (Target <50ms)
		const period = getPeriodForDate(new Date(), 25); // Siklus gajian 25

		const benchStart = performance.now();

		const summary = aggregateSummary(allTxs, period);
		const categoryBreakdown = aggregateCategoryBreakdown(allTxs, cats, 'expense');
		const walletBreakdown = aggregateWalletBreakdown(allTxs, wallets);
		const dailySeries = generateDailyCashflowSeries(allTxs, period);

		const totalBenchDuration = performance.now() - benchStart;

		// Verifikasi hasil kalkulasi valid
		expect(summary).toBeDefined();
		expect(typeof summary.net).toBe('number');
		expect(categoryBreakdown.items.length).toBeGreaterThan(0);
		expect(walletBreakdown).toHaveLength(3);
		expect(dailySeries.length).toBeGreaterThan(20);

		// Tolok ukur performa agregasi in-memory untuk 1.000 transaksi < 50ms
		expect(totalBenchDuration).toBeLessThan(50);
	});
});
