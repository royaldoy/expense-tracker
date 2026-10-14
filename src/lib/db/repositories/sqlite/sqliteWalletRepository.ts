import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { ULID, Wallet, WalletType } from '../../../domain/types';
import type { IWalletRepository } from '../types';

interface SqliteWalletRow {
	id: string;
	name: string;
	type: string;
	openingBalance: number;
	balance: number;
	color: string;
	icon: string;
	includeInTotal: number;
	archivedAt: number | null;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function mapRowToWallet(row: SqliteWalletRow): Wallet {
	return {
		id: row.id,
		name: row.name,
		type: row.type as WalletType,
		openingBalance: row.openingBalance,
		balance: row.balance,
		color: row.color,
		icon: row.icon,
		includeInTotal: Boolean(row.includeInTotal),
		archivedAt: row.archivedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteWalletRepository implements IWalletRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<Wallet | undefined> {
		const rows = await this.driver.query<SqliteWalletRow>('SELECT * FROM wallets WHERE id = ?;', [
			id
		]);
		if (rows.length === 0) return undefined;
		return mapRowToWallet(rows[0]);
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Wallet[]> {
		let sql = 'SELECT * FROM wallets';
		const params: unknown[] = [];
		if (!options?.includeDeleted) {
			sql += ' WHERE deletedAt IS NULL';
		}
		const rows = await this.driver.query<SqliteWalletRow>(sql, params);
		return rows.map(mapRowToWallet);
	}

	async getByType(type: WalletType): Promise<Wallet[]> {
		const rows = await this.driver.query<SqliteWalletRow>(
			'SELECT * FROM wallets WHERE type = ? AND deletedAt IS NULL;',
			[type]
		);
		return rows.map(mapRowToWallet);
	}

	async create(
		wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Wallet> {
		const now = Date.now();
		const id = ulid();
		const newWallet: Wallet = {
			...wallet,
			id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO wallets (id, name, type, openingBalance, balance, color, icon, includeInTotal, archivedAt, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				newWallet.id,
				newWallet.name,
				newWallet.type,
				newWallet.openingBalance,
				newWallet.balance,
				newWallet.color,
				newWallet.icon,
				newWallet.includeInTotal ? 1 : 0,
				newWallet.archivedAt,
				newWallet.createdAt,
				newWallet.updatedAt,
				newWallet.deletedAt
			]
		);

		return newWallet;
	}

	async update(id: ULID, updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>): Promise<Wallet> {
		const existing = await this.getById(id);
		if (!existing) {
			throw new Error(`Wallet dengan ID ${id} tidak ditemukan.`);
		}

		const updated: Wallet = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};

		await this.driver.execute(
			`UPDATE wallets SET name = ?, type = ?, openingBalance = ?, balance = ?, color = ?, icon = ?, includeInTotal = ?, archivedAt = ?, updatedAt = ?, deletedAt = ?
			 WHERE id = ?;`,
			[
				updated.name,
				updated.type,
				updated.openingBalance,
				updated.balance,
				updated.color,
				updated.icon,
				updated.includeInTotal ? 1 : 0,
				updated.archivedAt,
				updated.updatedAt,
				updated.deletedAt,
				id
			]
		);

		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		await this.driver.execute('UPDATE wallets SET deletedAt = ?, updatedAt = ? WHERE id = ?;', [
			Date.now(),
			Date.now(),
			id
		]);
	}
}

export const sqliteWalletRepository = new SqliteWalletRepository();
