import { expect, test } from '@playwright/test';

test.describe('Alur Transaksi Berulang & Idempotensi (Recurring E2E)', () => {
	test('dapat membuat jadwal berulang, toggle autoPost, mengeksekusi jadwal jatuh tempo, dan reload halaman tidak membuat transaksi ganda', async ({
		page
	}) => {
		// 1. Setup Dompet Awal di /wallets/new
		await page.goto('/wallets/new');
		await page.locator('[data-testid="wallet-form-name"]').fill('BCA Payroll');
		await page.locator('[data-testid="wallet-form-balance"]').fill('1000000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets$/);

		// 2. Akses halaman via alias /transaksi-berulang dan pastikan dialihkan ke /recurring
		await page.goto('/transaksi-berulang');
		await expect(page).toHaveURL(/\/recurring$/);
		await expect(page.locator('[data-testid="recurring-page-title"]')).toContainText(
			'Transaksi Berulang'
		);

		// 3. Verifikasi kondisi awal kosong
		await expect(page.getByText('Belum Ada Jadwal Berulang')).toBeVisible();

		// 4. Buka sheet pembuatan jadwal baru
		const addBtn = page.locator('[data-testid="btn-open-create-recurring"]');
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		// Isi formulir jadwal berulang (Jatuh tempo bulan depan)
		await page.locator('[data-testid="recurring-form-name"]').fill('Langganan Netflix');
		await page.locator('[data-testid="recurring-form-amount"]').fill('54000');
		await page.locator('[data-testid="freq-option-monthly"]').click();
		await page.locator('[data-testid="recurring-form-date"]').fill('2026-11-20');

		// Simpan jadwal
		await page.locator('[data-testid="recurring-form-submit"]').click();

		// 5. Verifikasi kartu jadwal muncul di daftar
		const rulesList = page.locator('[data-testid="recurring-rules-list"]');
		await expect(rulesList).toBeVisible();
		await expect(rulesList).toContainText('Langganan Netflix');
		await expect(rulesList).toContainText('-Rp54.000');
		await expect(rulesList).toContainText('Setiap bulan');
		await expect(page.locator('[data-testid="recurring-total-commitment"]')).toContainText(
			'-Rp54.000'
		);

		// 6. Uji toggle autoPost switch
		const toggleBtn = page.locator('[data-testid^="toggle-autopost-"]').first();
		await expect(toggleBtn).toBeVisible();
		// Awalnya Otomatis, klik untuk ubah ke Konfirmasi Manual
		await toggleBtn.click();
		await expect(rulesList).toContainText('Konfirmasi Manual');

		// Klik lagi untuk kembalikan ke Otomatis
		await toggleBtn.click();
		await expect(rulesList).toContainText('Otomatis');

		// 7. Buat jadwal yang jatuh tempo hari ini dengan autoPost: true
		await addBtn.click();
		await page.locator('[data-testid="recurring-form-name"]').fill('Tagihan WiFi');
		await page.locator('[data-testid="recurring-form-amount"]').fill('100000');
		await page.locator('[data-testid="freq-option-monthly"]').click();

		// Set tanggal mulai hari ini
		const todayStr = new Date().toISOString().slice(0, 10);
		await page.locator('[data-testid="recurring-form-date"]').fill(todayStr);
		await page.locator('[data-testid="recurring-form-submit"]').click();

		await expect(rulesList).toContainText('Tagihan WiFi');

		// 8. Jalankan runDueRecurring via window (atau reload yang memicu layout onMount)
		await page.evaluate(async () => {
			const w = window as unknown as { runDueRecurring?: () => Promise<unknown> };
			if (w.runDueRecurring) {
				await w.runDueRecurring();
			}
		});

		// 9. Periksa di /transactions bahwa transaksi Tagihan WiFi tercatat
		await page.goto('/transactions');
		const txItem = page
			.locator('[data-testid="transaction-row"]')
			.filter({ hasText: 'Tagihan WiFi' });
		await expect(txItem).toBeVisible();
		await expect(txItem).toContainText('-Rp100.000');

		// 10. IDEMPOTENCY TEST: Buka/reload aplikasi dua kali
		// Reload 1
		await page.reload();
		// Reload 2
		await page.goto('/');
		await page.goto('/transactions');

		// Verifikasi tepat 1 transaksi Tagihan WiFi tercatat (TIDAK ganda setelah multi-reload)
		await expect(txItem).toHaveCount(1);

		// Verifikasi saldo dompet hanya terpotong tepat Rp100.000 (dari Rp1.000.000 menjadi Rp900.000)
		await page.goto('/wallets');
		const walletCard = page
			.locator('[data-testid="wallet-card"]')
			.filter({ hasText: 'BCA Payroll' });
		await expect(walletCard).toContainText('Rp900.000');
	});
});
