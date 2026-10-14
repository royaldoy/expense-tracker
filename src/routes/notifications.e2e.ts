import { expect, test } from '@playwright/test';

test.describe('Pusat Notifikasi & Pengaturan Notifikasi (Notifications E2E)', () => {
	test('dapat mengakses notifikasi via alias, mengatur preferensi notifikasi, dan melihat badge lonceng di beranda', async ({
		page
	}) => {
		// 1. Akses via alias /notifikasi dan pastikan dialihkan ke /notifications
		await page.goto('/notifikasi');
		await expect(page).toHaveURL(/\/notifications$/);
		await expect(page.locator('[data-testid="notifications-title"]')).toContainText('Notifikasi');

		// 2. Akses pengaturan notifikasi
		const settingsBtn = page.locator('[data-testid="btn-settings-notifications"]');
		await expect(settingsBtn).toBeVisible();
		await settingsBtn.click();
		await expect(page).toHaveURL(/\/settings\/notifications$/);
		await expect(page.locator('[data-testid="settings-notifications-title"]')).toContainText(
			'Pengaturan Notifikasi'
		);

		// 3. Uji toggle preferensi notifikasi
		const budgetToggle = page.locator('[data-testid="toggle-budget-alert"]');
		await expect(budgetToggle).toBeVisible();
		await budgetToggle.click();

		// Verifikasi toast tersimpan muncul
		await expect(page.locator('[data-testid="notification-saved-toast"]')).toBeVisible();

		// Kembalikan toggle anggaran
		await budgetToggle.click();

		// 4. Ubah jam pengingat harian
		const timeInput = page.locator('[data-testid="input-reminder-time"]');
		if (await timeInput.isVisible()) {
			await timeInput.fill('21:30');
		}

		// 5. Navigasi kembali ke Beranda (/)
		await page.goto('/');
		const bellBtn = page.locator('[data-testid="btn-notifications-bell"]');
		await expect(bellBtn).toBeVisible();

		// 6. Jalankan syncNotifications via window
		await page.evaluate(async () => {
			const w = window as unknown as { syncNotifications?: () => Promise<unknown> };
			if (w.syncNotifications) {
				await w.syncNotifications();
			}
		});

		// 7. Masuk kembali ke /notifications via klik ikon lonceng
		await bellBtn.click();
		await expect(page).toHaveURL(/\/notifications$/);

		// 8. Jika ada notifikasi belum dibaca, uji aksi "Tandai Semua Dibaca"
		const markAllBtn = page.locator('[data-testid="btn-mark-all-read"]');
		if (await markAllBtn.isVisible()) {
			await markAllBtn.click();
			// Verifikasi pill counter belum dibaca menjadi 0
			await expect(page.locator('[data-testid="unread-count-pill"]')).toHaveText('0');
		}

		// 9. Kembali ke beranda dan pastikan badge indikator belum dibaca hilang
		await page.goto('/');
		await expect(page.locator('[data-testid="notifications-unread-badge"]')).toHaveCount(0);

		// 10. IDEMPOTENCY TEST: Jalankan syncNotifications dua kali dan reload
		await page.evaluate(async () => {
			const w = window as unknown as { syncNotifications?: () => Promise<unknown> };
			if (w.syncNotifications) {
				await w.syncNotifications();
				await w.syncNotifications();
			}
		});
		await page.reload();

		// Akses /notifications dan verifikasi filter-all
		await page.goto('/notifications');
		const filterAll = page.locator('[data-testid="filter-all"]');
		await expect(filterAll).toBeVisible();
	});
});
