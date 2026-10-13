import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { calculateBalanceAdjustment } from '../domain/adjustment';
import { createDeterministicRandom } from '../domain/seedData';
import { DexieWalletRepository } from './repositories/walletRepository';
import { MoneyTrackerDatabase } from './schema';
import { TransactionService } from './transactionService';

describe('Konsistensi Saldo Dompet & Integritas rebuildBalances() (Seed Tetap)', () => {
	let dbName: string;
	let testDb: MoneyTrackerDatabase;
	let txService: TransactionService;
	let walletRepo: DexieWalletRepository;

	beforeEach(async () => {
		dbName = `BalanceConsistency_${Date.now()}_${Math.random()}`;
		testDb = new MoneyTrackerDatabase(dbName);
		await testDb.open();
		txService = new TransactionService(testDb);
		walletRepo = new DexieWalletRepository(testDb);
	});

	it('konsistensi saldo terjamin pada 500 transaksi campuran dengan seed bertetap', async () => {
		// 1. Setup 3 Dompet
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

		const w2 = await walletRepo.create({
			name: 'GoPay Daily',
			type: 'ewallet',
			openingBalance: 2500000,
			balance: 2500000,
			color: '#00aed6',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});

		const w3 = await walletRepo.create({
			name: 'Uang Tunai',
			type: 'cash',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#10b981',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null
		});

		const walletIds = [w1.id, w2.id, w3.id];
		const rnd = createDeterministicRandom(42); // Seed bertetap agar 100% deterministik
		const totalTx = 500;

		// 2. Eksekusi 500 transaksi campuran: expense, income, transfer (dengan fee), dan koreksi saldo
		for (let i = 0; i < totalTx; i++) {
			const r = rnd();
			const fromWalletId = walletIds[Math.floor(rnd() * walletIds.length)];

			if (r < 0.55) {
				// Pengeluaran (expense)
				const amount = Math.floor(rnd() * 150000) + 10000;
				await txService.addTransaction({
					type: 'expense',
					amount,
					walletId: fromWalletId,
					date: '2026-10-13',
					note: `Pengeluaran #${i + 1}`
				});
			} else if (r < 0.8) {
				// Pemasukan (income)
				const amount = Math.floor(rnd() * 500000) + 50000;
				await txService.addTransaction({
					type: 'income',
					amount,
					walletId: fromWalletId,
					date: '2026-10-13',
					note: `Pemasukan #${i + 1}`
				});
			} else if (r < 0.95) {
				// Transfer antar dompet dengan variasi fee admin
				const otherWallets = walletIds.filter((id) => id !== fromWalletId);
				const toWalletId = otherWallets[Math.floor(rnd() * otherWallets.length)];
				const amount = Math.floor(rnd() * 100000) + 10000;
				const fee = rnd() < 0.5 ? 2500 : 0;

				await txService.transfer({
					amount,
					walletId: fromWalletId,
					toWalletId,
					fee,
					date: '2026-10-13',
					note: `Transfer #${i + 1}`
				});
			} else {
				// Koreksi saldo (penyesuaian saldo sistem)
				const currentWallet = await walletRepo.getById(fromWalletId);
				if (currentWallet) {
					const targetBalance = Math.floor(rnd() * 5000000) + 500000;
					const adjustment = calculateBalanceAdjustment(currentWallet.balance, targetBalance);
					if (adjustment.type !== null && adjustment.amount > 0) {
						await txService.addTransaction({
							type: adjustment.type,
							amount: adjustment.amount,
							walletId: fromWalletId,
							date: '2026-10-13',
							note: `Koreksi saldo #${i + 1}`
						});
					}
				}
			}
		}

		// 3. Verifikasi konsistensi saldo: Saldo cache setiap dompet WAJIB identik dengan rebuildBalances()
		const currentWallets = await testDb.wallets.toArray();
		const rebuiltBalances = await txService.rebuildBalances();

		expect(currentWallets.length).toBe(3);
		for (const wallet of currentWallets) {
			const rebuilt = rebuiltBalances.get(wallet.id);
			expect(rebuilt).toBeDefined();
			expect(wallet.balance).toBe(rebuilt);
		}

		await testDb.close();
	}, 10000);
});
