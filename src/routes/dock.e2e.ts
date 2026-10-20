import { expect, test } from '@playwright/test';

test.describe('GlassDock dan GlassPill (Floating Navigation E2E)', () => {
	test('1. Pindah tab di dock mengubah URL, status aria-current, dan fill icon', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		// Verifikasi dock hadir
		const dock = page.locator('[data-testid="glass-dock"]');
		await expect(dock).toBeVisible();

		// Tab 0: Beranda aktif secara default
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

	test('2. GlassPill (+) "Catat" membuka QuickActionSheet', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const pill = page.locator('[data-testid="glass-pill"]');
		await expect(pill).toBeVisible();
		await expect(pill).toContainText('Catat');

		// Klik Pill
		await pill.click();

		// QuickActionSheet terbuka dengan 3 aksi
		await expect(page.locator('[data-testid="quick-action-catat"]')).toBeVisible();
		await expect(page.locator('[data-testid="quick-action-suara"]')).toBeVisible();
		await expect(page.locator('[data-testid="quick-action-scan"]')).toBeVisible();

		// Tutup sheet via escape
		await page.keyboard.press('Escape');
	});

	test('3. Indikator tab simetris: pusat indikator = pusat tab (toleransi 0.5px) dan jarak ke tepi dock simetris', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		// Matikan animasi transisi CSS agar pengukuran koordinat langsung stabil
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		const dock = page.locator('[data-testid="glass-dock"]');
		const indicator = page.locator('[data-testid="dock-active-indicator"]');
		await expect(dock).toBeVisible();
		await expect(indicator).toBeVisible();

		// Uji keselarasan pusat indikator dan pusat tab untuk seluruh 4 tab (0, 1, 2, 3)
		let tab0IndicatorLeftDistance = 0;
		let tab3IndicatorRightDistance = 0;

		for (let i = 0; i < 4; i++) {
			const tab = page.locator(`[data-testid="dock-tab-${i}"]`);
			await tab.click();
			await page.waitForTimeout(60);

			const tabBox = await tab.boundingBox();
			const indicatorBox = await indicator.boundingBox();
			const dockBox = await dock.boundingBox();

			expect(tabBox).not.toBeNull();
			expect(indicatorBox).not.toBeNull();
			expect(dockBox).not.toBeNull();

			if (tabBox && indicatorBox && dockBox) {
				const tabCenter = tabBox.x + tabBox.width / 2;
				const indicatorCenter = indicatorBox.x + indicatorBox.width / 2;
				const centerDiff = Math.abs(tabCenter - indicatorCenter);

				// Toleransi 0.5px
				expect(centerDiff).toBeLessThanOrEqual(0.5);

				// Rekam jarak tepi untuk tab pertama (0) dan tab terakhir (3)
				if (i === 0) {
					tab0IndicatorLeftDistance = indicatorBox.x - dockBox.x;
				} else if (i === 3) {
					tab3IndicatorRightDistance =
						dockBox.x + dockBox.width - (indicatorBox.x + indicatorBox.width);
				}
			}
		}

		// Jarak indikator ke tepi dock pada tab pertama sama dengan pada tab terakhir (toleransi 0.5px)
		const edgeDiff = Math.abs(tab0IndicatorLeftDistance - tab3IndicatorRightDistance);
		expect(edgeDiff).toBeLessThanOrEqual(0.5);
	});

	test('4. Posisi GlassPill berada tepat di tengah horizontal dan 8-12px di atas dock', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const pill = page.locator('[data-testid="glass-pill"]');
		const dock = page.locator('[data-testid="glass-dock"]');
		await expect(pill).toBeVisible();
		await expect(dock).toBeVisible();

		const pillBox = await pill.boundingBox();
		const dockBox = await dock.boundingBox();

		expect(pillBox).not.toBeNull();
		expect(dockBox).not.toBeNull();

		if (pillBox && dockBox) {
			// Pusat horizontal pill harus sama dengan pusat viewport (toleransi 1px)
			const pillCenter = pillBox.x + pillBox.width / 2;
			const viewportCenter = 390 / 2;
			expect(Math.abs(pillCenter - viewportCenter)).toBeLessThanOrEqual(1);

			// Jarak vertikal antara tepi atas dock dan tepi bawah pill harus 8-12px
			const gap = dockBox.y - (pillBox.y + pillBox.height);
			expect(gap).toBeGreaterThanOrEqual(8);
			expect(gap).toBeLessThanOrEqual(12);

			// Tinggi pill sekitar 44-48px
			expect(pillBox.height).toBeGreaterThanOrEqual(44);
			expect(pillBox.height).toBeLessThanOrEqual(48);
		}
	});

	test('5. Dock dan GlassPill tidak tampil di route layar penuh', async ({ page }) => {
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
			await expect(page.locator('[data-testid="glass-pill"]')).toHaveCount(0);
		}
	});

	test('6. GlassPill sembunyi saat scroll ke bawah dan muncul saat scroll ke atas', async ({
		page
	}) => {
		// Buka galeri dev yang memiliki konten panjang
		await page.goto('/dev/gallery');

		const pill = page.locator('[data-testid="glass-pill"]');
		await expect(pill).toBeVisible();
		await expect(pill).toHaveClass(/translate-y-0/);
		await expect(pill).toHaveClass(/opacity-100/);

		// Gulir ke bawah sejauh 350px
		await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }));
		await page.waitForTimeout(200);

		// Pill tersembunyi
		await expect(pill).toHaveClass(/translate-y-8/);
		await expect(pill).toHaveClass(/opacity-0/);

		// Gulir kembali ke atas
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await page.waitForTimeout(200);

		// Pill muncul kembali
		await expect(pill).toHaveClass(/translate-y-0/);
		await expect(pill).toHaveClass(/opacity-100/);
	});
});
