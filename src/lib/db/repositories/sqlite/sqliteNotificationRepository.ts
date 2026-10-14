import { ulid } from 'ulid';
import { createSqliteDriver, type ISqliteDriver } from '../../sqlite/connection';
import type { Notification, NotificationType, ULID } from '../../../domain/types';
import type { INotificationRepository } from '../types';

interface SqliteNotificationRow {
	id: string;
	type: string;
	title: string;
	message: string;
	readAt: number | null;
	refId: string | null;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

function mapRowToNotification(row: SqliteNotificationRow): Notification {
	return {
		id: row.id,
		type: row.type as NotificationType,
		title: row.title,
		message: row.message,
		readAt: row.readAt,
		refId: row.refId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt
	};
}

export class SqliteNotificationRepository implements INotificationRepository {
	constructor(private driver: ISqliteDriver = createSqliteDriver()) {}

	async getById(id: ULID): Promise<Notification | undefined> {
		const rows = await this.driver.query<SqliteNotificationRow>(
			'SELECT * FROM notifications WHERE id = ?;',
			[id]
		);
		if (rows.length === 0) return undefined;
		const row = rows[0];
		if (row.deletedAt !== null) return undefined;
		return mapRowToNotification(row);
	}

	async getAll(options?: {
		includeDeleted?: boolean;
		unreadOnly?: boolean;
	}): Promise<Notification[]> {
		let sql = 'SELECT * FROM notifications WHERE 1=1';
		const params: unknown[] = [];

		if (!options?.includeDeleted) {
			sql += ' AND deletedAt IS NULL';
		}
		if (options?.unreadOnly) {
			sql += ' AND readAt IS NULL';
		}

		sql += ' ORDER BY createdAt DESC;';
		const rows = await this.driver.query<SqliteNotificationRow>(sql, params);
		return rows.map(mapRowToNotification);
	}

	async getByTypeAndRefId(
		type: NotificationType,
		refId: string
	): Promise<Notification | undefined> {
		const rows = await this.driver.query<SqliteNotificationRow>(
			'SELECT * FROM notifications WHERE type = ? AND refId = ? AND deletedAt IS NULL LIMIT 1;',
			[type, refId]
		);
		if (rows.length === 0) return undefined;
		return mapRowToNotification(rows[0]);
	}

	async getUnreadCount(): Promise<number> {
		const rows = await this.driver.query<{ count: number }>(
			'SELECT COUNT(*) as count FROM notifications WHERE deletedAt IS NULL AND readAt IS NULL;'
		);
		return rows[0]?.count ?? 0;
	}

	async create(
		data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Notification> {
		const now = Date.now();
		const id = ulid();
		const notif: Notification = {
			...data,
			id,
			readAt: data.readAt ?? null,
			refId: data.refId ?? null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};

		await this.driver.execute(
			`INSERT INTO notifications (id, type, title, message, readAt, refId, createdAt, updatedAt, deletedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				notif.id,
				notif.type,
				notif.title,
				notif.message,
				notif.readAt,
				notif.refId,
				notif.createdAt,
				notif.updatedAt,
				notif.deletedAt
			]
		);

		return notif;
	}

	async markAsRead(id: ULID): Promise<void> {
		const now = Date.now();
		await this.driver.execute(
			'UPDATE notifications SET readAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;',
			[now, now, id]
		);
	}

	async markAllAsRead(): Promise<void> {
		const now = Date.now();
		await this.driver.execute(
			'UPDATE notifications SET readAt = ?, updatedAt = ? WHERE deletedAt IS NULL AND readAt IS NULL;',
			[now, now]
		);
	}

	async softDelete(id: ULID): Promise<void> {
		const now = Date.now();
		await this.driver.execute(
			'UPDATE notifications SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL;',
			[now, now, id]
		);
	}
}

export const sqliteNotificationRepository = new SqliteNotificationRepository();
