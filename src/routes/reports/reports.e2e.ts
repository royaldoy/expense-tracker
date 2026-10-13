import { expect, test } from '@playwright/test';

test.describe('Dashboard dan Laporan Keuangan (Reports & Dashboard E2E)', () => {
	test('Dashboard menampilkan total saldo, toggle mata, dan ringkasan arus kas', async ({
		page
	}) => {
		// 1. Setup dompet awal
		await page.goto('/wallets/new');
		await page.locator('[data-testid="wallet-form-name"]').fill('Dompet Kas');
		await page.locator('[data-testid="wallet-form-balance"]').fill('5000000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets/);
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp5.000.000'
		);

		// 2. Buka Dashboard (/)
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();

		// Verifikasi total saldo terlihat di kartu utama
		const totalBalanceEl = page.locator('[data-testid="dashboard-total-balance"]');
		await expect(totalBalanceEl).toBeVisible();
		await expect(totalBalanceEl).toContainText('Rp5.000.000');

		// Klik toggle sembunyikan saldo (ikon visibility)
		const toggleBtn = page.getByRole('button', { name: 'Sembunyikan saldo' });
		await toggleBtn.click();
		await expect(totalBalanceEl).toContainText('••••••••');

		// Klik lagi untuk menampilkan saldo
		const showBtn = page.getByRole('button', { name: 'Tampilkan saldo' });
		await showBtn.click();
		await expect(totalBalanceEl).toContainText('Rp5.000.000');
	});

	test('Laporan (/reports) mendukung navigasi 4 tab: Ringkasan, Kategori, Dompet, dan Tren', async ({
		page
	}) => {
		await page.goto('/reports');
		await expect(page.locator('h1')).toHaveText('Laporan Keuangan');

		// 1. Tab Ringkasan (Default)
		await expect(page.getByText('Arus Kas Bersih (Net)')).toBeVisible();
		await expect(page.getByText('Aktivitas Arus Kas Harian')).toBeVisible();

		// 2. Buka Tab Kategori
		await page.getByRole('tab', { name: 'Kategori' }).click();
		await expect(page.getByText('Tidak ada pengeluaran pada periode ini.')).toBeVisible();

		// 3. Buka Tab Dompet
		await page.getByRole('tab', { name: 'Dompet' }).click();
		await expect(page.getByText('Belum ada data dompet.')).toBeVisible();

		// 4. Buka Tab Tren
		await page.getByRole('tab', { name: 'Tren' }).click();
		await expect(page.getByText('Kurva Akumulasi Kas Bersih')).toBeVisible();

		// 5. Verifikasi pill periode di bawah judul
		const periodPill = page.locator('[data-testid="report-period-pill"]');
		await expect(periodPill).toBeVisible();
	});

	test('Ekspor Laporan Keuangan: buka modal sheet, pilih format (CSV/Excel/PDF), dan unduh file dengan angka yang sama dengan layar', async ({
		page
	}) => {
		// 1. Setup Dompet & Transaksi via onboarding
		await page.goto('/onboarding');
		await page.getByRole('button', { name: '+Rp500.000' }).click();
		await page.locator('[data-testid="onboarding-submit-button"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// Catat transaksi pengeluaran Rp50.000
		await page.goto('/transactions/new');
		await page.locator('[data-testid="keypad-5"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="transaction-note-input"]').fill('Makan Siang Soto');
		await page.locator('[data-testid="transaction-form-submit"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// 2. Buka Halaman Laporan (/reports)
		await page.goto('/reports');
		await expect(page.locator('h1')).toHaveText('Laporan Keuangan');

		// Periksa angka di layar
		const expenseEl = page.locator('[data-testid="report-total-expense"]');
		await expect(expenseEl).toContainText('Rp50.000');

		// 3. Buka Sheet Ekspor Laporan
		const exportBtn = page.locator('[data-testid="report-export-button"]');
		await expect(exportBtn).toBeVisible();
		await exportBtn.click();

		// Sheet ekspor harus terbuka
		const sheet = page.locator('[data-testid="export-report-sheet"]');
		await expect(sheet).toBeVisible();

		// Verifikasi tombol format (CSV, Excel, PDF)
		await expect(page.locator('[data-testid="export-format-csv"]')).toBeVisible();
		await expect(page.locator('[data-testid="export-format-xlsx"]')).toBeVisible();
		await expect(page.locator('[data-testid="export-format-pdf"]')).toBeVisible();

		// 4. Unduh berkas laporan format CSV dan tangkap event download
		await page.locator('[data-testid="export-format-csv"]').click();
		const downloadPromise = page.waitForEvent('download');
		await page.locator('[data-testid="export-submit-button"]').click();
		const download = await downloadPromise;

		// Verifikasi nama berkas CSV
		expect(download.suggestedFilename()).toMatch(/^money-tracker-laporan-.+\.csv$/);

		// Baca isi file yang diunduh
		const stream = await download.createReadStream();
		if (!stream) throw new Error('Download stream is null');
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(Buffer.from(chunk));
		}
		const csvContent = Buffer.concat(chunks).toString('utf-8');

		// 5. Verifikasi angka di file sama persis dengan angka di layar
		expect(csvContent).toContain('Total Pengeluaran,50000');
		expect(csvContent).toContain('Makan Siang Soto');

		// Verifikasi toast alert sukses muncul
		await expect(page.locator('[data-testid="export-status-alert"]')).toBeVisible();
	});
});
