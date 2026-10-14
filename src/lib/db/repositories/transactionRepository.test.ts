import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MoneyTrackerDatabase } from '../schema';
import { DexieCategoryRepository } from './categoryRepository';
import { DexieTransactionRepository } from './transactionRepository';
import { DexieWalletRepository } from './walletRepository';

describe('DexieTransactionRepository - queryTransactions dengan index', () => {
	let testDb: MoneyTrackerDatabase;
	let txRepo: DexieTransactionRepository;
	let catRepo: DexieCategoryRepository;
	let walletRepo: DexieWalletRepository;

	let w1Id: string;
	let w2Id: string;
	let catFoodId: string;
	let catTransportId: string;
	let catSalaryId: string;

	beforeEach(async () => {
		const dbName = `TxQueryTestDB_${Date.now()}_${Math.random()}`;
		testDb = new MoneyTrackerDatabase(dbName);
		await testDb.open();

		txRepo = new DexieTransactionRepository(testDb);
		catRepo = new DexieCategoryRepository(testDb);
		walletRepo = new DexieWalletRepository(testDb);

		// Siapkan dompet
		const w1 = await walletRepo.create({
			name: 'BCA Utama',
			type: 'bank',
			openingBalance: 10000000,
			balance: 10000000,
			color: '#0058bc',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});
		w1Id = w1.id;

		const w2 = await walletRepo.create({
			name: 'GoPay',
			type: 'ewallet',
			openingBalance: 500000,
			balance: 500000,
			color: '#00aad0',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});
		w2Id = w2.id;

		// Siapkan kategori
		const cFood = await catRepo.create({
			name: 'Makanan & Minuman',
			kind: 'expense',
			parentId: null,
			icon: 'restaurant',
			color: '#ff9800',
			order: 1
		});
		catFoodId = cFood.id;

		const cTransport = await catRepo.create({
			name: 'Transportasi Umum',
			kind: 'expense',
			parentId: null,
			icon: 'directions_bus',
			color: '#2196f3',
			order: 2
		});
		catTransportId = cTransport.id;

		const cSalary = await catRepo.create({
			name: 'Gaji Bulanan',
			kind: 'income',
			parentId: null,
			icon: 'payments',
			color: '#4caf50',
			order: 3
		});
		catSalaryId = cSalary.id;

		// Siapkan transaksi sampel
		// Tx 1: Makan siang (BCA, 50.000, 2026-10-01)
		await txRepo.create({
			type: 'expense',
			amount: 50000,
			walletId: w1Id,
			toWalletId: null,
			fee: 0,
			categoryId: catFoodId,
			date: '2026-10-01',
			note: 'Makan siang soto ayam',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});

		// Tx 2: Naik ojek online (GoPay, 25.000, 2026-10-05)
		await txRepo.create({
			type: 'expense',
			amount: 25000,
			walletId: w2Id,
			toWalletId: null,
			fee: 0,
			categoryId: catTransportId,
			date: '2026-10-05',
			note: 'Ojek ke kantor',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});

		// Tx 3: Gaji bulanan (BCA, 8.000.000, 2026-10-10)
		await txRepo.create({
			type: 'income',
			amount: 8000000,
			walletId: w1Id,
			toWalletId: null,
			fee: 0,
			categoryId: catSalaryId,
			date: '2026-10-10',
			note: 'Gaji pokok PT Tech',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});

		// Tx 4: Topup GoPay dari BCA (Transfer, 200.000, 2026-10-12, fee 2.500)
		await txRepo.create({
			type: 'transfer',
			amount: 200000,
			walletId: w1Id,
			toWalletId: w2Id,
			fee: 2500,
			categoryId: null,
			date: '2026-10-12',
			note: 'Top up saldo e-wallet',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});

		// Tx 5: Makan malam mewah (BCA, 350.000, 2026-10-20)
		await txRepo.create({
			type: 'expense',
			amount: 350000,
			walletId: w1Id,
			toWalletId: null,
			fee: 0,
			categoryId: catFoodId,
			date: '2026-10-20',
			note: 'Steak bersama teman',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});
	});

	it('mengembalikan semua transaksi aktif jika filter kosong', async () => {
		const results = await txRepo.queryTransactions({});
		expect(results).toHaveLength(5);
		// Terurut descending tanggal
		expect(results[0].date).toBe('2026-10-20');
		expect(results[4].date).toBe('2026-10-01');
	});

	it('menyaring berdasarkan rentang tanggal menggunakan index date', async () => {
		const results = await txRepo.queryTransactions({
			startDate: '2026-10-05',
			endDate: '2026-10-12'
		});
		expect(results).toHaveLength(3);
		const dates = results.map((r) => r.date);
		expect(dates).toContain('2026-10-05');
		expect(dates).toContain('2026-10-10');
		expect(dates).toContain('2026-10-12');
	});

	it('menyaring berdasarkan single wallet (termasuk sebagai tujuan transfer) menggunakan compound index', async () => {
		const results = await txRepo.queryTransactions({
			walletIds: [w2Id]
		});
		// Tx 2 (expense dari GoPay) dan Tx 4 (transfer masuk ke GoPay)
		expect(results).toHaveLength(2);
		const notes = results.map((r) => r.note);
		expect(notes).toContain('Ojek ke kantor');
		expect(notes).toContain('Top up saldo e-wallet');
	});

	it('menyaring berdasarkan banyak dompet sekaligus (multi-wallet)', async () => {
		const results = await txRepo.queryTransactions({
			walletIds: [w1Id, w2Id],
			types: ['expense']
		});
		expect(results).toHaveLength(3); // Tx 1, Tx 2, Tx 5
	});

	it('menyaring berdasarkan banyak kategori sekaligus (multi-category)', async () => {
		const results = await txRepo.queryTransactions({
			categoryIds: [catFoodId, catTransportId]
		});
		expect(results).toHaveLength(3); // Tx 1, Tx 2, Tx 5
	});

	it('menyaring berdasarkan rentang nominal (minAmount & maxAmount)', async () => {
		const results = await txRepo.queryTransactions({
			minAmount: 30000,
			maxAmount: 250000
		});
		// Tx 1 (50.000) dan Tx 4 (200.000)
		expect(results).toHaveLength(2);
		const amounts = results.map((r) => r.amount);
		expect(amounts).toEqual([200000, 50000]);
	});

	it('menyaring berdasarkan pencarian teks pada catatan', async () => {
		const results = await txRepo.queryTransactions({
			search: 'soto'
		});
		expect(results).toHaveLength(1);
		expect(results[0].note).toBe('Makan siang soto ayam');
	});

	it('menyaring berdasarkan pencarian teks yang cocok dengan NAMA KATEGORI', async () => {
		// Kategori: "Makanan & Minuman" -> cari kata "makanan"
		const results = await txRepo.queryTransactions({
			search: 'makanan'
		});
		// Harus mencakup Tx 1 (soto ayam) dan Tx 5 (steak), yang berkategori Makanan & Minuman
		expect(results).toHaveLength(2);
		const notes = results.map((r) => r.note);
		expect(notes).toContain('Makan siang soto ayam');
		expect(notes).toContain('Steak bersama teman');
	});

	it('menyaring dengan kombinasi lengkap (tanggal, dompet, tipe, nominal, dan search)', async () => {
		const results = await txRepo.queryTransactions({
			startDate: '2026-10-01',
			endDate: '2026-10-15',
			walletIds: [w1Id],
			types: ['expense'],
			minAmount: 10000,
			maxAmount: 100000,
			search: 'soto'
		});
		expect(results).toHaveLength(1);
		expect(results[0].note).toBe('Makan siang soto ayam');
	});
});
