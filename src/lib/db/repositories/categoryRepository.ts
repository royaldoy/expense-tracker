import { ulid } from 'ulid';
import type { Category, CategoryKind, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { ICategoryRepository } from './types';

export class DexieCategoryRepository implements ICategoryRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<Category | undefined> {
		const category = await this.database.categories.get(id);
		return category?.deletedAt === null ? category : undefined;
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Category[]> {
		if (options?.includeDeleted) {
			return this.database.categories.toArray();
		}
		return this.database.categories.filter((c) => c.deletedAt === null).sortBy('order');
	}

	async getByKind(kind: CategoryKind): Promise<Category[]> {
		return this.database.categories
			.where('kind')
			.equals(kind)
			.filter((c) => c.deletedAt === null)
			.sortBy('order');
	}

	async create(
		data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Category> {
		const now = Date.now();
		const category: Category = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.categories.add(category);
		return category;
	}

	async update(id: ULID, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category> {
		const existing = await this.database.categories.get(id);
		if (!existing || existing.deletedAt !== null) {
			throw new Error(`Kategori dengan ID ${id} tidak ditemukan.`);
		}
		const updated: Category = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};
		await this.database.categories.put(updated);
		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.categories.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.categories.put(existing);
	}
}

export const categoryRepository = new DexieCategoryRepository();
