import { ulid } from 'ulid';
import type { Transaction, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { ITransactionRepository, TransactionFilterOptions } from './types';

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

	async queryTransactions(filter: TransactionFilterOptions): Promise<Transaction[]> {
		// 1. Normalisasi filter
		const walletIds =
			filter.walletIds && filter.walletIds.length > 0
				? filter.walletIds
				: filter.walletId
					? [filter.walletId]
					: undefined;

		const categoryIds =
			filter.categoryIds && filter.categoryIds.length > 0
				? filter.categoryIds
				: filter.categoryId
					? [filter.categoryId]
					: undefined;

		const types =
			filter.types && filter.types.length > 0
				? filter.types
				: filter.type
					? [filter.type]
					: undefined;

		const { startDate, endDate, minAmount, maxAmount, search } = filter;

		// 2. Jika ada teks pencarian, cari kategori yang namanya cocok
		let matchingCategoryIds: Set<string> | null = null;
		const searchLower = search?.trim().toLowerCase();
		if (searchLower) {
			const matchingCategories = await this.database.categories
				.filter((c) => c.deletedAt === null && c.name.toLowerCase().includes(searchLower))
				.toArray();
			matchingCategoryIds = new Set(matchingCategories.map((c) => c.id));
		}

		// 3. Strategi Index Selection
		let items: Transaction[];

		if (startDate && endDate) {
			// Rentang tanggal penuh -> index 'date'
			items = await this.database.transactions
				.where('date')
				.between(startDate, endDate, true, true)
				.toArray();
		} else if (startDate) {
			// Hanya tanggal awal -> index 'date'
			items = await this.database.transactions.where('date').aboveOrEqual(startDate).toArray();
		} else if (endDate) {
			// Hanya tanggal akhir -> index 'date'
			items = await this.database.transactions.where('date').belowOrEqual(endDate).toArray();
		} else if (walletIds && walletIds.length === 1) {
			// Single wallet tanpa tanggal -> index 'walletId'
			const wid = walletIds[0];
			items = await this.database.transactions
				.where('walletId')
				.equals(wid)
				.or('toWalletId')
				.equals(wid)
				.toArray();
		} else if (categoryIds && categoryIds.length > 0) {
			// Index 'categoryId' via anyOf
			items = await this.database.transactions.where('categoryId').anyOf(categoryIds).toArray();
		} else if (types && types.length > 0) {
			// Index 'type' via anyOf
			items = await this.database.transactions.where('type').anyOf(types).toArray();
		} else if (walletIds && walletIds.length > 0) {
			// Index 'walletId' / 'toWalletId' via anyOf
			items = await this.database.transactions
				.where('walletId')
				.anyOf(walletIds)
				.or('toWalletId')
				.anyOf(walletIds)
				.toArray();
		} else {
			// Fallback: Query semua aktif
			items = await this.database.transactions.filter((tx) => tx.deletedAt === null).toArray();
		}

		// 4. Saring sisa kriteria di memori
		const result = items.filter((tx) => {
			if (tx.deletedAt !== null) return false;

			// Filter walletIds
			if (walletIds && walletIds.length > 0) {
				const isSource = walletIds.includes(tx.walletId);
				const isDest = tx.toWalletId ? walletIds.includes(tx.toWalletId) : false;
				if (!isSource && !isDest) return false;
			}

			// Filter categoryIds
			if (categoryIds && categoryIds.length > 0) {
				if (!tx.categoryId || !categoryIds.includes(tx.categoryId)) return false;
			}

			// Filter types
			if (types && types.length > 0) {
				if (!types.includes(tx.type)) return false;
			}

			// Filter rentang nominal
			if (minAmount !== undefined && minAmount !== null && tx.amount < minAmount) {
				return false;
			}
			if (maxAmount !== undefined && maxAmount !== null && tx.amount > maxAmount) {
				return false;
			}

			// Filter pencarian teks (catatan atau nama kategori)
			if (searchLower) {
				const noteMatch = tx.note ? tx.note.toLowerCase().includes(searchLower) : false;
				const categoryMatch = tx.categoryId
					? (matchingCategoryIds?.has(tx.categoryId) ?? false)
					: false;
				if (!noteMatch && !categoryMatch) return false;
			}

			return true;
		});

		// 5. Urutkan date DESC, createdAt DESC
		result.sort((a, b) => {
			const dateCmp = b.date.localeCompare(a.date);
			if (dateCmp !== 0) return dateCmp;
			return b.createdAt - a.createdAt;
		});

		return result;
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
