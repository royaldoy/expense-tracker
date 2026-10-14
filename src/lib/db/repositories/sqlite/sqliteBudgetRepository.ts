import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { Budget, ULID } from '../../../domain/types';
import type { IBudgetRepository } from '../types';

interface SqliteBudgetRow {
	id: string;
	categoryId: string | null;
	period: string;
	limit_amount: number;
	alertAt: number;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function mapRowToBudget(row: SqliteBudgetRow): Budget {
	return {
		id: row.id,
		categoryId: row.categoryId,
		period: row.period,
		limit: row.limit_amount,
		alertAt: row.alertAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteBudgetRepository implements IBudgetRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<Budget | undefined> {
		const rows = await this.driver.query<SqliteBudgetRow>('SELECT * FROM budgets WHERE id = ?;', [
			id
		]);
		if (rows.length === 0) return undefined;
		return mapRowToBudget(rows[0]);
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Budget[]> {
		let sql = 'SELECT * FROM budgets';
		const params: unknown[] = [];
		if (!options?.includeDeleted) {
			sql += ' WHERE deletedAt IS NULL';
		}
		const rows = await this.driver.query<SqliteBudgetRow>(sql, params);
		return rows.map(mapRowToBudget);
	}

	async getByPeriod(period: string): Promise<Budget[]> {
		const rows = await this.driver.query<SqliteBudgetRow>(
			'SELECT * FROM budgets WHERE period = ? AND deletedAt IS NULL;',
			[period]
		);
		return rows.map(mapRowToBudget);
	}

	async getByCategoryAndPeriod(
		categoryId: ULID | null,
		period: string
	): Promise<Budget | undefined> {
		let sql = 'SELECT * FROM budgets WHERE period = ? AND deletedAt IS NULL';
		const params: unknown[] = [period];
		if (categoryId === null) {
			sql += ' AND categoryId IS NULL';
		} else {
			sql += ' AND categoryId = ?';
			params.push(categoryId);
		}
		const rows = await this.driver.query<SqliteBudgetRow>(sql, params);
		if (rows.length === 0) return undefined;
		return mapRowToBudget(rows[0]);
	}

	async create(
		budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Budget> {
		const now = Date.now();
		const id = ulid();
		const newBudget: Budget = {
			...budget,
			id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO budgets (id, categoryId, period, limit_amount, alertAt, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				newBudget.id,
				newBudget.categoryId,
				newBudget.period,
				newBudget.limit,
				newBudget.alertAt,
				newBudget.createdAt,
				newBudget.updatedAt,
				newBudget.deletedAt
			]
		);

		return newBudget;
	}

	async update(id: ULID, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget> {
		const existing = await this.getById(id);
		if (!existing) {
			throw new Error(`Anggaran dengan ID ${id} tidak ditemukan.`);
		}

		const updated: Budget = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};

		await this.driver.execute(
			`UPDATE budgets SET categoryId = ?, period = ?, limit_amount = ?, alertAt = ?, updatedAt = ?, deletedAt = ?
			 WHERE id = ?;`,
			[
				updated.categoryId,
				updated.period,
				updated.limit,
				updated.alertAt,
				updated.updatedAt,
				updated.deletedAt,
				id
			]
		);

		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		await this.driver.execute('UPDATE budgets SET deletedAt = ?, updatedAt = ? WHERE id = ?;', [
			Date.now(),
			Date.now(),
			id
		]);
	}
}

export const sqliteBudgetRepository = new SqliteBudgetRepository();
