import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	DexieCategoryRepository,
	DexieTransactionRepository,
	DexieWalletRepository
} from '../db/repositories';
import { MoneyTrackerDatabase } from '../db/schema';
import { TransactionService as DbTransactionService } from '../db/transactionService';
import { CategoryService } from './categoryService';
import { OnboardingService } from './onboardingService';
import { TransactionAppService } from './transactionService';
import { WalletService } from './walletService';

describe('Services Unit Test', () => {
	let testDb: MoneyTrackerDatabase;
	let walletRepo: DexieWalletRepository;
	let catRepo: DexieCategoryRepository;
	let txRepo: DexieTransactionRepository;
	let dbTxSvc: DbTransactionService;
	let walletSvc: WalletService;
	let catSvc: CategoryService;
	let txSvc: TransactionAppService;
	let onboardingSvc: OnboardingService;

	beforeEach(() => {
		testDb = new MoneyTrackerDatabase(`ServicesTest_${Date.now()}_${Math.random()}`);
		walletRepo = new DexieWalletRepository(testDb);
		catRepo = new DexieCategoryRepository(testDb);
		txRepo = new DexieTransactionRepository(testDb);
		dbTxSvc = new DbTransactionService(testDb);
		catSvc = new CategoryService(catRepo);
		txSvc = new TransactionAppService(dbTxSvc, txRepo, walletRepo, catRepo);
		walletSvc = new WalletService(walletRepo, txRepo, catSvc, txSvc);
		onboardingSvc = new OnboardingService(walletSvc, catSvc);
	});

	describe('WalletService', () => {
		it('membuat wallet valid dan menghitung total saldo', async () => {
			const w1 = await walletSvc.createWallet({
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 150000,
				color: '#006e28',
				icon: 'account_balance_wallet',
				includeInTotal: true
			});

			expect(w1.id).toBeDefined();
			expect(w1.balance).toBe(150000);

			await walletSvc.createWallet({
				name: 'BCA',
				type: 'bank',
				openingBalance: 2000000,
				color: '#0058bc',
				icon: 'account_balance',
				includeInTotal: true
			});

			const total = await walletSvc.getTotalBalance();
			expect(total).toBe(2150000);

			await walletSvc.createWallet({
				name: 'Tabungan Terkunci',
				type: 'bank',
				openingBalance: 5000000,
				color: '#bc000a',
				icon: 'savings',
				includeInTotal: false
			});

			expect(await walletSvc.getTotalBalance()).toBe(2150000);
		});

		it('gagal validasi jika nama kosong atau saldo negatif', async () => {
			await expect(
				walletSvc.createWallet({
					name: '',
					type: 'ewallet',
					openingBalance: 1000,
					color: '#000',
					icon: 'wallet',
					includeInTotal: true
				})
			).rejects.toThrow();

			await expect(
				walletSvc.createWallet({
					name: 'Cash',
					type: 'cash',
					openingBalance: -500,
					color: '#000',
					icon: 'payments',
					includeInTotal: true
				})
			).rejects.toThrow();
		});

		it('dapat mengarsipkan dan menghapus wallet', async () => {
			const w = await walletSvc.createWallet({
				name: 'Dompet Lama',
				type: 'cash',
				openingBalance: 50000,
				color: '#000',
				icon: 'payments',
				includeInTotal: true
			});

			let active = await walletSvc.getWallets();
			expect(active).toHaveLength(1);

			await walletSvc.archiveWallet(w.id);
			active = await walletSvc.getWallets();
			expect(active).toHaveLength(0);

			const all = await walletSvc.getWallets({ includeArchived: true });
			expect(all).toHaveLength(1);

			await walletSvc.unarchiveWallet(w.id);
			expect(await walletSvc.getWallets()).toHaveLength(1);

			await walletSvc.deleteWallet(w.id);
			expect(await walletSvc.getWallets({ includeArchived: true })).toHaveLength(0);
		});

		it('menyesuaikan saldo dompet dengan mencatat transaksi income/expense otomatis', async () => {
			const w = await walletSvc.createWallet({
				name: 'BCA Test',
				type: 'bank',
				openingBalance: 100000,
				color: '#0058bc',
				icon: 'account_balance',
				includeInTotal: true
			});

			// 1. Naikkan saldo ke 150.000 (+50.000 -> income)
			const resUp = await walletSvc.adjustBalance({
				walletId: w.id,
				targetBalance: 150000,
				note: 'Koreksi bertambah'
			});

			expect(resUp.wallet.balance).toBe(150000);
			expect(resUp.transaction).not.toBeNull();
			expect(resUp.transaction?.type).toBe('income');
			expect(resUp.transaction?.amount).toBe(50000);

			// 2. Turunkan saldo ke 110.000 (-40.000 -> expense)
			const resDown = await walletSvc.adjustBalance({
				walletId: w.id,
				targetBalance: 110000,
				note: 'Koreksi berkurang'
			});

			expect(resDown.wallet.balance).toBe(110000);
			expect(resDown.transaction?.type).toBe('expense');
			expect(resDown.transaction?.amount).toBe(40000);

			// 3. Target sama persis -> no-op
			const resSame = await walletSvc.adjustBalance({
				walletId: w.id,
				targetBalance: 110000
			});

			expect(resSame.wallet.balance).toBe(110000);
			expect(resSame.transaction).toBeNull();
		});
	});

	describe('CategoryService & OnboardingService', () => {
		it('menginisialisasi default categories secara otomatis pada onboarding', async () => {
			expect(await onboardingSvc.isCompleted()).toBe(false);

			const firstWallet = await onboardingSvc.complete({
				name: 'Dompet Utama',
				type: 'cash',
				openingBalance: 100000,
				color: '#006e28',
				icon: 'payments',
				includeInTotal: true
			});

			expect(firstWallet.name).toBe('Dompet Utama');
			expect(await onboardingSvc.isCompleted()).toBe(true);

			const categoriesWithSubs = await catSvc.getCategoriesWithSubcategories('expense');
			expect(categoriesWithSubs.length).toBeGreaterThan(0);

			const makanan = categoriesWithSubs.find((c) => c.name === 'Makanan & Minuman');
			expect(makanan).toBeDefined();
			expect(makanan?.subcategories.length).toBeGreaterThan(0);
		});

		it('dapat membuat dan mengupdate kategori kustom', async () => {
			const customCat = await catSvc.createCategory({
				name: 'Kripto',
				kind: 'income',
				parentId: null,
				icon: 'currency_bitcoin',
				color: '#f7931a',
				order: 99
			});

			expect(customCat.id).toBeDefined();

			const updated = await catSvc.updateCategory(customCat.id, {
				name: 'Aset Digital'
			});
			expect(updated.name).toBe('Aset Digital');
		});

		it('mencegah penghapusan kategori sistem Koreksi saldo', async () => {
			const sysCat = await catSvc.getOrCreateSystemAdjustmentCategory('expense');
			expect(sysCat.name).toBe('Koreksi saldo');
			expect(sysCat.isSystem).toBe(true);

			await expect(catSvc.deleteCategory(sysCat.id)).rejects.toThrowError(
				/Kategori sistem tidak dapat dihapus/i
			);
		});
	});

	describe('TransactionAppService', () => {
		it('dapat menambah transaksi, mengambil detail, dan memperbarui saldo', async () => {
			const w = await walletSvc.createWallet({
				name: 'Dompet Tunai',
				type: 'cash',
				openingBalance: 200000,
				color: '#006e28',
				icon: 'payments',
				includeInTotal: true
			});

			const tx = await txSvc.addTransaction({
				type: 'expense',
				amount: 50000,
				walletId: w.id,
				date: '2026-10-12',
				note: 'Beli bensin'
			});

			expect(tx.id).toBeDefined();

			// Saldo dompet harus berkurang menjadi 150000
			const freshWallet = await walletSvc.getWalletById(w.id);
			expect(freshWallet?.balance).toBe(150000);

			// Ambil detail transaksi
			const detail = await txSvc.getTransactionById(tx.id);
			expect(detail?.wallet?.name).toBe('Dompet Tunai');
			expect(detail?.note).toBe('Beli bensin');

			// Periksa cashflow
			const cashflow = await txSvc.getCashflowSummary();
			expect(cashflow.expense).toBe(50000);
			expect(cashflow.net).toBe(-50000);

			// Hapus transaksi dan pastikan saldo kembali
			await txSvc.deleteTransaction(tx.id);
			const restoredWallet = await walletSvc.getWalletById(w.id);
			expect(restoredWallet?.balance).toBe(200000);
		});

		it('dapat melakukan transfer antar dompet dengan fee dan tidak mempengaruhi laporan pemasukan/pengeluaran selain fee', async () => {
			const w1 = await walletSvc.createWallet({
				name: 'Bank Mandiri',
				type: 'bank',
				openingBalance: 1000000,
				color: '#0058bc',
				icon: 'account_balance',
				includeInTotal: true
			});

			const w2 = await walletSvc.createWallet({
				name: 'ShopeePay',
				type: 'ewallet',
				openingBalance: 50000,
				color: '#ee4d2d',
				icon: 'wallet',
				includeInTotal: true
			});

			const tx = await txSvc.transfer({
				walletId: w1.id,
				toWalletId: w2.id,
				amount: 200000,
				fee: 2500,
				date: '2026-10-12',
				note: 'Top up ShopeePay'
			});

			expect(tx.id).toBeDefined();

			// Sumber: 1.000.000 - (200.000 + 2.500) = 797.500
			const freshW1 = await walletSvc.getWalletById(w1.id);
			expect(freshW1?.balance).toBe(797500);

			// Tujuan: 50.000 + 200.000 = 250.000
			const freshW2 = await walletSvc.getWalletById(w2.id);
			expect(freshW2?.balance).toBe(250000);

			// Laporan kas: transfer pokok (200.000) tidak masuk, hanya fee (2.500) yang masuk sebagai expense
			const cashflow = await txSvc.getCashflowSummary();
			expect(cashflow.income).toBe(0);
			expect(cashflow.expense).toBe(2500);
			expect(cashflow.net).toBe(-2500);
		});
	});
});
