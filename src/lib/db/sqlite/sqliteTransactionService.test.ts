import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySqliteDriver } from './connection';
import { SqliteTransactionService } from './sqliteTransactionService';
import { SqliteWalletRepository } from '../repositories/sqlite/sqliteWalletRepository';

describe('SqliteTransactionService (Atomic DB Transactions, Balances & RebuildBalances)', () => {
	let driver: InMemorySqliteDriver;
	let txService: SqliteTransactionService;
	let walletRepo: SqliteWalletRepository;

	beforeEach(async () => {
		driver = new InMemorySqliteDriver();
		txService = new SqliteTransactionService(driver);
		walletRepo = new SqliteWalletRepository(driver);
	});

	it('menambah transaksi pengeluaran dan memotong saldo dompet', async () => {
		const wallet = await walletRepo.create({
			name: 'Tunai',
			type: 'cash',
			openingBalance: 100000,
			balance: 100000,
			color: '#006E28',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null
		});

		const tx = await txService.addTransaction({
			walletId: wallet.id,
			type: 'expense',
			amount: 25000,
			date: '2026-10-13',
			note: 'Beli bensin'
		});

		expect(tx.id).toBeDefined();
		const updatedWallet = await walletRepo.getById(wallet.id);
		expect(updatedWallet?.balance).toBe(75000);
	});

	it('transfer antar dompet memotong saldo asal + fee dan menambah saldo tujuan', async () => {
		const src = await walletRepo.create({
			name: 'BCA',
			type: 'bank',
			openingBalance: 500000,
			balance: 500000,
			color: '#0058BC',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});

		const dest = await walletRepo.create({
			name: 'GoPay',
			type: 'ewallet',
			openingBalance: 10000,
			balance: 10000,
			color: '#0070EB',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});

		const tx = await txService.transfer({
			walletId: src.id,
			toWalletId: dest.id,
			amount: 100000,
			fee: 2500,
			date: '2026-10-13',
			note: 'Top up GoPay'
		});

		expect(tx.type).toBe('transfer');
		const updatedSrc = await walletRepo.getById(src.id);
		const updatedDest = await walletRepo.getById(dest.id);

		// 500.000 - 100.000 - 2.500 = 397.500
		expect(updatedSrc?.balance).toBe(397500);
		// 10.000 + 100.000 = 110.000
		expect(updatedDest?.balance).toBe(110000);
	});

	it('rebuildBalances memulihkan saldo dompet jika terjadi anomali cache', async () => {
		const wallet = await walletRepo.create({
			name: 'Dompet Rusak',
			type: 'bank',
			openingBalance: 200000,
			balance: 99999999, // Anomali
			color: '#0058BC',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});

		await txService.addTransaction({
			walletId: wallet.id,
			type: 'expense',
			amount: 50000,
			date: '2026-10-13'
		});

		const recoveredMap = await txService.rebuildBalances();
		// 200.000 - 50.000 = 150.000
		expect(recoveredMap.get(wallet.id)).toBe(150000);

		const updatedWallet = await walletRepo.getById(wallet.id);
		expect(updatedWallet?.balance).toBe(150000);
	});
});
