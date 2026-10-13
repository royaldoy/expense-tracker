import { expect, test } from '@playwright/test';

test.describe('Pengaturan & Keamanan (Settings & Security E2E)', () => {
	test.beforeEach(async ({ page }) => {
		// Bersihkan IndexedDB sebelum tiap pengujian agar kondisi awal bersih
		await page.goto('/');
		await page.evaluate(async () => {
			const dbs = await window.indexedDB.databases();
			for (const db of dbs) {
				if (db.name) window.indexedDB.deleteDatabase(db.name);
			}
		});
	});

	test('Hub Pengaturan (/settings) dan redirect otomatis dari /pengaturan', async ({ page }) => {
		// 1. Akses rute alias /pengaturan -> harus diarahkan ke /settings
		await page.goto('/pengaturan');
		await expect(page).toHaveURL(/\/settings/);

		// 2. Verifikasi elemen profil lokal & offline-first
		await expect(page.locator('h1')).toHaveText('Pengaturan');
		await expect(page.getByText('Money Tracker Lokal')).toBeVisible();
		await expect(page.getByText('Tersimpan di IndexedDB Offline (100% Privat)')).toBeVisible();

		// 3. Verifikasi tautan menu utama
		await expect(page.getByText('Kelola Kategori')).toBeVisible();
		await expect(page.getByText('Mata Uang & Format')).toBeVisible();
		await expect(page.getByText('Cadangan & Data (Backup)')).toBeVisible();
		await expect(page.getByText('Kunci PIN & Aplikasi')).toBeVisible();
		await expect(page.getByText('Tentang Aplikasi')).toBeVisible();
	});

	test('Konfigurasi Tanggal Gajian & Format Mata Uang (/settings/format)', async ({ page }) => {
		await page.goto('/settings/format');
		await expect(page.locator('h1')).toHaveText('Mata Uang & Format');

		// 1. Verifikasi format Rupiah live preview
		await expect(page.getByText('Rupiah Indonesia (IDR)')).toBeVisible();
		await expect(page.getByText('+Rp1.250.000')).toBeVisible();
		await expect(page.getByText('-Rp50.000')).toBeVisible();

		// 2. Ubah tanggal gajian dengan memilih preset 'Tgl 25'
		const preset25Btn = page.locator('[data-testid="preset-salary-25"]');
		await expect(preset25Btn).toBeVisible();
		await preset25Btn.click();

		const salaryInput = page.locator('[data-testid="input-salary-day"]');
		await expect(salaryInput).toHaveValue('25');

		// 3. Simpan perubahan
		const saveBtn = page.locator('[data-testid="btn-save-salary-day"]');
		await saveBtn.click();

		// 4. Verifikasi feedback tersimpan
		const feedback = page.locator('[data-testid="salary-save-feedback"]');
		await expect(feedback).toBeVisible();
		await expect(feedback).toContainText('berhasil disimpan');

		// 5. Verifikasi tampilan periode berjalan terbarui
		const periodDisplay = page.locator('[data-testid="current-period-display"]');
		await expect(periodDisplay).toBeVisible();
	});

	test('Cadangan & Data (/settings/backup) dan Modal Konfirmasi Reset', async ({ page }) => {
		await page.goto('/settings/backup');
		await expect(page.locator('h1')).toHaveText('Cadangan & Data');

		// 1. Verifikasi tombol ekspor & pemulihan
		await expect(page.locator('[data-testid="btn-export-json"]')).toBeVisible();
		await expect(page.locator('[data-testid="btn-trigger-restore"]')).toBeVisible();
		await expect(page.locator('[data-testid="btn-export-csv"]')).toBeVisible();

		// 2. Uji alur zona bahaya hapus data
		const openResetBtn = page.locator('[data-testid="btn-open-reset-sheet"]');
		await openResetBtn.click();

		// Sheet konfirmasi terbuka
		await expect(page.getByText('Konfirmasi Hapus Semua Data')).toBeVisible();

		const confirmInput = page.locator('[data-testid="input-confirm-reset-text"]');
		const finalDeleteBtn = page.locator('[data-testid="btn-confirm-reset-final"]');

		// Tombol hapus harus disabled sebelum teks konfirmasi cocok
		await expect(finalDeleteBtn).toBeDisabled();

		await confirmInput.fill('hapus data');
		await expect(finalDeleteBtn).toBeEnabled();

		// Eksekusi reset
		await finalDeleteBtn.click();

		// Feedback sukses muncul
		const alert = page.locator('[data-testid="backup-status-alert"]');
		await expect(alert).toBeVisible();
		await expect(alert).toContainText('Semua data telah dihapus');
	});

	test('Aktivasi PIN Keamanan PBKDF2, Kunci Aplikasi, dan Buka Kunci (/settings/security)', async ({
		page
	}) => {
		await page.goto('/settings/security');
		await expect(page.locator('h1')).toHaveText('Keamanan & Privasi');

		// 1. Verifikasi status awal: Nonaktif
		const badge = page.locator('[data-testid="pin-status-badge"]');
		await expect(badge).toHaveText('Nonaktif');

		// 2. Buka sheet aktivasi PIN
		const enablePinBtn = page.locator('[data-testid="btn-enable-pin"]');
		await enablePinBtn.click();

		await expect(page.locator('[data-testid="pin-modal-step-title"]')).toContainText(
			'Masukkan 6 digit PIN baru Anda'
		);

		// Masukkan PIN 123456 (menggunakan GlassKeypad angka)
		for (const digit of ['1', '2', '3', '4', '5', '6']) {
			await page.getByRole('button', { name: digit, exact: true }).click();
		}

		// Langkah kedua: Konfirmasi PIN baru
		await expect(page.locator('[data-testid="pin-modal-step-title"]')).toContainText(
			'Ulangi 6 digit PIN baru untuk konfirmasi'
		);

		// Masukkan konfirmasi PIN 123456
		for (const digit of ['1', '2', '3', '4', '5', '6']) {
			await page.getByRole('button', { name: digit, exact: true }).click();
		}

		// Verifikasi alert sukses dan status berubah jadi Aktif
		const alert = page.locator('[data-testid="security-status-alert"]');
		await expect(alert).toBeVisible();
		await expect(alert).toContainText('berhasil diaktifkan');
		await expect(badge).toHaveText('Aktif');

		// 3. Uji kunci aplikasi via tombol "Uji Kunci Aplikasi Sekarang"
		const lockNowBtn = page.getByRole('button', { name: 'Uji Kunci Aplikasi Sekarang' });
		await lockNowBtn.click();

		// Overlay PinLockScreen harus terlihat
		const lockScreen = page.locator('[data-testid="pin-lock-screen"]');
		await expect(lockScreen).toBeVisible();

		// Konten utama main harus inert
		const mainContent = page.locator('main');
		await expect(mainContent).toHaveAttribute('inert', '');

		// 4. Masukkan PIN yang salah: 111111
		for (const digit of ['1', '1', '1', '1', '1', '1']) {
			await lockScreen.getByRole('button', { name: digit, exact: true }).click();
		}

		// Pesan error salah PIN harus muncul
		const lockError = page.locator('[data-testid="pin-error-message"]');
		await expect(lockError).toBeVisible();
		await expect(lockError).toContainText('PIN salah');

		// Tunggu reset getar & input (600ms)
		await page.waitForTimeout(700);

		// 5. Masukkan PIN yang benar: 123456
		for (const digit of ['1', '2', '3', '4', '5', '6']) {
			await lockScreen.getByRole('button', { name: digit, exact: true }).click();
		}

		// Lock screen tertutup dan aplikasi terbuka kembali
		await expect(lockScreen).not.toBeVisible();
		await expect(mainContent).not.toHaveAttribute('inert', '');
	});

	test('Tentang Aplikasi (/settings/about) dan Statistik Penyimpanan Lokal', async ({ page }) => {
		await page.goto('/settings/about');
		await expect(page.locator('h1')).toHaveText('Tentang Aplikasi');

		// 1. Verifikasi header banner aplikasi
		await expect(page.getByText('Money Tracker')).toBeVisible();
		await expect(page.getByText('Versi 0.0.1')).toBeVisible();
		await expect(page.getByText('100% Data Lokal')).toBeVisible();

		// 2. Verifikasi komitmen privasi & arsitektur
		await expect(page.getByText('Tanpa Server & Tanpa Pelacak')).toBeVisible();
		await expect(page.getByText('Kriptografi Standar Industri')).toBeVisible();
		await expect(page.getByText('Dapat Digunakan Sepenuhnya Offline')).toBeVisible();

		// 3. Verifikasi metrik database
		await expect(page.locator('[data-testid="metric-wallets"]')).toBeVisible();
		await expect(page.locator('[data-testid="metric-categories"]')).toBeVisible();
		await expect(page.locator('[data-testid="metric-transactions"]')).toBeVisible();
		await expect(page.locator('[data-testid="metric-budgets"]')).toBeVisible();
	});

	test('tombol Uji Kamera OCR tidak tampil di /settings saat flag VITE_DEV_TOOLS mati', async ({
		page
	}) => {
		await page.goto('/settings');
		await expect(page.locator('[data-testid="dev-ocr-button"]')).toHaveCount(0);
	});
});
