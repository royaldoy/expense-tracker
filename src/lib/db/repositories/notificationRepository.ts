import { ulid } from 'ulid';
import type { Notification, NotificationType, ULID } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { INotificationRepository } from './types';

export class DexieNotificationRepository implements INotificationRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<Notification | undefined> {
		const notif = await this.database.notifications.get(id);
		return notif?.deletedAt === null ? notif : undefined;
	}

	async getAll(options?: {
		includeDeleted?: boolean;
		unreadOnly?: boolean;
	}): Promise<Notification[]> {
		const collection = this.database.notifications.toCollection();

		const items = await collection.toArray();
		return items
			.filter((n) => {
				if (!options?.includeDeleted && n.deletedAt !== null) return false;
				if (options?.unreadOnly && n.readAt !== null) return false;
				return true;
			})
			.sort((a, b) => b.createdAt - a.createdAt);
	}

	async getByTypeAndRefId(
		type: NotificationType,
		refId: string
	): Promise<Notification | undefined> {
		const item = await this.database.notifications
			.where('[type+refId]')
			.equals([type, refId])
			.and((n) => n.deletedAt === null)
			.first();
		return item;
	}

	async getUnreadCount(): Promise<number> {
		return this.database.notifications
			.filter((n) => n.deletedAt === null && n.readAt === null)
			.count();
	}

	async create(
		data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Notification> {
		const now = Date.now();
		const notif: Notification = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.notifications.add(notif);
		return notif;
	}

	async markAsRead(id: ULID): Promise<void> {
		const existing = await this.database.notifications.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.readAt = now;
		existing.updatedAt = now;
		await this.database.notifications.put(existing);
	}

	async markAllAsRead(): Promise<void> {
		const unread = await this.database.notifications
			.filter((n) => n.deletedAt === null && n.readAt === null)
			.toArray();

		if (unread.length === 0) return;

		const now = Date.now();
		for (const n of unread) {
			n.readAt = now;
			n.updatedAt = now;
		}
		await this.database.notifications.bulkPut(unread);
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.notifications.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.notifications.put(existing);
	}
}

export const notificationRepository = new DexieNotificationRepository();
