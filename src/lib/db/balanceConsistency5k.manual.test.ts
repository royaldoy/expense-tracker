import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { calculateBalanceAdjustment } from '../domain/adjustment';
import { createDeterministicRandom } from '../domain/seedData';
import { DexieWalletRepository } from './repositories/walletRepository';
import { MoneyTrackerDatabase } from './schema';
import { TransactionService } from './transactionService';

describe.skipIf(!process.env.RUN_5K)(
	'Uji Beban 5.000 Transaksi: Konsistensi Saldo Dompet & rebuildBalances() (Manual Test)',
	() => {
		let dbName: string;
		let testDb: MoneyTrackerDatabase;
		let txService: TransactionService;
		let walletRepo: DexieWalletRepository;

		beforeEach(async () => {
			dbName = `BalanceConsistency5k_${Date.now()}_${Math.random()}`;
			testDb = new MoneyTrackerDatabase(dbName);
			await testDb.open();
			txService = new TransactionService(testDb);
			walletRepo = new DexieWalletRepository(testDb);
		});

		it('konsistensi saldo 100% identik pada 5.000 transaksi campuran dengan seed bertetap', async () => {
			// 1. Setup 4 Dompet
			const w1 = await walletRepo.create({
				name: 'BCA Utama',
				type: 'bank',
				openingBalance: 15000000,
				balance: 15000000,
				color: '#0058bc',
				icon: 'account_balance',
				includeInTotal: true,
				archivedAt: null
			});

			const w2 = await walletRepo.create({
				name: 'Mandiri Operasional',
				type: 'bank',
				openingBalance: 8000000,
				balance: 8000000,
				color: '#004493',
				icon: 'account_balance',
				includeInTotal: true,
				archivedAt: null
			});

			const w3 = await walletRepo.create({
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 3000000,
				balance: 3000000,
				color: '#00aed6',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null
			});

			const w4 = await walletRepo.create({
				name: 'Kas Tunai',
				type: 'cash',
				openingBalance: 2000000,
				balance: 2000000,
				color: '#10b981',
				icon: 'payments',
				includeInTotal: true,
				archivedAt: null
			});

			const walletIds = [w1.id, w2.id, w3.id, w4.id];
			const rnd = createDeterministicRandom(20261013); // Seed bertetap agar konsisten & deterministik
			const totalTx = 5000;

			const startTime = Date.now();

			// 2. Eksekusi 5.000 transaksi campuran: expense, income, transfer (dengan fee), dan koreksi saldo
			for (let i = 0; i < totalTx; i++) {
				const r = rnd();
				const fromWalletId = walletIds[Math.floor(rnd() * walletIds.length)];

				if (r < 0.58) {
					// Pengeluaran
					const amount = Math.floor(rnd() * 200000) + 5000;
					await txService.addTransaction({
						type: 'expense',
						amount,
						walletId: fromWalletId,
						date: '2026-10-13',
						note: `Beban #${i + 1}`
					});
				} else if (r < 0.82) {
					// Pemasukan
					const amount = Math.floor(rnd() * 600000) + 25000;
					await txService.addTransaction({
						type: 'income',
						amount,
						walletId: fromWalletId,
						date: '2026-10-13',
						note: `Pemasukan #${i + 1}`
					});
				} else if (r < 0.96) {
					// Transfer antar dompet
					const otherWallets = walletIds.filter((id) => id !== fromWalletId);
					const toWalletId = otherWallets[Math.floor(rnd() * otherWallets.length)];
					const amount = Math.floor(rnd() * 100000) + 10000;
					const fee = rnd() < 0.4 ? 2500 : 0;

					await txService.transfer({
						amount,
						walletId: fromWalletId,
						toWalletId,
						fee,
						date: '2026-10-13',
						note: `Transfer #${i + 1}`
					});
				} else {
					// Koreksi saldo
					const currentWallet = await walletRepo.getById(fromWalletId);
					if (currentWallet) {
						const targetBalance = Math.floor(rnd() * 10000000) + 1000000;
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

			const duration = Date.now() - startTime;
			console.log(`✓ 5.000 transaksi atomik selesai dalam ${duration} ms`);

			// 3. Verifikasi konsistensi saldo: Saldo cache setiap dompet WAJIB identik dengan rebuildBalances()
			const currentWallets = await testDb.wallets.toArray();
			const rebuiltBalances = await txService.rebuildBalances();

			expect(currentWallets.length).toBe(4);
			for (const wallet of currentWallets) {
				const rebuilt = rebuiltBalances.get(wallet.id);
				expect(rebuilt).toBeDefined();
				expect(wallet.balance).toBe(rebuilt);
			}

			await testDb.close();
		}, 45000);
	}
);
