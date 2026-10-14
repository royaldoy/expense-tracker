import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { Transaction, TransactionType, ULID } from '../../../domain/types';
import type { ITransactionRepository, TransactionFilterOptions } from '../types';

interface SqliteTransactionRow {
	id: string;
	type: string;
	amount: number;
	walletId: string;
	toWalletId: string | null;
	fee: number;
	categoryId: string | null;
	date: string;
	note: string | null;
	tagIds: string;
	attachmentId: string | null;
	recurringId: string | null;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function mapRowToTransaction(row: SqliteTransactionRow): Transaction {
	let tagIds: string[];
	try {
		tagIds = JSON.parse(row.tagIds || '[]');
	} catch {
		tagIds = [];
	}

	return {
		id: row.id,
		type: row.type as TransactionType,
		amount: row.amount,
		walletId: row.walletId,
		toWalletId: row.toWalletId,
		fee: row.fee,
		categoryId: row.categoryId,
		date: row.date,
		note: row.note,
		tagIds,
		attachmentId: row.attachmentId,
		recurringId: row.recurringId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteTransactionRepository implements ITransactionRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<Transaction | undefined> {
		const rows = await this.driver.query<SqliteTransactionRow>(
			'SELECT * FROM transactions WHERE id = ?;',
			[id]
		);
		if (rows.length === 0) return undefined;
		return mapRowToTransaction(rows[0]);
	}

	async getAllActive(): Promise<Transaction[]> {
		const rows = await this.driver.query<SqliteTransactionRow>(
			'SELECT * FROM transactions WHERE deletedAt IS NULL;'
		);
		return rows.map(mapRowToTransaction);
	}

	async getByWalletId(
		walletId: ULID,
		options?: { startDate?: string; endDate?: string }
	): Promise<Transaction[]> {
		const all = await this.getAllActive();
		return all.filter((tx) => {
			const isMatchWallet = tx.walletId === walletId || tx.toWalletId === walletId;
			if (!isMatchWallet) return false;
			if (options?.startDate && tx.date < options.startDate) return false;
			if (options?.endDate && tx.date > options.endDate) return false;
			return true;
		});
	}

	async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
		const all = await this.getAllActive();
		return all.filter((tx) => tx.date >= startDate && tx.date <= endDate);
	}

	async getByCategory(categoryId: ULID): Promise<Transaction[]> {
		const all = await this.getAllActive();
		return all.filter((tx) => tx.categoryId === categoryId);
	}

	async queryTransactions(filter: TransactionFilterOptions): Promise<Transaction[]> {
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

		let sql = `SELECT t.* FROM transactions t
			LEFT JOIN categories c ON t.categoryId = c.id
			WHERE t.deletedAt IS NULL`;
		const params: unknown[] = [];

		if (startDate) {
			sql += ' AND t.date >= ?';
			params.push(startDate);
		}
		if (endDate) {
			sql += ' AND t.date <= ?';
			params.push(endDate);
		}
		if (walletIds && walletIds.length > 0) {
			const placeholders = walletIds.map(() => '?').join(',');
			sql += ` AND (t.walletId IN (${placeholders}) OR t.toWalletId IN (${placeholders}))`;
			params.push(...walletIds, ...walletIds);
		}
		if (categoryIds && categoryIds.length > 0) {
			const placeholders = categoryIds.map(() => '?').join(',');
			sql += ` AND t.categoryId IN (${placeholders})`;
			params.push(...categoryIds);
		}
		if (types && types.length > 0) {
			const placeholders = types.map(() => '?').join(',');
			sql += ` AND t.type IN (${placeholders})`;
			params.push(...types);
		}
		if (minAmount !== undefined && minAmount !== null) {
			sql += ' AND t.amount >= ?';
			params.push(minAmount);
		}
		if (maxAmount !== undefined && maxAmount !== null) {
			sql += ' AND t.amount <= ?';
			params.push(maxAmount);
		}
		if (search && search.trim()) {
			const term = `%${search.trim().toLowerCase()}%`;
			sql += ' AND (LOWER(COALESCE(t.note, "")) LIKE ? OR LOWER(COALESCE(c.name, "")) LIKE ?)';
			params.push(term, term);
		}

		sql += ' ORDER BY t.date DESC, t.createdAt DESC;';

		const rows = await this.driver.query<SqliteTransactionRow>(sql, params);
		return rows.map(mapRowToTransaction);
	}

	async create(
		tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Transaction> {
		const now = Date.now();
		const id = ulid();
		const newTx: Transaction = {
			...tx,
			id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO transactions (id, type, amount, walletId, toWalletId, fee, categoryId, date, note, tagIds, attachmentId, recurringId, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				newTx.id,
				newTx.type,
				newTx.amount,
				newTx.walletId,
				newTx.toWalletId,
				newTx.fee,
				newTx.categoryId,
				newTx.date,
				newTx.note,
				JSON.stringify(newTx.tagIds ?? []),
				newTx.attachmentId,
				newTx.recurringId,
				newTx.createdAt,
				newTx.updatedAt,
				newTx.deletedAt
			]
		);

		return newTx;
	}

	async update(
		id: ULID,
		updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
	): Promise<Transaction> {
		const existing = await this.getById(id);
		if (!existing) {
			throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
		}

		const updated: Transaction = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};

		await this.driver.execute(
			`UPDATE transactions SET type = ?, amount = ?, walletId = ?, toWalletId = ?, fee = ?, categoryId = ?, date = ?, note = ?, tagIds = ?, attachmentId = ?, recurringId = ?, updatedAt = ?, deletedAt = ?
			 WHERE id = ?;`,
			[
				updated.type,
				updated.amount,
				updated.walletId,
				updated.toWalletId,
				updated.fee,
				updated.categoryId,
				updated.date,
				updated.note,
				JSON.stringify(updated.tagIds ?? []),
				updated.attachmentId,
				updated.recurringId,
				updated.updatedAt,
				updated.deletedAt,
				id
			]
		);

		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		await this.driver.execute(
			'UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ?;',
			[Date.now(), Date.now(), id]
		);
	}
}

export const sqliteTransactionRepository = new SqliteTransactionRepository();
