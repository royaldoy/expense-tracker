import { ulid } from 'ulid';
import { calculateWalletBalances } from '../../domain/balance';
import type { Transaction, ULID, Wallet } from '../../domain/types';
import type {
	CreateTransactionDTO,
	TransferDTO,
	UpdateTransactionDTO
} from '../transactionService';
import { createSqliteDriver, type ISqliteDriver } from './connection';

export class SqliteTransactionService {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	/**
	 * Menambahkan transaksi baru dan memperbarui saldo wallet dalam satu transaksi SQLite atomik.
	 */
	async addTransaction(input: CreateTransactionDTO): Promise<Transaction> {
		return this.driver.runTransaction(async () => {
			const wallets = await this.driver.query<Wallet>('SELECT * FROM wallets WHERE id = ?;', [
				input.walletId
			]);
			const srcWallet = wallets[0];
			if (!srcWallet || srcWallet.deletedAt !== null) {
				throw new Error(`Dompet sumber dengan ID ${input.walletId} tidak ditemukan.`);
			}

			if (input.type === 'transfer') {
				if (!input.toWalletId) {
					throw new Error('Transfer memerlukan toWalletId (dompet tujuan).');
				}
				if (input.walletId === input.toWalletId) {
					throw new Error('Dompet sumber dan tujuan tidak boleh sama.');
				}
				const destWallets = await this.driver.query<Wallet>('SELECT * FROM wallets WHERE id = ?;', [
					input.toWalletId
				]);
				const destWallet = destWallets[0];
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

			// Insert transaksi
			await this.driver.execute(
				`INSERT INTO transactions (id, type, amount, walletId, toWalletId, fee, categoryId, date, note, tagIds, attachmentId, recurringId, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				[
					tx.id,
					tx.type,
					tx.amount,
					tx.walletId,
					tx.toWalletId,
					tx.fee,
					tx.categoryId,
					tx.date,
					tx.note,
					JSON.stringify(tx.tagIds),
					tx.attachmentId,
					tx.recurringId,
					tx.createdAt,
					tx.updatedAt,
					tx.deletedAt
				]
			);

			// Mutasi saldo
			if (tx.type === 'income') {
				await this.driver.execute(
					'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
					[tx.amount, now, tx.walletId]
				);
			} else if (tx.type === 'expense') {
				await this.driver.execute(
					'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
					[tx.amount, now, tx.walletId]
				);
			} else if (tx.type === 'transfer' && tx.toWalletId) {
				await this.driver.execute(
					'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
					[tx.amount + tx.fee, now, tx.walletId]
				);
				await this.driver.execute(
					'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
					[tx.amount, now, tx.toWalletId]
				);
			}

			return tx;
		});
	}

	/**
	 * Memperbarui transaksi dan menyinkronkan saldo dompet terkait secara atomik.
	 */
	async updateTransaction(id: ULID, input: UpdateTransactionDTO): Promise<Transaction> {
		return this.driver.runTransaction(async () => {
			const existingTxs = await this.driver.query<Transaction>(
				'SELECT * FROM transactions WHERE id = ?;',
				[id]
			);
			const oldTx = existingTxs[0];
			if (!oldTx || oldTx.deletedAt !== null) {
				throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
			}

			const now = Date.now();
			const updatedTx: Transaction = {
				...oldTx,
				...input,
				updatedAt: now
			};

			// Revert mutasi lama
			await this.revertBalanceMutation(oldTx);

			// Terapkan mutasi baru
			await this.applyBalanceMutation(updatedTx);

			await this.driver.execute(
				`UPDATE transactions SET type = ?, amount = ?, walletId = ?, toWalletId = ?, fee = ?, categoryId = ?, date = ?, note = ?, tagIds = ?, attachmentId = ?, recurringId = ?, updatedAt = ?
				 WHERE id = ?;`,
				[
					updatedTx.type,
					updatedTx.amount,
					updatedTx.walletId,
					updatedTx.toWalletId,
					updatedTx.fee,
					updatedTx.categoryId,
					updatedTx.date,
					updatedTx.note,
					JSON.stringify(updatedTx.tagIds ?? []),
					updatedTx.attachmentId,
					updatedTx.recurringId,
					updatedTx.updatedAt,
					id
				]
			);

			return updatedTx;
		});
	}

	/**
	 * Soft delete transaksi dan pulihkan saldo dompet terkait.
	 */
	async deleteTransaction(id: ULID): Promise<void> {
		return this.driver.runTransaction(async () => {
			const existingTxs = await this.driver.query<Transaction>(
				'SELECT * FROM transactions WHERE id = ?;',
				[id]
			);
			const tx = existingTxs[0];
			if (!tx || tx.deletedAt !== null) {
				throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
			}

			await this.revertBalanceMutation(tx);

			const now = Date.now();
			await this.driver.execute(
				'UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ?;',
				[now, now, id]
			);
		});
	}

	/**
	 * Transfer antar dompet sebagai satu entitas transaksi atomik.
	 */
	async transfer(dto: TransferDTO): Promise<Transaction> {
		return this.addTransaction({
			walletId: dto.walletId,
			toWalletId: dto.toWalletId,
			type: 'transfer',
			amount: dto.amount,
			fee: dto.fee ?? 0,
			date: dto.date,
			note: dto.note ?? null,
			tagIds: dto.tagIds ?? [],
			attachmentId: dto.attachmentId ?? null
		});
	}

	/**
	 * Membangun ulang seluruh cache saldo dompet dari data transaksi aktif.
	 */
	async rebuildBalances(): Promise<Map<ULID, number>> {
		return this.driver.runTransaction(async () => {
			const wallets = await this.driver.query<Wallet>('SELECT * FROM wallets;');
			const transactions = await this.driver.query<Transaction>(
				'SELECT * FROM transactions WHERE deletedAt IS NULL;'
			);

			const newBalances = calculateWalletBalances(wallets, transactions);
			const now = Date.now();

			for (const wallet of wallets) {
				const correctBalance = newBalances.get(wallet.id) ?? wallet.openingBalance;
				await this.driver.execute('UPDATE wallets SET balance = ?, updatedAt = ? WHERE id = ?;', [
					correctBalance,
					now,
					wallet.id
				]);
			}

			return newBalances;
		});
	}

	private async revertBalanceMutation(tx: Transaction): Promise<void> {
		const now = Date.now();
		if (tx.type === 'income') {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.walletId]
			);
		} else if (tx.type === 'expense') {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.walletId]
			);
		} else if (tx.type === 'transfer' && tx.toWalletId) {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
				[tx.amount + tx.fee, now, tx.walletId]
			);
			await this.driver.execute(
				'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.toWalletId]
			);
		}
	}

	private async applyBalanceMutation(tx: Transaction): Promise<void> {
		const now = Date.now();
		if (tx.type === 'income') {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.walletId]
			);
		} else if (tx.type === 'expense') {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.walletId]
			);
		} else if (tx.type === 'transfer' && tx.toWalletId) {
			await this.driver.execute(
				'UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ?;',
				[tx.amount + tx.fee, now, tx.walletId]
			);
			await this.driver.execute(
				'UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ?;',
				[tx.amount, now, tx.toWalletId]
			);
		}
	}
}

export const sqliteTransactionService = new SqliteTransactionService();
