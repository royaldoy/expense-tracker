import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { RecurringFrequency, RecurringRule, Transaction, ULID } from '../../../domain/types';
import type { IRecurringRuleRepository } from '../types';

interface SqliteRecurringRuleRow {
	id: string;
	template: string;
	frequency: string;
	nextRunAt: string;
	autoPost: number;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function parseTemplate(
	templateStr: string
): Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> {
	try {
		return JSON.parse(templateStr);
	} catch {
		return {};
	}
}

function mapRowToRecurringRule(row: SqliteRecurringRuleRow): RecurringRule {
	const template = parseTemplate(row.template);

	return {
		id: row.id,
		template,
		frequency: row.frequency as RecurringFrequency,
		nextRunAt: row.nextRunAt,
		autoPost: row.autoPost === 1,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteRecurringRuleRepository implements IRecurringRuleRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<RecurringRule | undefined> {
		const rows = await this.driver.query<SqliteRecurringRuleRow>(
			'SELECT * FROM recurring_rules WHERE id = ?;',
			[id]
		);
		if (rows.length === 0) return undefined;
		return mapRowToRecurringRule(rows[0]);
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<RecurringRule[]> {
		let sql = 'SELECT * FROM recurring_rules';
		const params: unknown[] = [];
		if (!options?.includeDeleted) {
			sql += ' WHERE deletedAt IS NULL';
		}
		const rows = await this.driver.query<SqliteRecurringRuleRow>(sql, params);
		return rows.map(mapRowToRecurringRule);
	}

	async getDueRules(asOfDate: string): Promise<RecurringRule[]> {
		const targetDate = asOfDate.slice(0, 10);
		const rows = await this.driver.query<SqliteRecurringRuleRow>(
			'SELECT * FROM recurring_rules WHERE nextRunAt <= ? AND deletedAt IS NULL;',
			[targetDate]
		);
		return rows.map(mapRowToRecurringRule);
	}

	async create(
		rule: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<RecurringRule> {
		const now = Date.now();
		const id = ulid();
		const newRule: RecurringRule = {
			...rule,
			id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO recurring_rules (id, template, frequency, nextRunAt, autoPost, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				newRule.id,
				JSON.stringify(newRule.template),
				newRule.frequency,
				newRule.nextRunAt,
				newRule.autoPost ? 1 : 0,
				newRule.createdAt,
				newRule.updatedAt,
				newRule.deletedAt
			]
		);

		return newRule;
	}

	async update(
		id: ULID,
		updates: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>
	): Promise<RecurringRule> {
		const existing = await this.getById(id);
		if (!existing) {
			throw new Error(`Jadwal transaksi berulang dengan ID ${id} tidak ditemukan.`);
		}

		const updated: RecurringRule = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};

		await this.driver.execute(
			`UPDATE recurring_rules SET template = ?, frequency = ?, nextRunAt = ?, autoPost = ?, updatedAt = ?, deletedAt = ?
			 WHERE id = ?;`,
			[
				JSON.stringify(updated.template),
				updated.frequency,
				updated.nextRunAt,
				updated.autoPost ? 1 : 0,
				updated.updatedAt,
				updated.deletedAt,
				id
			]
		);

		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		await this.driver.execute(
			'UPDATE recurring_rules SET deletedAt = ?, updatedAt = ? WHERE id = ?;',
			[Date.now(), Date.now(), id]
		);
	}
}

export const sqliteRecurringRuleRepository = new SqliteRecurringRuleRepository();
