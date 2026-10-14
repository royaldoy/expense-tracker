import { ulid } from 'ulid';
import type { RecurringRule, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { IRecurringRuleRepository } from './types';

export class DexieRecurringRuleRepository implements IRecurringRuleRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<RecurringRule | undefined> {
		const rule = await this.database.recurringRules.get(id);
		return rule?.deletedAt === null ? rule : undefined;
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<RecurringRule[]> {
		if (options?.includeDeleted) {
			return this.database.recurringRules.toArray();
		}
		return this.database.recurringRules.filter((r) => r.deletedAt === null).toArray();
	}

	async getDueRules(asOfDate: string): Promise<RecurringRule[]> {
		const targetDate = asOfDate.slice(0, 10);
		return this.database.recurringRules
			.filter((r) => r.deletedAt === null && r.nextRunAt.slice(0, 10) <= targetDate)
			.toArray();
	}

	async create(
		data: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<RecurringRule> {
		const now = Date.now();
		const rule: RecurringRule = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.recurringRules.add(rule);
		return rule;
	}

	async update(
		id: ULID,
		updates: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>
	): Promise<RecurringRule> {
		const existing = await this.database.recurringRules.get(id);
		if (!existing || existing.deletedAt !== null) {
			throw new Error(`Jadwal transaksi berulang dengan ID ${id} tidak ditemukan.`);
		}
		const updated: RecurringRule = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};
		await this.database.recurringRules.put(updated);
		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.recurringRules.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.recurringRules.put(existing);
	}
}

export const recurringRuleRepository = new DexieRecurringRuleRepository();
