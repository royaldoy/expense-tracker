import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { ISettingRepository } from '../types';

interface SqliteSettingRow {
	id: string;
	key: string;
	value: string;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

export class SqliteSettingRepository implements ISettingRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async get<T = unknown>(key: string): Promise<T | null> {
		const rows = await this.driver.query<SqliteSettingRow>(
			'SELECT * FROM settings WHERE key = ?;',
			[key]
		);
		if (rows.length === 0) return null;
		try {
			return JSON.parse(rows[0].value) as T;
		} catch {
			return rows[0].value as unknown as T;
		}
	}

	async set<T = unknown>(key: string, value: T): Promise<void> {
		const existingRows = await this.driver.query<SqliteSettingRow>(
			'SELECT * FROM settings WHERE key = ?;',
			[key]
		);
		const serialized = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
		const now = Date.now();

		if (existingRows.length > 0) {
			await this.driver.execute('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?;', [
				serialized,
				now,
				key
			]);
		} else {
			await this.driver.execute(
				'INSERT INTO settings (id, key, value, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?);',
				[ulid(), key, serialized, now, now, null]
			);
		}
	}

	async delete(key: string): Promise<void> {
		await this.driver.execute('DELETE FROM settings WHERE key = ?;', [key]);
	}
}

export const sqliteSettingRepository = new SqliteSettingRepository();
