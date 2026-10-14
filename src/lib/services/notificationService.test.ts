import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieBudgetRepository } from '../db/repositories/budgetRepository';
import { DexieCategoryRepository } from '../db/repositories/categoryRepository';
import { DexieNotificationRepository } from '../db/repositories/notificationRepository';
import { DexieRecurringRuleRepository } from '../db/repositories/recurringRuleRepository';
import { DexieSettingRepository } from '../db/repositories/settingRepository';
import { DexieTransactionRepository } from '../db/repositories/transactionRepository';
import { DexieWalletRepository } from '../db/repositories/walletRepository';
import { MoneyTrackerDatabase } from '../db/schema';
import type { IPlatform } from '../platform/types';
import { BudgetService } from './budgetService';
import { NotificationService } from './notificationService';
import { SettingService } from './settingService';

describe('NotificationService - Inbox & Deduplikasi Idempoten', () => {
	let testDb: MoneyTrackerDatabase;
	let notifService: NotificationService;
	let mockPlatform: IPlatform;
	let budgetSvc: BudgetService;
	let settingSvc: SettingService;

	beforeEach(async () => {
		const dbName = `NotifServiceTestDB_${Date.now()}_${Math.random()}`;
		testDb = new MoneyTrackerDatabase(dbName);
		await testDb.open();

		// Instance repository yang mengarah ke testDb
		const notifRepo = new DexieNotificationRepository(testDb);
		const recurringRepo = new DexieRecurringRuleRepository(testDb);
		const budgetRepo = new DexieBudgetRepository(testDb);
		const settingRepo = new DexieSettingRepository(testDb);
		const txRepo = new DexieTransactionRepository(testDb);
		const catRepo = new DexieCategoryRepository(testDb);
		const walletRepo = new DexieWalletRepository(testDb);

		settingSvc = new SettingService(settingRepo);
		budgetSvc = new BudgetService(budgetRepo, txRepo, catRepo, settingSvc);

		mockPlatform = {
			type: 'web',
			isNative: false,
			filesystem: {} as unknown as IPlatform['filesystem'],
			share: {} as unknown as IPlatform['share'],
			backButton: {} as unknown as IPlatform['backButton'],
			statusBar: {} as unknown as IPlatform['statusBar'],
			notifications: {
				schedule: vi.fn().mockResolvedValue(undefined),
				cancel: vi.fn().mockResolvedValue(undefined),
				requestPermissions: vi.fn().mockResolvedValue(true),
				checkPermissions: vi.fn().mockResolvedValue(true)
			},
			biometrics: {} as unknown as IPlatform['biometrics'],
			cameraOcr: {} as unknown as IPlatform['cameraOcr'],
			haptics: {} as unknown as IPlatform['haptics'],
			voice: {} as unknown as IPlatform['voice']
		};

		notifService = new NotificationService(
			notifRepo,
			recurringRepo,
			budgetRepo,
			settingRepo,
			budgetSvc,
			mockPlatform
		);

		// Siapkan kategori dan dompet default
		await walletRepo.create({
			name: 'Kas Utama',
			type: 'cash',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0058bc',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});

		await catRepo.create({
			name: 'Makanan',
			kind: 'expense',
			parentId: null,
			icon: 'restaurant',
			color: '#ff9800',
			order: 1
		});
	});

	it('berhasil melakukan operasi CRUD dasar (get, unread count, markAsRead, markAllAsRead, delete)', async () => {
		// 1. Tambah 2 notifikasi manual
		const notif1 = await notifService['notificationRepo'].create({
			type: 'system',
			title: 'Selamat Datang',
			message: 'Aplikasi siap digunakan.',
			readAt: null,
			refId: 'sys_1'
		});

		const notif2 = await notifService['notificationRepo'].create({
			type: 'daily_reminder',
			title: 'Catat Pengeluaran',
			message: 'Waktunya mencatat transaksi.',
			readAt: null,
			refId: 'daily_test'
		});

		let all = await notifService.getNotifications();
		expect(all).toHaveLength(2);
		expect(await notifService.getUnreadCount()).toBe(2);

		// 2. Tandai notif1 sebagai sudah dibaca
		await notifService.markAsRead(notif1.id);
		const unread = await notifService.getNotifications({ unreadOnly: true });
		expect(unread).toHaveLength(1);
		expect(unread[0].id).toBe(notif2.id);
		expect(await notifService.getUnreadCount()).toBe(1);

		// 3. Tandai semua sudah dibaca
		await notifService.markAllAsRead();
		expect(await notifService.getUnreadCount()).toBe(0);

		// 4. Hapus notifikasi
		await notifService.deleteNotification(notif1.id);
		all = await notifService.getNotifications();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(notif2.id);
	});

	it('IDEMPOTEN: Sinkronisasi tagihan berulang jatuh tempo berulang kali tidak menduplikasi notifikasi', async () => {
		const today = '2026-10-15';

		// Buat jadwal berulang jatuh tempo hari ini
		await notifService['recurringRepo'].create({
			frequency: 'monthly',
			nextRunAt: today,
			autoPost: false,
			template: {
				amount: 150000,
				note: 'Langganan Internet',
				walletId: 'w1'
			}
		});

		// Matikan daily reminder & budget alert untuk mengisolasi uji tagihan berulang
		await notifService.updateSettings({
			recurringDueEnabled: true,
			budgetAlertEnabled: false,
			dailyReminderEnabled: false
		});

		// Sinkronisasi pertama
		const result1 = await notifService.syncNotifications(today);
		expect(result1.created).toBe(1);

		let list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
		expect(list[0].type).toBe('recurring_due');
		expect(list[0].title).toContain('Langganan Internet');
		expect(list[0].message).toContain('Rp150.000');

		// Sinkronisasi kedua pada tanggal yang sama -> tidak ada duplikasi!
		const result2 = await notifService.syncNotifications(today);
		expect(result2.created).toBe(0);

		list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
	});

	it('IDEMPOTEN: Peringatan anggaran melewati alertAt berulang kali tidak membuat notifikasi ganda', async () => {
		const today = '2026-10-15';
		const periodKey = '2026-10';

		// Buat anggaran Rp1.000.000 dengan alertAt 80% (ambang Rp800.000)
		const cat = (await notifService['budgetSvc']['catRepo'].getAll())[0];
		const budget = await notifService['budgetRepo'].create({
			categoryId: cat.id,
			period: periodKey,
			limit: 1000000,
			alertAt: 80
		});

		// Tambahkan transaksi sebesar Rp850.000 (85% keterpakaian -> status 'waspada')
		const wallet = (await notifService['budgetSvc']['txRepo'].getAllActive())[0];
		await notifService['budgetSvc']['txRepo'].create({
			type: 'expense',
			amount: 850000,
			walletId: wallet?.id ?? 'w1',
			toWalletId: null,
			fee: 0,
			categoryId: cat.id,
			date: '2026-10-10',
			note: 'Belanja Bulanan',
			tagIds: [],
			attachmentId: null,
			recurringId: null
		});

		// Isolasi uji anggaran
		await notifService.updateSettings({
			recurringDueEnabled: false,
			budgetAlertEnabled: true,
			dailyReminderEnabled: false
		});

		// Sinkronisasi pertama -> membuat 1 notifikasi
		const result1 = await notifService.syncNotifications(today);
		expect(result1.created).toBe(1);

		let list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
		expect(list[0].type).toBe('budget_alert');
		expect(list[0].title).toContain(cat.name);
		expect(list[0].message).toContain('85%');
		expect(list[0].refId).toBe(`${budget.id}_${periodKey}`);

		// Sinkronisasi kedua -> 0 notifikasi baru (idempoten!)
		const result2 = await notifService.syncNotifications(today);
		expect(result2.created).toBe(0);

		list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
	});

	it('IDEMPOTEN: Pengingat catat harian tidak menghasilkan notifikasi ganda pada hari yang sama', async () => {
		const today = '2026-10-15';

		await notifService.updateSettings({
			recurringDueEnabled: false,
			budgetAlertEnabled: false,
			dailyReminderEnabled: true
		});

		// Sinkronisasi 1
		const res1 = await notifService.syncNotifications(today);
		expect(res1.created).toBe(1);

		let list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
		expect(list[0].type).toBe('daily_reminder');
		expect(list[0].refId).toBe(`daily_${today}`);

		// Sinkronisasi 2 pada hari yang sama
		const res2 = await notifService.syncNotifications(today);
		expect(res2.created).toBe(0);

		list = await notifService.getNotifications();
		expect(list).toHaveLength(1);
	});

	it('menghormati preferensi saat sumber notifikasi dimatikan oleh pengguna', async () => {
		const today = '2026-10-15';

		// Ada tagihan jatuh tempo
		await notifService['recurringRepo'].create({
			frequency: 'monthly',
			nextRunAt: today,
			autoPost: false,
			template: {
				amount: 50000,
				note: 'Tagihan Spotify',
				walletId: 'w1'
			}
		});

		// Pengguna mematikan notifikasi tagihan berulang
		await notifService.updateSettings({
			recurringDueEnabled: false,
			budgetAlertEnabled: false,
			dailyReminderEnabled: false
		});

		const result = await notifService.syncNotifications(today);
		expect(result.created).toBe(0);

		const list = await notifService.getNotifications();
		expect(list).toHaveLength(0);
	});

	it('Web Safe Fallback: Pemanggilan notifikasi platform yang gagal atau tidak didukung tidak melempar error', async () => {
		// Simulasikan adapter platform yang throw error saat schedule
		mockPlatform.notifications.schedule = vi
			.fn()
			.mockRejectedValue(new Error('Web notification denied'));
		mockPlatform.notifications.cancel = vi.fn().mockRejectedValue(new Error('Cancel unsupported'));

		await notifService.updateSettings({
			dailyReminderEnabled: true,
			dailyReminderTime: '21:00'
		});

		// syncNotifications harus tetap sukses tanpa melempar exception
		await expect(notifService.syncNotifications('2026-10-15')).resolves.toBeDefined();
	});
});
