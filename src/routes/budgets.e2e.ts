import { expect, test } from '@playwright/test';

test.describe('Alur Pengelolaan Anggaran Bulanan (Budgets E2E)', () => {
	test('dapat mengatur anggaran kategori, memantau perubahan status ambang batas saat transaksi dicatat, dan tersinkronisasi di dashboard', async ({
		page
	}) => {
		// 1. Setup Dompet Awal di /wallets/new
		await page.goto('/wallets/new');
		await page.locator('[data-testid="wallet-form-name"]').fill('Bank Dompet');
		await page.locator('[data-testid="wallet-form-balance"]').fill('3000000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets$/);

		// 2. Akses halaman anggaran melalui /budgets (dan periksa pengalihan alias /anggaran)
		await page.goto('/anggaran');
		await expect(page).toHaveURL(/\/budgets$/);
		await expect(page.locator('[data-testid="budgets-page-title"]')).toContainText(
			'Anggaran Bulanan'
		);

		// 3. Verifikasi tampilan awal: Belum ada anggaran
		await expect(page.getByText('Belum Ada Anggaran')).toBeVisible();

		// 4. Buka sheet atur anggaran baru
		const openAddBtn = page.locator('[data-testid="btn-open-create-budget"]');
		await expect(openAddBtn).toBeVisible();
		await openAddBtn.click();

		// Modal Sheet terbuka
		await expect(page.getByText('Atur Anggaran Baru')).toBeVisible();

		// Pilih kategori pengeluaran pertama yang tersedia
		const firstCatChip = page.locator('[data-testid^="category-chip-"]').first();
		await expect(firstCatChip).toBeVisible();
		const selectedCatName = (await firstCatChip.textContent())?.trim() ?? 'Makanan & Minuman';
		await firstCatChip.click();

		// Masukkan limit Rp1.000.000
		const limitInput = page.locator('[data-testid="budget-limit-input"]');
		await expect(limitInput).toBeVisible();
		await limitInput.fill('1000000');

		// Pilih ambang peringatan 80%
		await page.locator('[data-testid="preset-threshold-80"]').click();
		await expect(page.locator('[data-testid="alert-threshold-label"]')).toContainText('80%');

		// Simpan anggaran
		const submitBtn = page.locator('[data-testid="budget-form-submit"]');
		await submitBtn.click();

		// 5. Verifikasi kartu anggaran muncul di /budgets
		await expect(page.locator('[data-testid="hero-budget-card"]')).toBeVisible();
		await expect(page.locator('[data-testid="total-spent-display"]')).toContainText('Rp0');
		await expect(page.locator('[data-testid="total-percentage-badge"]')).toContainText('0%');
		await expect(page.locator('[data-testid="total-remaining-display"]')).toContainText(
			'Rp1.000.000'
		);

		// Kartu kategori muncul
		const budgetItem = page.locator('[data-testid="budget-items-list"]');
		await expect(budgetItem).toContainText(selectedCatName);
		await expect(budgetItem).toContainText('Aman (0%)');

		// 6. Catat pengeluaran sebesar Rp850.000 untuk kategori tersebut di /transactions/new
		await page.goto('/transactions/new?type=expense');
		await expect(page.getByText('Catat Transaksi')).toBeVisible();

		// Input nominal 850.000 lewat Keypad
		await page.locator('[data-testid="keypad-8"]').click();
		await page.locator('[data-testid="keypad-5"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="transaction-form-amount"]')).toContainText(
			'Rp850.000'
		);

		// Pilih kategori yang sesuai lewat picker sheet
		await page.locator('[data-testid="transaction-category-trigger"]').click();
		// Klik opsi kategori
		await page
			.locator(`[data-testid^="category-option-"]`)
			.filter({ hasText: selectedCatName })
			.first()
			.click();

		// Simpan transaksi
		await page.locator('[data-testid="transaction-form-submit"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// 7. Kembali ke /budgets dan verifikasi status keterpakaian berubah menjadi "Waspada (85%)"
		await page.goto('/budgets');
		await expect(page.locator('[data-testid="total-spent-display"]')).toContainText('Rp850.000');
		await expect(page.locator('[data-testid="total-percentage-badge"]')).toContainText('85%');
		await expect(page.locator('[data-testid="total-remaining-display"]')).toContainText(
			'Rp150.000'
		);
		await expect(page.locator('[data-testid="budget-items-list"]')).toContainText('Waspada (85%)');

		// 8. Buka Dashboard (/) dan pastikan ringkasan anggaran tampil dengan angka identik
		await page.goto('/');
		const dashBudgetCard = page.locator('[data-testid="dashboard-budget-card"]');
		await expect(dashBudgetCard).toBeVisible();
		await expect(page.locator('[data-testid="dashboard-budget-spent"]')).toContainText('Rp850.000');
		await expect(page.locator('[data-testid="dashboard-budget-remaining"]')).toContainText(
			'Rp150.000'
		);
		await expect(page.locator('[data-testid="dashboard-budget-status"]')).toContainText(
			'85% (Waspada)'
		);

		// 9. Dari Dashboard, klik kartu anggaran untuk kembali ke /budgets
		await dashBudgetCard.click();
		await expect(page).toHaveURL(/\/budgets$/);

		// 10. Ubah (Edit) limit anggaran menjadi Rp2.000.000
		const editBtn = page.locator('[data-testid^="btn-edit-budget-"]').first();
		await editBtn.click();

		await expect(page.getByText('Ubah Anggaran')).toBeVisible();
		await page.locator('[data-testid="budget-limit-input"]').fill('2000000');
		await page.locator('[data-testid="budget-form-submit"]').click();

		// Verifikasi persentase turun menjadi 43% dan status kembali ke Aman
		await expect(page.locator('[data-testid="total-percentage-badge"]')).toContainText('43%');
		await expect(page.locator('[data-testid="budget-items-list"]')).toContainText('Aman (43%)');
	});
});
