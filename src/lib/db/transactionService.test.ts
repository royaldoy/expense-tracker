import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MoneyTrackerDatabase } from './schema';
import { TransactionService } from './transactionService';

describe('TransactionService (dengan fake-indexeddb)', () => {
	let testDb: MoneyTrackerDatabase;
	let service: TransactionService;

	beforeEach(async () => {
		testDb = new MoneyTrackerDatabase(`TestDB_${Date.now()}_${Math.random()}`);
		service = new TransactionService(testDb);
	});

	it('menambahkan transaksi income dan mengupdate cache saldo dompet secara atomik', async () => {
		await testDb.wallets.add({
			id: 'w_bca',
			name: 'BCA',
			type: 'bank',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0055A5',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 100,
			updatedAt: 100,
			deletedAt: null
		});

		const tx = await service.addTransaction({
			walletId: 'w_bca',
			type: 'income',
			amount: 500000,
			date: '2026-10-12',
			note: 'Gaji sampingan'
		});

		expect(tx.id).toBeDefined();
		expect(tx.type).toBe('income');
		expect(tx.amount).toBe(500000);

		const wallet = await testDb.wallets.get('w_bca');
		expect(wallet?.balance).toBe(1500000);
	});

	it('menambahkan transaksi expense dan memotong cache saldo dompet', async () => {
		await testDb.wallets.add({
			id: 'w_cash',
			name: 'Tunai',
			type: 'cash',
			openingBalance: 100000,
			balance: 100000,
			color: '#10B981',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 100,
			updatedAt: 100,
			deletedAt: null
		});

		await service.addTransaction({
			walletId: 'w_cash',
			type: 'expense',
			amount: 35000,
			date: '2026-10-12',
			note: 'Makan siang'
		});

		const wallet = await testDb.wallets.get('w_cash');
		expect(wallet?.balance).toBe(65000);
	});

	it('transfer memotong (amount + fee) dari dompet asal dan menambah amount ke dompet tujuan', async () => {
		await testDb.wallets.bulkAdd([
			{
				id: 'w_bca',
				name: 'BCA',
				type: 'bank',
				openingBalance: 500000,
				balance: 500000,
				color: '#0055A5',
				icon: 'account_balance',
				includeInTotal: true,
				archivedAt: null,
				createdAt: 100,
				updatedAt: 100,
				deletedAt: null
			},
			{
				id: 'w_gopay',
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 50000,
				balance: 50000,
				color: '#00AED6',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null,
				createdAt: 100,
				updatedAt: 100,
				deletedAt: null
			}
		]);

		const tx = await service.transfer({
			walletId: 'w_bca',
			toWalletId: 'w_gopay',
			amount: 200000,
			fee: 2500,
			date: '2026-10-12',
			note: 'Top up GoPay'
		});

		expect(tx.type).toBe('transfer');
		expect(tx.amount).toBe(200000);
		expect(tx.fee).toBe(2500);

		const bca = await testDb.wallets.get('w_bca');
		const gopay = await testDb.wallets.get('w_gopay');

		// bca: 500.000 - (200.000 + 2.500) = 297.500
		expect(bca?.balance).toBe(297500);
		// gopay: 50.000 + 200.000 = 250.000
		expect(gopay?.balance).toBe(250000);
	});

	it('menolak transfer jika dompet tujuan sama dengan dompet asal', async () => {
		await testDb.wallets.add({
			id: 'w_same',
			name: 'BCA',
			type: 'bank',
			openingBalance: 500000,
			balance: 500000,
			color: '#0055A5',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 100,
			updatedAt: 100,
			deletedAt: null
		});

		await expect(
			service.transfer({
				walletId: 'w_same',
				toWalletId: 'w_same',
				amount: 50000,
				date: '2026-10-12'
			})
		).rejects.toThrow('Dompet sumber dan tujuan tidak boleh sama.');
	});

	it('updateTransaction me-rollback saldo lama dan menerapkan saldo baru secara atomik', async () => {
		await testDb.wallets.add({
			id: 'w_1',
			name: 'Dompet Utama',
			type: 'bank',
			openingBalance: 100000,
			balance: 100000,
			color: '#0055A5',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 100,
			updatedAt: 100,
			deletedAt: null
		});

		// Tambah expense 30.000 (saldo jadi 70.000)
		const tx = await service.addTransaction({
			walletId: 'w_1',
			type: 'expense',
			amount: 30000,
			date: '2026-10-12'
		});
		let wallet = await testDb.wallets.get('w_1');
		expect(wallet?.balance).toBe(70000);

		// Edit amount menjadi 50.000 (saldo seharusnya 100.000 - 50.000 = 50.000)
		await service.updateTransaction(tx.id, {
			amount: 50000
		});

		wallet = await testDb.wallets.get('w_1');
		expect(wallet?.balance).toBe(50000);

		// Ubah tipe dari expense 50.000 menjadi income 50.000 (saldo 100.000 + 50.000 = 150.000)
		await service.updateTransaction(tx.id, {
			type: 'income',
			amount: 50000
		});

		wallet = await testDb.wallets.get('w_1');
		expect(wallet?.balance).toBe(150000);
	});

	it('deleteTransaction melakukan soft delete dan mengembalikan saldo dompet', async () => {
		await testDb.wallets.add({
			id: 'w_del',
			name: 'Dompet Del',
			type: 'cash',
			openingBalance: 200000,
			balance: 200000,
			color: '#10B981',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null,
			createdAt: 100,
			updatedAt: 100,
			deletedAt: null
		});

		const tx = await service.addTransaction({
			walletId: 'w_del',
			type: 'expense',
			amount: 75000,
			date: '2026-10-12'
		});
		let wallet = await testDb.wallets.get('w_del');
		expect(wallet?.balance).toBe(125000);

		// Hapus transaksi
		await service.deleteTransaction(tx.id);

		// Transaksi soft deleted
		const storedTx = await testDb.transactions.get(tx.id);
		expect(storedTx?.deletedAt).not.toBeNull();

		// Saldo kembali ke 200.000
		wallet = await testDb.wallets.get('w_del');
		expect(wallet?.balance).toBe(200000);
	});

	it('rebuildBalances menghitung ulang seluruh saldo dari riwayat transaksi aktif dan memperbaiki cache yang salah', async () => {
		await testDb.wallets.bulkAdd([
			{
				id: 'w_corrupt',
				name: 'Dompet Rusak',
				type: 'bank',
				openingBalance: 100000,
				balance: 99999999, // Cache sengaja salah/korup
				color: '#0055A5',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null,
				createdAt: 100,
				updatedAt: 100,
				deletedAt: null
			}
		]);

		await testDb.transactions.bulkAdd([
			{
				id: 'tx_act_1',
				walletId: 'w_corrupt',
				type: 'income',
				amount: 50000,
				toWalletId: null,
				fee: 0,
				categoryId: null,
				date: '2026-10-01',
				note: null,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: 200,
				updatedAt: 200,
				deletedAt: null
			},
			{
				id: 'tx_act_2',
				walletId: 'w_corrupt',
				type: 'expense',
				amount: 20000,
				toWalletId: null,
				fee: 0,
				categoryId: null,
				date: '2026-10-02',
				note: null,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: 300,
				updatedAt: 300,
				deletedAt: null
			},
			{
				id: 'tx_del',
				walletId: 'w_corrupt',
				type: 'expense',
				amount: 40000,
				toWalletId: null,
				fee: 0,
				categoryId: null,
				date: '2026-10-03',
				note: null,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: 400,
				updatedAt: 400,
				deletedAt: 500 // Soft-deleted, harus diabaikan
			}
		]);

		const balances = await service.rebuildBalances();

		// Saldo seharusnya: 100.000 + 50.000 - 20.000 = 130.000
		expect(balances.get('w_corrupt')).toBe(130000);

		const fixedWallet = await testDb.wallets.get('w_corrupt');
		expect(fixedWallet?.balance).toBe(130000);
	});
});
