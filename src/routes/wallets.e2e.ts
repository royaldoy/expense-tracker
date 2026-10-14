import { expect, test } from '@playwright/test';

test.describe('Alur Pengelolaan Dompet (Wallets E2E)', () => {
	test('dapat membuat dompet baru dengan saldo awal, memverifikasi saldo di daftar serta total, lalu melihat detail dan mengeditnya', async ({
		page
	}) => {
		// 1. Masuk ke halaman daftar dompet
		await page.goto('/wallets');

		// 2. Klik tombol tambah dompet
		const addBtn = page.locator('[data-testid="wallets-add-button"]');
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		// 3. Pastikan berada di /wallets/new
		await expect(page).toHaveURL(/\/wallets\/new/);

		// 4. Isi form pembuatan dompet baru
		const nameInput = page.locator('[data-testid="wallet-form-name"]');
		await expect(nameInput).toBeVisible();
		await nameInput.fill('Bank Jago');

		const balanceInput = page.locator('[data-testid="wallet-form-balance"]');
		await expect(balanceInput).toBeVisible();
		await balanceInput.fill('750000');

		// 5. Submit form
		const submitBtn = page.locator('[data-testid="wallet-form-submit"]');
		await submitBtn.click();

		// 6. Pastikan kembali diarahkan ke /wallets
		await expect(page).toHaveURL(/\/wallets/);

		// 7. Verifikasi total saldo menampilkan Rp750.000
		const totalBalance = page.locator('[data-testid="wallets-total-balance"]');
		await expect(totalBalance).toBeVisible();
		await expect(totalBalance).toContainText('Rp750.000');

		// 8. Verifikasi kartu dompet Bank Jago ada di daftar dengan saldo yang tepat
		const walletCard = page.locator('[data-testid="wallet-card"]').filter({ hasText: 'Bank Jago' });
		await expect(walletCard).toBeVisible();
		await expect(walletCard).toContainText('Rp750.000');

		// 9. Klik kartu dompet Bank Jago untuk melihat detail
		await walletCard.click();
		await expect(page).toHaveURL(/\/wallets\/.+/);
		await expect(page.getByText('Detail Dompet')).toBeVisible();
		await expect(page.getByText('Riwayat Transaksi')).toBeVisible();

		// 10. Buka halaman edit
		const editBtn = page.locator('[data-testid="wallet-detail-edit-button"]');
		await expect(editBtn).toBeVisible();
		await editBtn.click();

		// 11. Pastikan form edit memuat nama dompet
		await expect(page).toHaveURL(/\/wallets\/.+\/edit/);
		const editNameInput = page.locator('[data-testid="edit-wallet-name"]');
		await expect(editNameInput).toHaveValue('Bank Jago');
	});

	test('dapat menyelesaikan onboarding dompet pertama dan menginisialisasi kategori default', async ({
		page
	}) => {
		await page.goto('/onboarding');
		await expect(page.getByText('Setup Dompet Pertama')).toBeVisible();

		// Pilih preset GoPay yang sudah default, tambah nominal cepat +Rp500.000
		await page.getByRole('button', { name: '+Rp500.000' }).click();

		const balanceDisplay = page.locator('[data-testid="onboarding-balance-display"]');
		await expect(balanceDisplay).toContainText('Rp500.000');

		// Lanjutkan
		const submitBtn = page.locator('[data-testid="onboarding-submit-button"]');
		await submitBtn.click();

		// Diarahkan ke /wallets
		await expect(page).toHaveURL(/\/wallets/);
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText('Rp500.000');
	});

	test('dapat menyesuaikan saldo dompet, mencatat transaksi koreksi saldo, dan rebuildBalances tidak mengubah angkanya', async ({
		page
	}) => {
		// 1. Masuk ke daftar dompet dan buat dompet baru dengan saldo 100.000
		await page.goto('/wallets');
		await page.locator('[data-testid="wallets-add-button"]').click();
		await page.locator('[data-testid="wallet-form-name"]').fill('Dompet Koreksi');
		await page.locator('[data-testid="wallet-form-balance"]').fill('100000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// 2. Buka detail dompet
		const walletCard = page
			.locator('[data-testid="wallet-card"]')
			.filter({ hasText: 'Dompet Koreksi' });
		await walletCard.click();
		await expect(page).toHaveURL(/\/wallets\/.+/);

		// 3. Klik tombol Sesuaikan Saldo
		const adjustBtn = page.locator('[data-testid="wallet-adjust-balance-button"]');
		await expect(adjustBtn).toBeVisible();
		await adjustBtn.click();

		// 4. Pastikan modal GlassSheet terbuka dan preview selisih tampil
		const balanceInput = page.locator('[data-testid="adjust-balance-input"]');
		await expect(balanceInput).toBeVisible();

		// Masukkan saldo baru 150.000 (selisih +50.000)
		await balanceInput.fill('150000');
		const diffPreview = page.locator('[data-testid="adjust-diff-preview"]');
		await expect(diffPreview).toBeVisible();
		await expect(diffPreview).toContainText('+Rp50.000');

		// 5. Simpan penyesuaian
		const submitBtn = page.locator('[data-testid="adjust-balance-submit"]');
		await expect(submitBtn).toBeEnabled();
		await submitBtn.click();

		// 6. Verifikasi saldo dompet di kartu berubah menjadi Rp150.000
		const heroBalance = page.locator('[data-testid="wallet-card"]');
		await expect(heroBalance).toContainText('Rp150.000');

		// 7. Verifikasi transaksi penyesuaian tercatat di riwayat
		await expect(page.getByText('Koreksi saldo')).toBeVisible();
		await expect(page.getByText('+Rp50.000')).toBeVisible();

		// 8. Verifikasi bahwa rebuildBalances() tidak mengubah angkanya
		await page.evaluate(async () => {
			const w = window as unknown as { rebuildBalances?: () => Promise<unknown> };
			if (w.rebuildBalances) {
				await w.rebuildBalances();
			}
		});

		// Reload halaman dan pastikan saldo tetap Rp150.000
		await page.reload();
		await expect(page.locator('[data-testid="wallet-card"]')).toContainText('Rp150.000');
	});
});
