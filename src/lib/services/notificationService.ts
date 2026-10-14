/**
 * NotificationService
 * Layanan pusat notifikasi luring (offline-first inbox) & penjadwalan notifikasi platform:
 * - Mengambil dan mengelola inbox notifikasi lokal (baca, tandai semua dibaca, hapus)
 * - Sinkronisasi otomatis dari 3 sumber kejadian (tagihan berulang, batas anggaran, pengingat harian)
 * - Deduplikasi idempoten ketat: kejadian yang sama tidak pernah menghasilkan notifikasi duplikat
 * - Penjadwalan ulang notifikasi lokal platform (Capacitor Local Notifications di native, safe fallback di web)
 */

import { format, parseISO } from 'date-fns';
import * as v from 'valibot';
import {
	budgetRepository,
	notificationRepository,
	recurringRuleRepository,
	settingRepository
} from '../db/repositories';
import type {
	IBudgetRepository,
	INotificationRepository,
	IRecurringRuleRepository,
	ISettingRepository
} from '../db/repositories/types';
import { formatRupiah } from '../domain/money';
import { getDueDates } from '../domain/recurring';
import type { Notification, NotificationSettings, ULID } from '../domain/types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../domain/types';
import { platform as defaultPlatform } from '../platform';
import type { IPlatform } from '../platform/types';
import { refreshUnreadNotificationsCount } from '../stores/notificationStore';
import { budgetService, BudgetService } from './budgetService';
import {
	NotificationSettingsSchema,
	UpdateNotificationSettingsSchema,
	type UpdateNotificationSettingsInput
} from './schemas';
import { SETTING_KEYS } from './settingService';

export const DAILY_REMINDER_NOTIFICATION_ID = 1001;

function hashRefIdToNumber(refId: string): number {
	let hash = 0;
	for (let i = 0; i < refId.length; i++) {
		hash = (hash << 5) - hash + refId.charCodeAt(i);
		hash |= 0;
	}
	return 10000 + (Math.abs(hash) % 900000);
}

export class NotificationService {
	constructor(
		private notificationRepo: INotificationRepository = notificationRepository,
		private recurringRepo: IRecurringRuleRepository = recurringRuleRepository,
		private budgetRepo: IBudgetRepository = budgetRepository,
		private settingRepo: ISettingRepository = settingRepository,
		private budgetSvc: BudgetService = budgetService,
		private platformAdapter: IPlatform = defaultPlatform
	) {}

	/**
	 * Mengambil daftar notifikasi dari inbox lokal (diurutkan terbaru lebih dulu).
	 */
	async getNotifications(options?: { unreadOnly?: boolean }): Promise<Notification[]> {
		return this.notificationRepo.getAll({ unreadOnly: options?.unreadOnly });
	}

	/**
	 * Mengambil jumlah notifikasi belum dibaca.
	 */
	async getUnreadCount(): Promise<number> {
		return this.notificationRepo.getUnreadCount();
	}

	/**
	 * Menandai satu notifikasi sebagai sudah dibaca.
	 */
	async markAsRead(id: ULID): Promise<void> {
		await this.notificationRepo.markAsRead(id);
		await refreshUnreadNotificationsCount();
	}

	/**
	 * Menandai semua notifikasi sebagai sudah dibaca.
	 */
	async markAllAsRead(): Promise<void> {
		await this.notificationRepo.markAllAsRead();
		await refreshUnreadNotificationsCount();
	}

	/**
	 * Menghapus notifikasi secara lembut (soft delete).
	 */
	async deleteNotification(id: ULID): Promise<void> {
		await this.notificationRepo.softDelete(id);
		await refreshUnreadNotificationsCount();
	}

	/**
	 * Mengambil preferensi pengaturan notifikasi pengguna.
	 */
	async getSettings(): Promise<NotificationSettings> {
		const saved = await this.settingRepo.get<NotificationSettings>(
			SETTING_KEYS.NOTIFICATION_SETTINGS
		);
		if (!saved || typeof saved !== 'object') {
			return { ...DEFAULT_NOTIFICATION_SETTINGS };
		}
		return {
			recurringDueEnabled:
				saved.recurringDueEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.recurringDueEnabled,
			budgetAlertEnabled:
				saved.budgetAlertEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.budgetAlertEnabled,
			dailyReminderEnabled:
				saved.dailyReminderEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.dailyReminderEnabled,
			dailyReminderTime: saved.dailyReminderTime || DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime
		};
	}

	/**
	 * Memperbarui preferensi pengaturan notifikasi dan menjadwalkan ulang notifikasi lokal.
	 */
	async updateSettings(updates: UpdateNotificationSettingsInput): Promise<NotificationSettings> {
		const validated = v.parse(UpdateNotificationSettingsSchema, updates);
		const current = await this.getSettings();
		const merged: NotificationSettings = {
			...current,
			...validated
		};
		v.parse(NotificationSettingsSchema, merged);

		await this.settingRepo.set(SETTING_KEYS.NOTIFICATION_SETTINGS, merged);
		await this.rescheduleLocalNotifications(merged);
		return merged;
	}

	/**
	 * Menjadwalkan ulang notifikasi fisik platform (Capacitor/Web safe).
	 */
	async rescheduleLocalNotifications(settings?: NotificationSettings): Promise<void> {
		const activeSettings = settings ?? (await this.getSettings());

		// 1. Batalkan pengingat harian sebelumnya jika ada
		try {
			await this.platformAdapter.notifications.cancel([DAILY_REMINDER_NOTIFICATION_ID]);
		} catch {
			// Abaikan kegagalan cancel pada lingkungan yang tidak mendukung
		}

		// 2. Jadwalkan pengingat harian baru jika diaktifkan
		if (activeSettings.dailyReminderEnabled) {
			try {
				const [hoursStr, minutesStr] = activeSettings.dailyReminderTime.split(':');
				const now = new Date();
				const targetDate = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					Number(hoursStr),
					Number(minutesStr),
					0,
					0
				);

				// Jika jam pengingat hari ini sudah terlewat, jadwalkan untuk besok
				if (now.getTime() >= targetDate.getTime()) {
					targetDate.setDate(targetDate.getDate() + 1);
				}

				await this.platformAdapter.notifications.schedule({
					id: DAILY_REMINDER_NOTIFICATION_ID,
					title: 'Waktunya Catat Keuangan',
					body: 'Catat pengeluaran dan pemasukanmu hari ini agar arus kas tetap rapi.',
					scheduleAt: targetDate
				});
			} catch {
				// Safe fallback: di web atau saat izin ditolak, eksekusi tetap aman tanpa error
			}
		}
	}

	/**
	 * Sinkronisasi notifikasi dari seluruh sumber kejadian:
	 * - Tagihan berulang yang jatuh tempo
	 * - Anggaran yang melewati ambang alertAt
	 * - Pengingat catat harian
	 * 100% IDEMPOTEN: Kejadian dengan refId yang sama tidak akan diduplikasi.
	 */
	async syncNotifications(
		asOfDate?: Date | string
	): Promise<{ created: number; unreadCount: number }> {
		const targetDate = asOfDate
			? typeof asOfDate === 'string'
				? parseISO(asOfDate)
				: asOfDate
			: new Date();
		const todayStr = format(targetDate, 'yyyy-MM-dd');

		const settings = await this.getSettings();
		let createdCount = 0;

		// 1. Jadwalkan ulang notifikasi lokal
		await this.rescheduleLocalNotifications(settings);

		// 2. Sumber 1: Tagihan Berulang Jatuh Tempo
		if (settings.recurringDueEnabled) {
			const dueRules = await this.recurringRepo.getDueRules(todayStr);

			for (const rule of dueRules) {
				const dueDates = getDueDates(rule.nextRunAt, rule.frequency, todayStr);

				for (const dueDate of dueDates) {
					const refId = `${rule.id}_${dueDate}`;
					const existing = await this.notificationRepo.getByTypeAndRefId('recurring_due', refId);

					if (!existing) {
						const amount = rule.template.amount ?? 0;
						const name = rule.template.note || 'Tagihan Berulang';
						const title = `Tagihan Jatuh Tempo: ${name}`;
						const message = `Tagihan ${name} sebesar ${formatRupiah(amount)} jatuh tempo pada ${dueDate}.`;

						await this.notificationRepo.create({
							type: 'recurring_due',
							title,
							message,
							readAt: null,
							refId
						});
						createdCount++;

						// Kirim notifikasi platform jika didukung
						try {
							await this.platformAdapter.notifications.schedule({
								id: hashRefIdToNumber(refId),
								title,
								body: message
							});
						} catch {
							// Abaikan kegagalan pengiriman native/web
						}
					}
				}
			}
		}

		// 3. Sumber 2: Peringatan Anggaran (Melewati alertAt)
		if (settings.budgetAlertEnabled) {
			const report = await this.budgetSvc.getBudgetReport();

			for (const item of report.items) {
				if (item.status === 'waspada' || item.status === 'lewat') {
					const refId = `${item.budget.id}_${report.periodKey}`;
					const existing = await this.notificationRepo.getByTypeAndRefId('budget_alert', refId);

					if (!existing) {
						const categoryName = item.category?.name || 'Total Anggaran';
						const title = `Peringatan Anggaran: ${categoryName}`;
						const limitStr = formatRupiah(item.budget.limit);
						const spentStr = formatRupiah(item.spent);
						const message = `Pengeluaran ${categoryName} telah mencapai ${item.percentage}% (${spentStr} dari batas ${limitStr}).`;

						await this.notificationRepo.create({
							type: 'budget_alert',
							title,
							message,
							readAt: null,
							refId
						});
						createdCount++;

						try {
							await this.platformAdapter.notifications.schedule({
								id: hashRefIdToNumber(refId),
								title,
								body: message
							});
						} catch {
							// Abaikan kegagalan platform
						}
					}
				}
			}
		}

		// 4. Sumber 3: Pengingat Catat Harian ke Inbox
		if (settings.dailyReminderEnabled) {
			const refId = `daily_${todayStr}`;
			const existing = await this.notificationRepo.getByTypeAndRefId('daily_reminder', refId);

			if (!existing) {
				const title = 'Pengingat Catat Keuangan';
				const message =
					'Jangan lupa mencatat pengeluaran dan pemasukanmu hari ini agar arus kas tetap rapi.';

				await this.notificationRepo.create({
					type: 'daily_reminder',
					title,
					message,
					readAt: null,
					refId
				});
				createdCount++;
			}
		}

		const unreadCount = await refreshUnreadNotificationsCount();

		return {
			created: createdCount,
			unreadCount
		};
	}
}

export const notificationService = new NotificationService();
