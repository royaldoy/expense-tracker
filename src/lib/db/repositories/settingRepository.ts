import { ulid } from 'ulid';
import type { Setting } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { ISettingRepository } from './types';

export class DexieSettingRepository implements ISettingRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async get<T = unknown>(key: string): Promise<T | null> {
		const setting = await this.database.settings.get(key);
		if (!setting || setting.deletedAt !== null) {
			return null;
		}
		return setting.value as T;
	}

	async set<T = unknown>(key: string, value: T): Promise<void> {
		const existing = await this.database.settings.get(key);
		const now = Date.now();
		if (existing) {
			const updated: Setting = {
				...existing,
				value,
				updatedAt: now,
				deletedAt: null
			};
			await this.database.settings.put(updated);
		} else {
			const created: Setting = {
				id: ulid(),
				key,
				value,
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			};
			await this.database.settings.put(created);
		}
	}

	async delete(key: string): Promise<void> {
		await this.database.settings.delete(key);
	}
}

export const settingRepository = new DexieSettingRepository();
