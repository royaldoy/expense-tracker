import { ulid } from 'ulid';
import type { Transaction, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { ITransactionRepository } from './types';

export class DexieTransactionRepository implements ITransactionRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<Transaction | undefined> {
		const tx = await this.database.transactions.get(id);
		return tx?.deletedAt === null ? tx : undefined;
	}

	async getAllActive(): Promise<Transaction[]> {
		return this.database.transactions.filter((tx) => tx.deletedAt === null).toArray();
	}

	async getByWalletId(
		walletId: ULID,
		options?: { startDate?: string; endDate?: string }
	): Promise<Transaction[]> {
		if (options?.startDate && options?.endDate) {
			return this.database.transactions
				.where('[walletId+date]')
				.between([walletId, options.startDate], [walletId, options.endDate], true, true)
				.filter((tx) => tx.deletedAt === null)
				.toArray();
		}

		return this.database.transactions
			.where('walletId')
			.equals(walletId)
			.or('toWalletId')
			.equals(walletId)
			.filter((tx) => tx.deletedAt === null)
			.toArray();
	}

	async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
		return this.database.transactions
			.where('date')
			.between(startDate, endDate, true, true)
			.filter((tx) => tx.deletedAt === null)
			.toArray();
	}

	async getByCategory(categoryId: ULID): Promise<Transaction[]> {
		return this.database.transactions
			.where('categoryId')
			.equals(categoryId)
			.filter((tx) => tx.deletedAt === null)
			.toArray();
	}

	async create(
		data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Transaction> {
		const now = Date.now();
		const tx: Transaction = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.transactions.add(tx);
		return tx;
	}

	async update(
		id: ULID,
		updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
	): Promise<Transaction> {
		const existing = await this.database.transactions.get(id);
		if (!existing || existing.deletedAt !== null) {
			throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
		}
		const updated: Transaction = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};
		await this.database.transactions.put(updated);
		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.transactions.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.transactions.put(existing);
	}
}

export const transactionRepository = new DexieTransactionRepository();
