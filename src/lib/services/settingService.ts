import { db } from '../db/schema';
import { settingRepository } from '../db/repositories/settingRepository';
import type { ISettingRepository } from '../db/repositories/types';
import { getPeriodForDate, type Period } from '../domain/period';

export const SETTING_KEYS = {
	SALARY_DAY: 'salary_day',
	HIDE_BALANCE: 'hide_balance',
	PIN_SECURITY: 'pin_security',
	AUTO_LOCK_TIMEOUT: 'auto_lock_timeout',
	REDUCE_TRANSPARENCY: 'reduce_transparency',
	THEME: 'theme',
	NOTIFICATION_SETTINGS: 'notification_settings',
	ANIMATION_MODE: 'animation_mode',
	HAPTICS_ENABLED: 'haptics_enabled'
} as const;

export interface StorageMetrics {
	walletsCount: number;
	categoriesCount: number;
	transactionsCount: number;
	budgetsCount: number;
	settingsCount: number;
	usageBytes?: number;
	quotaBytes?: number;
	isPersisted?: boolean;
}

export class SettingService {
	constructor(private repository: ISettingRepository = settingRepository) {}

	async getSalaryDay(): Promise<number> {
		const val = await this.repository.get<number>(SETTING_KEYS.SALARY_DAY);
		if (typeof val === 'number' && val >= 1 && val <= 31) {
			return val;
		}
		return 1; // Default hari pertama kalender
	}

	async setSalaryDay(day: number): Promise<number> {
		const clamped = Math.min(Math.max(1, Math.round(day)), 31);
		await this.repository.set<number>(SETTING_KEYS.SALARY_DAY, clamped);
		return clamped;
	}

	async getHideBalance(): Promise<boolean> {
		const val = await this.repository.get<boolean>(SETTING_KEYS.HIDE_BALANCE);
		return val === true;
	}

	async setHideBalance(hide: boolean): Promise<boolean> {
		await this.repository.set<boolean>(SETTING_KEYS.HIDE_BALANCE, hide);
		return hide;
	}

	async getAnimationMode(): Promise<'full' | 'minimal' | 'off'> {
		const val = await this.repository.get<string>(SETTING_KEYS.ANIMATION_MODE);
		if (val === 'full' || val === 'minimal' || val === 'off') {
			return val;
		}
		// Default setting Animasi mengikuti prefers-reduced-motion selama belum dipilih pengguna
		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
		) {
			return 'off';
		}
		return 'full';
	}

	async setAnimationMode(mode: 'full' | 'minimal' | 'off'): Promise<void> {
		await this.repository.set<string>(SETTING_KEYS.ANIMATION_MODE, mode);
	}

	async getHapticsEnabled(): Promise<boolean> {
		const val = await this.repository.get<boolean>(SETTING_KEYS.HAPTICS_ENABLED);
		if (typeof val === 'boolean') {
			return val;
		}
		return true; // Default aktif
	}

	async setHapticsEnabled(enabled: boolean): Promise<void> {
		await this.repository.set<boolean>(SETTING_KEYS.HAPTICS_ENABLED, enabled);
	}

	async getCurrentReportPeriod(): Promise<Period> {
		const salaryDay = await this.getSalaryDay();
		return getPeriodForDate(new Date(), salaryDay);
	}

	async getReportPeriodForDate(date: Date | string): Promise<Period> {
		const salaryDay = await this.getSalaryDay();
		return getPeriodForDate(date, salaryDay);
	}

	async getStorageMetrics(): Promise<StorageMetrics> {
		const [walletsCount, categoriesCount, transactionsCount, budgetsCount, settingsCount] =
			await Promise.all([
				db.wallets.filter((w) => !w.deletedAt).count(),
				db.categories.filter((c) => !c.deletedAt).count(),
				db.transactions.filter((t) => !t.deletedAt).count(),
				db.budgets.count(),
				db.settings.count()
			]);

		let usageBytes: number | undefined;
		let quotaBytes: number | undefined;
		let isPersisted: boolean | undefined;

		if (typeof navigator !== 'undefined' && navigator.storage) {
			try {
				if (navigator.storage.estimate) {
					const estimate = await navigator.storage.estimate();
					usageBytes = estimate.usage;
					quotaBytes = estimate.quota;
				}
				if (navigator.storage.persisted) {
					isPersisted = await navigator.storage.persisted();
				}
			} catch {
				// Ignore storage estimate failure in testing/unsupported environments
			}
		}

		return {
			walletsCount,
			categoriesCount,
			transactionsCount,
			budgetsCount,
			settingsCount,
			usageBytes,
			quotaBytes,
			isPersisted
		};
	}

	async get<T = unknown>(key: string, defaultValue?: T): Promise<T | null> {
		const val = await this.repository.get<T>(key);
		if (val === null && defaultValue !== undefined) {
			return defaultValue;
		}
		return val;
	}

	async set<T = unknown>(key: string, value: T): Promise<void> {
		await this.repository.set<T>(key, value);
	}
}

export const settingService = new SettingService();
