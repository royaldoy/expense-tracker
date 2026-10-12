import { ulid } from 'ulid';
import type { Budget, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { IBudgetRepository } from './types';

export class DexieBudgetRepository implements IBudgetRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<Budget | undefined> {
		const budget = await this.database.budgets.get(id);
		return budget?.deletedAt === null ? budget : undefined;
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Budget[]> {
		if (options?.includeDeleted) {
			return this.database.budgets.toArray();
		}
		return this.database.budgets.filter((b) => b.deletedAt === null).toArray();
	}

	async getByPeriod(period: string): Promise<Budget[]> {
		return this.database.budgets
			.where('period')
			.equals(period)
			.filter((b) => b.deletedAt === null)
			.toArray();
	}

	async getByCategoryAndPeriod(
		categoryId: ULID | null,
		period: string
	): Promise<Budget | undefined> {
		return this.database.budgets
			.filter((b) => b.categoryId === categoryId && b.period === period && b.deletedAt === null)
			.first();
	}

	async create(
		data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Budget> {
		const now = Date.now();
		const budget: Budget = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.budgets.add(budget);
		return budget;
	}

	async update(id: ULID, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget> {
		const existing = await this.database.budgets.get(id);
		if (!existing || existing.deletedAt !== null) {
			throw new Error(`Budget dengan ID ${id} tidak ditemukan.`);
		}
		const updated: Budget = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};
		await this.database.budgets.put(updated);
		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.budgets.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.budgets.put(existing);
	}
}

export const budgetRepository = new DexieBudgetRepository();
