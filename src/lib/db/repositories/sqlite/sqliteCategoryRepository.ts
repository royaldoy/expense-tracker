import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { Category, CategoryKind, ULID } from '../../../domain/types';
import type { ICategoryRepository } from '../types';

interface SqliteCategoryRow {
	id: string;
	name: string;
	kind: string;
	parentId: string | null;
	icon: string;
	color: string;
	display_order: number;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function mapRowToCategory(row: SqliteCategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		kind: row.kind as CategoryKind,
		parentId: row.parentId,
		icon: row.icon,
		color: row.color,
		order: row.display_order,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteCategoryRepository implements ICategoryRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<Category | undefined> {
		const rows = await this.driver.query<SqliteCategoryRow>(
			'SELECT * FROM categories WHERE id = ?;',
			[id]
		);
		if (rows.length === 0) return undefined;
		return mapRowToCategory(rows[0]);
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Category[]> {
		let sql = 'SELECT * FROM categories';
		const params: unknown[] = [];
		if (!options?.includeDeleted) {
			sql += ' WHERE deletedAt IS NULL';
		}
		const rows = await this.driver.query<SqliteCategoryRow>(sql, params);
		return rows.map(mapRowToCategory).sort((a, b) => a.order - b.order);
	}

	async getByType(type: CategoryKind): Promise<Category[]> {
		return this.getByKind(type);
	}

	async getByKind(kind: CategoryKind): Promise<Category[]> {
		const rows = await this.driver.query<SqliteCategoryRow>(
			'SELECT * FROM categories WHERE kind = ? AND deletedAt IS NULL;',
			[kind]
		);
		return rows.map(mapRowToCategory).sort((a, b) => a.order - b.order);
	}

	async create(
		category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Category> {
		const now = Date.now();
		const id = ulid();
		const newCategory: Category = {
			...category,
			id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO categories (id, name, kind, parentId, icon, color, display_order, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				newCategory.id,
				newCategory.name,
				newCategory.kind,
				newCategory.parentId,
				newCategory.icon,
				newCategory.color,
				newCategory.order,
				newCategory.createdAt,
				newCategory.updatedAt,
				newCategory.deletedAt
			]
		);

		return newCategory;
	}

	async update(id: ULID, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category> {
		const existing = await this.getById(id);
		if (!existing) {
			throw new Error(`Category dengan ID ${id} tidak ditemukan.`);
		}

		const updated: Category = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};

		await this.driver.execute(
			`UPDATE categories SET name = ?, kind = ?, parentId = ?, icon = ?, color = ?, display_order = ?, updatedAt = ?, deletedAt = ?
			 WHERE id = ?;`,
			[
				updated.name,
				updated.kind,
				updated.parentId,
				updated.icon,
				updated.color,
				updated.order,
				updated.updatedAt,
				updated.deletedAt,
				id
			]
		);

		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		await this.driver.execute('UPDATE categories SET deletedAt = ?, updatedAt = ? WHERE id = ?;', [
			Date.now(),
			Date.now(),
			id
		]);
	}
}

export const sqliteCategoryRepository = new SqliteCategoryRepository();
