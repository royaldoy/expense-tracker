import { describe, expect, it } from 'vitest';
import {
	calculateCashflow,
	calculateTotalBalance,
	calculateWalletBalance,
	calculateWalletBalances
} from './balance';
import type { Transaction, Wallet } from './types';

function createMockWallet(overrides: Partial<Wallet> = {}): Wallet {
	return {
		id: 'wallet_1',
		name: 'GoPay',
		type: 'ewallet',
		openingBalance: 100000,
		balance: 100000,
		color: '#00AED6',
		icon: 'wallet',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null,
		...overrides
	};
}

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: 'tx_1',
		walletId: 'wallet_1',
		type: 'expense',
		amount: 25000,
		toWalletId: null,
		fee: 0,
		categoryId: null,
		date: '2026-10-12',
		note: 'Makan siang',
		tagIds: [],
		attachmentId: null,
		recurringId: null,
		createdAt: 2000,
		updatedAt: 2000,
		deletedAt: null,
		...overrides
	};
}

describe('domain/balance', () => {
	describe('calculateWalletBalance', () => {
		it('menghitung saldo awal tanpa transaksi', () => {
			const wallet = createMockWallet({ openingBalance: 250000 });
			expect(calculateWalletBalance(wallet, [])).toBe(250000);
		});

		it('menambahkan saldo untuk transaksi pemasukan (income)', () => {
			const wallet = createMockWallet({ openingBalance: 100000 });
			const tx = createMockTransaction({ type: 'income', amount: 50000 });
			expect(calculateWalletBalance(wallet, [tx])).toBe(150000);
		});

		it('mengurangi saldo untuk transaksi pengeluaran (expense)', () => {
			const wallet = createMockWallet({ openingBalance: 100000 });
			const tx = createMockTransaction({ type: 'expense', amount: 35000 });
			expect(calculateWalletBalance(wallet, [tx])).toBe(65000);
		});

		it('menangani saldo negatif (overdraft)', () => {
			const wallet = createMockWallet({ openingBalance: 50000 });
			const tx = createMockTransaction({ type: 'expense', amount: 80000 });
			expect(calculateWalletBalance(wallet, [tx])).toBe(-30000);
		});

		it('menghitung transfer antar dompet dari perspektif dompet asal', () => {
			const walletAsal = createMockWallet({ id: 'wallet_asal', openingBalance: 500000 });
			const tx = createMockTransaction({
				walletId: 'wallet_asal',
				toWalletId: 'wallet_tujuan',
				type: 'transfer',
				amount: 200000,
				fee: 0
			});
			expect(calculateWalletBalance(walletAsal, [tx])).toBe(300000);
		});

		it('menghitung transfer antar dompet dari perspektif dompet tujuan', () => {
			const walletTujuan = createMockWallet({ id: 'wallet_tujuan', openingBalance: 100000 });
			const tx = createMockTransaction({
				walletId: 'wallet_asal',
				toWalletId: 'wallet_tujuan',
				type: 'transfer',
				amount: 200000,
				fee: 2500
			});
			expect(calculateWalletBalance(walletTujuan, [tx])).toBe(300000);
		});

		it('memotong biaya admin (fee) dari dompet asal saat transfer', () => {
			const walletAsal = createMockWallet({ id: 'wallet_asal', openingBalance: 500000 });
			const tx = createMockTransaction({
				walletId: 'wallet_asal',
				toWalletId: 'wallet_tujuan',
				type: 'transfer',
				amount: 200000,
				fee: 6500
			});
			// Dompet asal berkurang amount (200.000) + fee (6.500) = 206.500
			expect(calculateWalletBalance(walletAsal, [tx])).toBe(293500);
		});

		it('mengabaikan transaksi yang berstatus soft-deleted (deletedAt !== null)', () => {
			const wallet = createMockWallet({ openingBalance: 100000 });
			const txDeleted = createMockTransaction({
				type: 'expense',
				amount: 40000,
				deletedAt: 5000
			});
			const txActive = createMockTransaction({
				id: 'tx_2',
				type: 'income',
				amount: 20000,
				deletedAt: null
			});
			expect(calculateWalletBalance(wallet, [txDeleted, txActive])).toBe(120000);
		});
	});

	describe('calculateWalletBalances', () => {
		it('menghitung saldo multi-dompet secara simultan dengan transfer dan fee', () => {
			const wallet1 = createMockWallet({ id: 'w1', name: 'BCA', openingBalance: 1000000 });
			const wallet2 = createMockWallet({ id: 'w2', name: 'GoPay', openingBalance: 50000 });

			const transactions: Transaction[] = [
				createMockTransaction({ id: 't1', walletId: 'w1', type: 'income', amount: 500000 }),
				createMockTransaction({
					id: 't2',
					walletId: 'w1',
					toWalletId: 'w2',
					type: 'transfer',
					amount: 200000,
					fee: 2500
				}),
				createMockTransaction({ id: 't3', walletId: 'w2', type: 'expense', amount: 75000 }),
				createMockTransaction({
					id: 't4',
					walletId: 'w1',
					type: 'expense',
					amount: 100000,
					deletedAt: 9999
				})
			];

			const balances = calculateWalletBalances([wallet1, wallet2], transactions);

			// w1: 1.000.000 + 500.000 - (200.000 + 2.500) = 1.297.500 (t4 dihapus)
			expect(balances.get('w1')).toBe(1297500);
			// w2: 50.000 + 200.000 - 75.000 = 175.000
			expect(balances.get('w2')).toBe(175000);
		});
	});

	describe('calculateTotalBalance', () => {
		it('menghitung total saldo seluruh dompet aktif yang includeInTotal = true', () => {
			const w1 = createMockWallet({ id: 'w1', balance: 500000, includeInTotal: true });
			const w2 = createMockWallet({ id: 'w2', balance: 300000, includeInTotal: true });
			const w3 = createMockWallet({ id: 'w3', balance: 1000000, includeInTotal: false }); // diabaikan
			const w4 = createMockWallet({
				id: 'w4',
				balance: 200000,
				includeInTotal: true,
				deletedAt: 9000
			}); // deleted

			expect(calculateTotalBalance([w1, w2, w3, w4])).toBe(800000);
		});

		it('menggunakan balances map jika disediakan', () => {
			const w1 = createMockWallet({ id: 'w1', balance: 0, includeInTotal: true });
			const w2 = createMockWallet({ id: 'w2', balance: 0, includeInTotal: true });

			const freshBalances = new Map<string, number>([
				['w1', 750000],
				['w2', 250000]
			]);

			expect(calculateTotalBalance([w1, w2], freshBalances)).toBe(1000000);
		});
	});

	describe('calculateCashflow', () => {
		it('menghitung total income dan expense dari transaksi aktif', () => {
			const txs: Transaction[] = [
				createMockTransaction({ id: 't1', type: 'income', amount: 500000 }),
				createMockTransaction({ id: 't2', type: 'expense', amount: 150000 }),
				createMockTransaction({ id: 't3', type: 'expense', amount: 50000, deletedAt: 999 })
			];

			const cashflow = calculateCashflow(txs);
			expect(cashflow.income).toBe(500000);
			expect(cashflow.expense).toBe(150000);
			expect(cashflow.net).toBe(350000);
		});

		it('memastikan nominal transfer tidak masuk income maupun expense, tapi fee transfer dihitung sebagai expense', () => {
			const txs: Transaction[] = [
				createMockTransaction({ id: 't1', type: 'income', amount: 1000000 }),
				createMockTransaction({ id: 't2', type: 'expense', amount: 200000 }),
				createMockTransaction({
					id: 't3',
					type: 'transfer',
					amount: 500000,
					fee: 6500,
					walletId: 'w1',
					toWalletId: 'w2'
				})
			];

			const cashflow = calculateCashflow(txs);
			// Income: hanya 1.000.000 (transfer 500.000 tidak dihitung)
			expect(cashflow.income).toBe(1000000);
			// Expense: 200.000 (expense) + 6.500 (fee transfer) = 206.500
			expect(cashflow.expense).toBe(206500);
			expect(cashflow.net).toBe(1000000 - 206500);
		});
	});
});
