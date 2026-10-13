import { expect, test } from '@playwright/test';

test('halaman utama menampilkan judul aplikasi dan menyembunyikan tombol galeri bila VITE_DEV_TOOLS nonaktif', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();

	// Tombol galeri dev tools disembunyikan secara default pada build standar
	await expect(page.locator('[data-testid="header-dev-gallery-button"]')).toHaveCount(0);
});
