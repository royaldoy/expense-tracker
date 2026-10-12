import { ulid } from 'ulid';
import { calculateWalletBalances } from '../domain/balance';
import type { Transaction, ULID, Wallet } from '../domain/types';
import { db, MoneyTrackerDatabase } from './schema';

export interface CreateTransactionDTO {
	walletId: ULID;
	type: 'income' | 'expense' | 'transfer';
	amount: number;
	toWalletId?: ULID | null;
	fee?: number;
	categoryId?: ULID | null;
	date: string;
	note?: string | null;
	tagIds?: string[];
	attachmentId?: ULID | null;
	recurringId?: ULID | null;
}

export interface UpdateTransactionDTO {
	walletId?: ULID;
	type?: 'income' | 'expense' | 'transfer';
	amount?: number;
	toWalletId?: ULID | null;
	fee?: number;
	categoryId?: ULID | null;
	date?: string;
	note?: string | null;
	tagIds?: string[];
	attachmentId?: ULID | null;
	recurringId?: ULID | null;
}

export interface TransferDTO {
	walletId: ULID;
	toWalletId: ULID;
	amount: number;
	fee?: number;
	date: string;
	note?: string | null;
	tagIds?: string[];
	attachmentId?: ULID | null;
}

export class TransactionService {
	constructor(private database: MoneyTrackerDatabase = db) {}

	/**
	 * Menambahkan transaksi baru dan memperbarui cache saldo wallet dalam SATU transaksi DB atomik.
	 */
	async addTransaction(input: CreateTransactionDTO): Promise<Transaction> {
		return this.database.transaction(
			'rw',
			[this.database.wallets, this.database.transactions],
			async () => {
				const srcWallet = await this.database.wallets.get(input.walletId);
				if (!srcWallet || srcWallet.deletedAt !== null) {
					throw new Error(`Dompet sumber dengan ID ${input.walletId} tidak ditemukan.`);
				}

				let destWallet: Wallet | undefined;
				if (input.type === 'transfer') {
					if (!input.toWalletId) {
						throw new Error('Transfer memerlukan toWalletId (dompet tujuan).');
					}
					if (input.walletId === input.toWalletId) {
						throw new Error('Dompet sumber dan tujuan tidak boleh sama.');
					}
					destWallet = await this.database.wallets.get(input.toWalletId);
					if (!destWallet || destWallet.deletedAt !== null) {
						throw new Error(`Dompet tujuan dengan ID ${input.toWalletId} tidak ditemukan.`);
					}
				}

				const now = Date.now();
				const amount = Math.round(input.amount);
				const fee = Math.round(input.fee ?? 0);

				const tx: Transaction = {
					id: ulid(),
					type: input.type,
					amount,
					walletId: input.walletId,
					toWalletId: input.toWalletId ?? null,
					fee,
					categoryId: input.categoryId ?? null,
					date: input.date,
					note: input.note ?? null,
					tagIds: input.tagIds ?? [],
					attachmentId: input.attachmentId ?? null,
					recurringId: input.recurringId ?? null,
					createdAt: now,
					updatedAt: now,
					deletedAt: null
				};

				// Perbarui cache saldo
				if (tx.type === 'income') {
					srcWallet.balance += tx.amount;
				} else if (tx.type === 'expense') {
					srcWallet.balance -= tx.amount;
				} else if (tx.type === 'transfer') {
					srcWallet.balance -= tx.amount + tx.fee;
					if (destWallet) {
						destWallet.balance += tx.amount;
						destWallet.updatedAt = now;
						await this.database.wallets.put(destWallet);
					}
				}

				srcWallet.updatedAt = now;
				await this.database.wallets.put(srcWallet);
				await this.database.transactions.add(tx);

				return tx;
			}
		);
	}

	/**
	 * Melakukan transfer antar dompet (helper berorientasi use-case).
	 */
	async transfer(input: TransferDTO): Promise<Transaction> {
		return this.addTransaction({
			...input,
			type: 'transfer'
		});
	}

	/**
	 * Memperbarui transaksi yang ada: me-rollback dampak saldo lama dan menerapkan dampak baru secara atomik.
	 */
	async updateTransaction(id: ULID, input: UpdateTransactionDTO): Promise<Transaction> {
		return this.database.transaction(
			'rw',
			[this.database.wallets, this.database.transactions],
			async () => {
				const oldTx = await this.database.transactions.get(id);
				if (!oldTx || oldTx.deletedAt !== null) {
					throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
				}

				const now = Date.now();

				// 1. Rollback dampak saldo lama dari oldTx
				const oldSrcWallet = await this.database.wallets.get(oldTx.walletId);
				if (oldSrcWallet) {
					if (oldTx.type === 'income') {
						oldSrcWallet.balance -= oldTx.amount;
					} else if (oldTx.type === 'expense') {
						oldSrcWallet.balance += oldTx.amount;
					} else if (oldTx.type === 'transfer') {
						oldSrcWallet.balance += oldTx.amount + oldTx.fee;
					}
					oldSrcWallet.updatedAt = now;
					await this.database.wallets.put(oldSrcWallet);
				}

				if (oldTx.type === 'transfer' && oldTx.toWalletId) {
					const oldDestWallet = await this.database.wallets.get(oldTx.toWalletId);
					if (oldDestWallet) {
						oldDestWallet.balance -= oldTx.amount;
						oldDestWallet.updatedAt = now;
						await this.database.wallets.put(oldDestWallet);
					}
				}

				// 2. Siapkan data transaksi baru
				const updatedTx: Transaction = {
					...oldTx,
					...input,
					amount: input.amount !== undefined ? Math.round(input.amount) : oldTx.amount,
					fee: input.fee !== undefined ? Math.round(input.fee) : oldTx.fee,
					updatedAt: now
				};

				// 3. Terapkan dampak saldo baru dari updatedTx
				const newSrcWallet =
					updatedTx.walletId === oldTx.walletId && oldSrcWallet
						? oldSrcWallet
						: await this.database.wallets.get(updatedTx.walletId);

				if (!newSrcWallet || newSrcWallet.deletedAt !== null) {
					throw new Error(`Dompet sumber baru (${updatedTx.walletId}) tidak valid.`);
				}

				let newDestWallet: Wallet | undefined;
				if (updatedTx.type === 'transfer') {
					if (!updatedTx.toWalletId) {
						throw new Error('Transfer memerlukan toWalletId.');
					}
					if (updatedTx.walletId === updatedTx.toWalletId) {
						throw new Error('Dompet sumber dan tujuan tidak boleh sama.');
					}
					newDestWallet =
						updatedTx.toWalletId === oldTx.toWalletId && oldTx.type === 'transfer'
							? await this.database.wallets.get(updatedTx.toWalletId)
							: await this.database.wallets.get(updatedTx.toWalletId);

					if (!newDestWallet || newDestWallet.deletedAt !== null) {
						throw new Error(`Dompet tujuan baru (${updatedTx.toWalletId}) tidak ditemukan.`);
					}
				}

				if (updatedTx.type === 'income') {
					newSrcWallet.balance += updatedTx.amount;
				} else if (updatedTx.type === 'expense') {
					newSrcWallet.balance -= updatedTx.amount;
				} else if (updatedTx.type === 'transfer') {
					newSrcWallet.balance -= updatedTx.amount + updatedTx.fee;
					if (newDestWallet) {
						newDestWallet.balance += updatedTx.amount;
						newDestWallet.updatedAt = now;
						await this.database.wallets.put(newDestWallet);
					}
				}

				newSrcWallet.updatedAt = now;
				await this.database.wallets.put(newSrcWallet);
				await this.database.transactions.put(updatedTx);

				return updatedTx;
			}
		);
	}

	/**
	 * Soft delete transaksi dan mengembalikan saldo dompet dalam SATU transaksi DB atomik.
	 */
	async deleteTransaction(id: ULID): Promise<void> {
		return this.database.transaction(
			'rw',
			[this.database.wallets, this.database.transactions],
			async () => {
				const tx = await this.database.transactions.get(id);
				if (!tx || tx.deletedAt !== null) {
					return;
				}

				const now = Date.now();
				const srcWallet = await this.database.wallets.get(tx.walletId);

				if (srcWallet) {
					if (tx.type === 'income') {
						srcWallet.balance -= tx.amount;
					} else if (tx.type === 'expense') {
						srcWallet.balance += tx.amount;
					} else if (tx.type === 'transfer') {
						srcWallet.balance += tx.amount + tx.fee;
					}
					srcWallet.updatedAt = now;
					await this.database.wallets.put(srcWallet);
				}

				if (tx.type === 'transfer' && tx.toWalletId) {
					const destWallet = await this.database.wallets.get(tx.toWalletId);
					if (destWallet) {
						destWallet.balance -= tx.amount;
						destWallet.updatedAt = now;
						await this.database.wallets.put(destWallet);
					}
				}

				tx.deletedAt = now;
				tx.updatedAt = now;
				await this.database.transactions.put(tx);
			}
		);
	}

	/**
	 * Menghitung ulang seluruh saldo dompet dari openingBalance dan transaksi aktif,
	 * lalu memperbarui cache wallets.balance dalam SATU transaksi DB.
	 */
	async rebuildBalances(): Promise<Map<string, number>> {
		return this.database.transaction(
			'rw',
			[this.database.wallets, this.database.transactions],
			async () => {
				const wallets = await this.database.wallets.toArray();
				const transactions = await this.database.transactions
					.filter((tx) => tx.deletedAt === null)
					.toArray();

				const calculatedBalances = calculateWalletBalances(wallets, transactions);
				const now = Date.now();

				for (const wallet of wallets) {
					const freshBalance = calculatedBalances.get(wallet.id) ?? wallet.openingBalance;
					if (wallet.balance !== freshBalance) {
						wallet.balance = freshBalance;
						wallet.updatedAt = now;
						await this.database.wallets.put(wallet);
					}
				}

				return calculatedBalances;
			}
		);
	}
}

export const transactionService = new TransactionService();
