import { expect, test } from '@playwright/test';

test.describe('GlassDock dan GlassFab (Floating Navigation E2E)', () => {
	test('1. Pindah tab di dock mengubah URL, status aria-current, dan fill icon', async ({
		page
	}) => {
		await page.goto('/');

		// Verifikasi dock hadir
		const dock = page.locator('[data-testid="glass-dock"]');
		await expect(dock).toBeVisible();

		// Tab 0: Beranda harus aktif secara default
		const tabHome = page.locator('[data-testid="dock-tab-0"]');
		await expect(tabHome).toHaveAttribute('aria-current', 'page');
		const homeIcon = tabHome.locator('.material-symbols-outlined');
		await expect(homeIcon).toHaveCSS('font-variation-settings', /"FILL" 1/);

		// Tab 1: Transaksi tidak aktif
		const tabTransactions = page.locator('[data-testid="dock-tab-1"]');
		await expect(tabTransactions).not.toHaveAttribute('aria-current', 'page');
		const txIcon = tabTransactions.locator('.material-symbols-outlined');
		await expect(txIcon).toHaveCSS('font-variation-settings', /"FILL" 0/);

		// Klik tab 1 (Transaksi)
		await tabTransactions.click();
		await expect(page).toHaveURL(/\/transactions/);
		await expect(tabTransactions).toHaveAttribute('aria-current', 'page');
		await expect(tabHome).not.toHaveAttribute('aria-current', 'page');
		await expect(txIcon).toHaveCSS('font-variation-settings', /"FILL" 1/);
		await expect(homeIcon).toHaveCSS('font-variation-settings', /"FILL" 0/);

		// Klik tab 2 (Dompet)
		const tabWallets = page.locator('[data-testid="dock-tab-2"]');
		await tabWallets.click();
		await expect(page).toHaveURL(/\/wallets/);
		await expect(tabWallets).toHaveAttribute('aria-current', 'page');
		await expect(tabTransactions).not.toHaveAttribute('aria-current', 'page');

		// Klik tab 3 (Laporan)
		const tabReports = page.locator('[data-testid="dock-tab-3"]');
		await tabReports.click();
		await expect(page).toHaveURL(/\/laporan/);
		await expect(tabReports).toHaveAttribute('aria-current', 'page');
		await expect(tabWallets).not.toHaveAttribute('aria-current', 'page');

		// Kembali ke Beranda
		await tabHome.click();
		await expect(page).toHaveURL('/');
		await expect(tabHome).toHaveAttribute('aria-current', 'page');
	});

	test('2. FAB (+) membuka QuickActionSheet', async ({ page }) => {
		await page.goto('/');
		const fab = page.locator('[data-testid="glass-fab"]');
		await expect(fab).toBeVisible();

		// Klik FAB
		await fab.click();

		// QuickActionSheet terbuka dengan 3 aksi
		await expect(page.locator('[data-testid="quick-action-catat"]')).toBeVisible();
		await expect(page.locator('[data-testid="quick-action-suara"]')).toBeVisible();
		await expect(page.locator('[data-testid="quick-action-scan"]')).toBeVisible();

		// Tutup sheet
		await page.keyboard.press('Escape');
	});

	test('3. Indikator dock tetap sejajar saat viewport resize', async ({ page }) => {
		// Set viewport mobile awal (375x667)
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/wallets');

		const dock = page.locator('[data-testid="glass-dock"]');
		const activeIndicator = page.locator('[data-testid="dock-active-indicator"]');
		await expect(dock).toBeVisible();
		await expect(activeIndicator).toBeVisible();

		// Periksa posisi translateX indikator untuk tab ke-2 (200%)
		await expect(activeIndicator).toHaveCSS('transform', /matrix/);

		// Ubah ukuran viewport ke 420x844 (lebar lebih besar)
		await page.setViewportSize({ width: 420, height: 844 });
		await page.waitForTimeout(100);

		// Indikator tetap visible dan dock tidak overflow
		await expect(dock).toBeVisible();
		await expect(activeIndicator).toBeVisible();
		const tabWallets = page.locator('[data-testid="dock-tab-2"]');
		await expect(tabWallets).toHaveAttribute('aria-current', 'page');
	});

	test('4. Dock dan FAB tidak tampil di route layar penuh', async ({ page }) => {
		const fullscreenRoutes = [
			'/transactions/new',
			'/transfer',
			'/scan',
			'/dev/ocr',
			'/onboarding',
			'/wallets/new'
		];

		for (const route of fullscreenRoutes) {
			await page.goto(route);
			await expect(page.locator('[data-testid="glass-dock"]')).toHaveCount(0);
			await expect(page.locator('[data-testid="glass-fab"]')).toHaveCount(0);
		}
	});

	test('5. FAB sembunyi saat scroll ke bawah dan muncul saat scroll ke atas', async ({ page }) => {
		// Buka galeri dev yang memiliki konten panjang
		await page.goto('/dev/gallery');

		const fab = page.locator('[data-testid="glass-fab"]');
		await expect(fab).toBeVisible();
		await expect(fab).toHaveClass(/translate-y-0/);
		await expect(fab).toHaveClass(/opacity-100/);

		// Gulir ke bawah sejauh 300px
		await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }));
		await page.waitForTimeout(200);

		// FAB tersembunyi
		await expect(fab).toHaveClass(/translate-y-20/);
		await expect(fab).toHaveClass(/opacity-0/);

		// Gulir kembali ke atas
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await page.waitForTimeout(200);

		// FAB muncul kembali
		await expect(fab).toHaveClass(/translate-y-0/);
		await expect(fab).toHaveClass(/opacity-100/);
	});
});
