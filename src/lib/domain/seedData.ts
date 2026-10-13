/**
 * Domain Seed Generator - Pure TypeScript Random Transaction Generator
 * Menghasilkan transaksi dengan integer Rupiah dan aturan data uang yang valid.
 */

import { format, subDays } from 'date-fns';
import { ulid } from 'ulid';
import type { Category, Transaction, Wallet } from './types';

export interface SeedGeneratorOptions {
	count?: number;
	wallets: Wallet[];
	categories: Category[];
	startDate?: Date;
	endDate?: Date;
	randomSeed?: number; // Seed bertetap untuk hasil deterministik
}

/**
 * Pembangkit angka acak pseudo-deterministik (Mulberry32)
 */
export function createDeterministicRandom(seed = 123456789): () => number {
	let s = seed;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Pembangkit transaksi acak untuk pengujian beban dan benchmark.
 */
export function generateSeedTransactions(options: SeedGeneratorOptions): Transaction[] {
	const count = options.count ?? 1000;
	const { wallets, categories } = options;
	const rnd =
		options.randomSeed !== undefined ? createDeterministicRandom(options.randomSeed) : Math.random;

	if (wallets.length === 0) {
		throw new Error('Minimal satu dompet diperlukan untuk melakukan seed transaksi.');
	}

	const expenseCategories = categories.filter((c) => c.kind === 'expense');
	const incomeCategories = categories.filter((c) => c.kind === 'income');

	const now = options.endDate ?? new Date();
	const daysRange = 180; // 6 bulan ke belakang
	const transactions: Transaction[] = [];

	// Preset nominal realistis (dalam integer Rupiah)
	const expenseAmounts = [
		15000, 25000, 35000, 50000, 75000, 100000, 150000, 250000, 350000, 500000, 750000, 1200000
	];
	const incomeAmounts = [1500000, 2500000, 5000000, 7500000, 10000000];
	const transferAmounts = [50000, 100000, 200000, 300000, 500000, 1000000];
	const transferFees = [0, 2500, 6500];

	for (let i = 0; i < count; i++) {
		// Distribusi tanggal acak dalam rentang 180 hari
		const dayOffset = Math.floor(rnd() * daysRange);
		const txDate = subDays(now, dayOffset);
		const dateStr = format(txDate, 'yyyy-MM-dd');
		const timestamp = txDate.getTime() + (i % 86400000);

		// Distribusi jenis transaksi: ~65% expense, ~25% income, ~10% transfer
		const rand = rnd();
		const wallet = wallets[Math.floor(rnd() * wallets.length)];

		if (rand < 0.65) {
			// Expense
			const category =
				expenseCategories.length > 0
					? expenseCategories[Math.floor(rnd() * expenseCategories.length)]
					: null;
			const amount = expenseAmounts[Math.floor(rnd() * expenseAmounts.length)];

			transactions.push({
				id: ulid(),
				type: 'expense',
				amount,
				walletId: wallet.id,
				toWalletId: null,
				fee: 0,
				categoryId: category?.id ?? null,
				date: dateStr,
				note: `Pengeluaran simulasi #${i + 1}`,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: timestamp,
				updatedAt: timestamp,
				deletedAt: null
			});
		} else if (rand < 0.9) {
			// Income
			const category =
				incomeCategories.length > 0
					? incomeCategories[Math.floor(rnd() * incomeCategories.length)]
					: null;
			const amount = incomeAmounts[Math.floor(rnd() * incomeAmounts.length)];

			transactions.push({
				id: ulid(),
				type: 'income',
				amount,
				walletId: wallet.id,
				toWalletId: null,
				fee: 0,
				categoryId: category?.id ?? null,
				date: dateStr,
				note: `Pemasukan simulasi #${i + 1}`,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: timestamp,
				updatedAt: timestamp,
				deletedAt: null
			});
		} else {
			// Transfer (perlu minimal 2 dompet jika memungkinkan)
			let toWallet = wallets[Math.floor(rnd() * wallets.length)];
			if (toWallet.id === wallet.id && wallets.length > 1) {
				toWallet = wallets.find((w) => w.id !== wallet.id) || toWallet;
			}

			const amount = transferAmounts[Math.floor(rnd() * transferAmounts.length)];
			const fee = transferFees[Math.floor(rnd() * transferFees.length)];

			transactions.push({
				id: ulid(),
				type: 'transfer',
				amount,
				walletId: wallet.id,
				toWalletId: toWallet.id,
				fee,
				categoryId: null,
				date: dateStr,
				note: `Transfer simulasi #${i + 1}`,
				tagIds: [],
				attachmentId: null,
				recurringId: null,
				createdAt: timestamp,
				updatedAt: timestamp,
				deletedAt: null
			});
		}
	}

	return transactions;
}
