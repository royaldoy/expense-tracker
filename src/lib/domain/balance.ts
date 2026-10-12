/**
 * Domain Balance - Kalkulasi Saldo Dompet (Pure TypeScript)
 * Aturan data uang: Saldo dihitung dari openingBalance + mutasi transaksi aktif.
 */

import type { Transaction, Wallet } from './types';

/**
 * Hitung saldo akhir satu dompet dari openingBalance dan kumpulan transaksi.
 */
export function calculateWalletBalance(wallet: Wallet, transactions: Transaction[]): number {
	let balance = wallet.openingBalance;

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;

		if (tx.walletId === wallet.id) {
			if (tx.type === 'income') {
				balance += tx.amount;
			} else if (tx.type === 'expense') {
				balance -= tx.amount;
			} else if (tx.type === 'transfer') {
				balance -= tx.amount + (tx.fee ?? 0);
			}
		}

		if (tx.type === 'transfer' && tx.toWalletId === wallet.id) {
			balance += tx.amount;
		}
	}

	return balance;
}

/**
 * Hitung saldo seluruh dompet secara efisien dalam satu pass O(N + M).
 */
export function calculateWalletBalances(
	wallets: Wallet[],
	transactions: Transaction[]
): Map<string, number> {
	const balances = new Map<string, number>();
	for (const w of wallets) {
		balances.set(w.id, w.openingBalance);
	}

	for (const tx of transactions) {
		if (tx.deletedAt !== null) continue;

		if (tx.type === 'income') {
			const current = balances.get(tx.walletId);
			if (current !== undefined) {
				balances.set(tx.walletId, current + tx.amount);
			}
		} else if (tx.type === 'expense') {
			const current = balances.get(tx.walletId);
			if (current !== undefined) {
				balances.set(tx.walletId, current - tx.amount);
			}
		} else if (tx.type === 'transfer') {
			const srcCurrent = balances.get(tx.walletId);
			if (srcCurrent !== undefined) {
				balances.set(tx.walletId, srcCurrent - (tx.amount + (tx.fee ?? 0)));
			}
			if (tx.toWalletId) {
				const destCurrent = balances.get(tx.toWalletId);
				if (destCurrent !== undefined) {
					balances.set(tx.toWalletId, destCurrent + tx.amount);
				}
			}
		}
	}

	return balances;
}

/**
 * Hitung total kekayaan dari seluruh dompet aktif yang includeInTotal === true.
 */
export function calculateTotalBalance(
	wallets: Wallet[],
	balances?: Map<string, number> | Record<string, number>
): number {
	let total = 0;

	for (const w of wallets) {
		if (!w.includeInTotal || w.deletedAt !== null) continue;

		let bal: number | undefined;
		if (balances instanceof Map) {
			bal = balances.get(w.id);
		} else if (balances) {
			bal = balances[w.id];
		} else {
			bal = w.balance;
		}

		total += bal ?? w.balance ?? 0;
	}

	return total;
}
