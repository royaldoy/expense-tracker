import * as v from 'valibot';
import { DEFAULT_CATEGORIES, SYSTEM_CATEGORY_ADJUSTMENT } from '../domain/defaultCategories';
import type { Category, CategoryKind, ULID } from '../domain/types';
import { categoryRepository } from '../db/repositories';
import type { ICategoryRepository } from '../db/repositories/types';
import {
	type CategoryInput,
	type UpdateCategoryInput,
	CategoryInputSchema,
	UpdateCategoryInputSchema
} from './schemas';

export interface CategoryWithChildren extends Category {
	subcategories: Category[];
}

export class CategoryService {
	constructor(private repository: ICategoryRepository = categoryRepository) {}

	async getCategories(kind?: CategoryKind): Promise<Category[]> {
		if (kind) {
			return this.repository.getByKind(kind);
		}
		return this.repository.getAll();
	}

	async getCategoriesWithSubcategories(kind?: CategoryKind): Promise<CategoryWithChildren[]> {
		const all = await this.getCategories(kind);
		const parents = all.filter((c) => c.parentId === null);

		return parents.map((parent) => ({
			...parent,
			subcategories: all.filter((c) => c.parentId === parent.id)
		}));
	}

	async getCategoryById(id: ULID): Promise<Category | undefined> {
		return this.repository.getById(id);
	}

	async createCategory(input: CategoryInput): Promise<Category> {
		const parsed = v.parse(CategoryInputSchema, input);
		return this.repository.create({
			name: parsed.name,
			kind: parsed.kind,
			parentId: parsed.parentId,
			icon: parsed.icon,
			color: parsed.color,
			order: parsed.order
		});
	}

	async updateCategory(id: ULID, input: UpdateCategoryInput): Promise<Category> {
		const parsed = v.parse(UpdateCategoryInputSchema, input);
		return this.repository.update(id, parsed);
	}

	async deleteCategory(id: ULID): Promise<void> {
		const category = await this.repository.getById(id);
		if (category?.isSystem) {
			throw new Error('Kategori sistem tidak dapat dihapus.');
		}
		return this.repository.softDelete(id);
	}

	/**
	 * Mendapatkan atau membuat kategori sistem untuk koreksi saldo dompet.
	 */
	async getOrCreateSystemAdjustmentCategory(kind: CategoryKind): Promise<Category> {
		const all = await this.repository.getByKind(kind);
		const found = all.find(
			(c) => c.name === SYSTEM_CATEGORY_ADJUSTMENT && c.isSystem === true && c.parentId === null
		);
		if (found) {
			return found;
		}

		return this.repository.create({
			name: SYSTEM_CATEGORY_ADJUSTMENT,
			kind,
			parentId: null,
			icon: 'tune',
			color: '#717786',
			order: 999,
			isSystem: true
		});
	}

	/**
	 * Menginisialisasi kategori default jika belum ada kategori sama sekali.
	 */
	async initDefaultCategories(): Promise<void> {
		const existing = await this.repository.getAll();
		if (existing.length > 0) {
			return;
		}

		let order = 1;
		for (const def of DEFAULT_CATEGORIES) {
			const parent = await this.repository.create({
				name: def.name,
				kind: def.kind,
				parentId: null,
				icon: def.icon,
				color: def.color,
				order: order++
			});

			if (def.subcategories && def.subcategories.length > 0) {
				let subOrder = 1;
				for (const sub of def.subcategories) {
					await this.repository.create({
						name: sub.name,
						kind: def.kind,
						parentId: parent.id,
						icon: sub.icon,
						color: def.color,
						order: subOrder++
					});
				}
			}
		}
	}
}

export const categoryService = new CategoryService();
