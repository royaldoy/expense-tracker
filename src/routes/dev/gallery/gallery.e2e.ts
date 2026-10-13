import { expect, test } from '@playwright/test';

test.describe('Galeri Komponen Liquid Glass & Pengujian Interaksi', () => {
	test('halaman galeri dapat diakses dan menampilkan komponen utama', async ({ page }) => {
		await page.goto('/dev/gallery');
		await expect(page.locator('h1').first()).toContainText('Galeri Komponen Liquid Glass');

		// Verifikasi keberadaan komponen
		await expect(page.getByText('0. AppHeader')).toBeVisible();
		await expect(page.getByText('1. GlassCard')).toBeVisible();
		await expect(page.getByText('2. GlassButton')).toBeVisible();
		await expect(page.getByText('3. GlassSegmented')).toBeVisible();
		await expect(page.getByText('4. GlassListRow')).toBeVisible();
		await expect(page.getByText('5. GlassKeypad')).toBeVisible();
		await expect(page.getByText('7. Sistem Animasi & Haptics')).toBeVisible();
	});

	test('tombol back peramban menutup GlassSheet lebih dulu tanpa keluar dari halaman', async ({
		page
	}) => {
		await page.goto('/dev/gallery');

		// Pastikan sheet awal belum tampak
		await expect(page.locator('[data-testid="glass-sheet"]')).toHaveCount(0);

		// 1. Buka GlassSheet
		await page.locator('[data-testid="btn-open-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toBeVisible();

		// 2. Tekan tombol back (simulasi back Android / browser)
		await page.goBack();

		// 3. Pastikan GlassSheet tertutup
		await expect(page.locator('[data-testid="glass-sheet"]')).toHaveCount(0);

		// 4. Pastikan masih berada di /dev/gallery (tidak dinavigasi keluar)
		expect(page.url()).toContain('/dev/gallery');
	});

	test('menutup sheet via tombol Tutup membersihkan state riwayat dengan benar', async ({
		page
	}) => {
		await page.goto('/dev/gallery');

		// Buka sheet
		await page.locator('[data-testid="btn-open-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toBeVisible();

		// Tutup via tombol close
		await page.locator('[data-testid="btn-close-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toHaveCount(0);

		// Memastikan masih di /dev/gallery
		expect(page.url()).toContain('/dev/gallery');
	});

	test('varian dialog GlassSheet (konfirmasi hapus) dapat dibuka dan ditutup', async ({ page }) => {
		await page.goto('/dev/gallery');

		// Buka dialog hapus
		await page.locator('[data-testid="btn-open-delete-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toBeVisible();
		await expect(page.getByText('Konfirmasi Hapus Data')).toBeVisible();

		// Tekan batal
		await page.locator('[data-testid="btn-cancel-delete"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toHaveCount(0);
	});

	test('saklar Kurangi Transparansi mengaktifkan data-reduce-transparency pada dokumen', async ({
		page
	}) => {
		await page.goto('/dev/gallery');

		const toggleBtn = page.locator('[data-testid="toggle-reduce-transparency"]');
		await toggleBtn.click();

		const htmlElement = page.locator('html');
		await expect(htmlElement).toHaveAttribute('data-reduce-transparency', 'true');
	});

	test('GlassSheet menampilkan grabber tarik-untuk-tutup dan count-up saldo menampilkan nilai akhir', async ({
		page
	}) => {
		await page.goto('/dev/gallery');

		// 1. Verifikasi count-up awal menampilkan angka akhir
		const countupDisplay = page.locator('[data-testid="gallery-countup-display"]');
		await expect(countupDisplay).toContainText('Rp1.250.000');

		// 2. Klik Reset ke Rp0
		await page.getByRole('button', { name: 'Reset ke Rp0' }).click();
		await expect(countupDisplay).toContainText('Rp0');

		// 3. Buka GlassSheet dan pastikan grabber terlihat
		await page.locator('[data-testid="btn-open-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet-grabber"]')).toBeVisible();

		// Tutup sheet
		await page.locator('[data-testid="btn-close-sheet"]').click();
		await expect(page.locator('[data-testid="glass-sheet"]')).toHaveCount(0);
	});
});
