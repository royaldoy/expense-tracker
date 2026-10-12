import { expect, test } from '@playwright/test';

test('halaman utama menampilkan judul aplikasi', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});
