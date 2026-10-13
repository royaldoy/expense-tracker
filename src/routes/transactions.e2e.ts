import { expect, test } from '@playwright/test';

test.describe('Alur Transaksi, Transfer, dan Laporan Keuangan (Transactions E2E)', () => {
	test('tambah pengeluaran -> saldo turun; edit nominal -> saldo konsisten; hapus -> saldo kembali; transfer -> kedua saldo benar & laporan hanya catat fee', async ({
		page
	}) => {
		// 1. Setup 2 Dompet Awal di /wallets/new
		// Dompet 1: Bank BCA (Saldo Rp1.000.000)
		await page.goto('/wallets/new');
		await page.locator('[data-testid="wallet-form-name"]').fill('Bank BCA');
		await page.locator('[data-testid="wallet-form-balance"]').fill('1000000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// Dompet 2: GoPay (Saldo Rp200.000)
		await page.locator('[data-testid="wallets-add-button"]').click();
		await expect(page).toHaveURL(/\/wallets\/new/);
		await page.locator('[data-testid="wallet-form-name"]').fill('GoPay');
		await page.locator('[data-testid="wallet-form-balance"]').fill('200000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// Verifikasi Saldo Awal Gabungan
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp1.200.000'
		);

		// 2. Tambah Pengeluaran di /transactions/new
		await page.goto('/transactions/new');
		await expect(page.getByText('Catat Transaksi')).toBeVisible();

		// Input nominal 100.000 lewat Keypad
		await page.locator('[data-testid="keypad-1"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="transaction-form-amount"]')).toContainText(
			'Rp100.000'
		);

		// Isi catatan pengeluaran
		await page.locator('[data-testid="transaction-note-input"]').fill('Makan Siang Resto');

		// Simpan transaksi
		await page.locator('[data-testid="transaction-form-submit"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// Pastikan riwayat transaksi menampilkan Makan Siang Resto
		const txRow = page
			.locator('[data-testid="transaction-row"]')
			.filter({ hasText: 'Makan Siang Resto' });
		await expect(txRow).toBeVisible();
		await expect(txRow).toContainText('-Rp100.000');

		// Verifikasi saldo dompet turun di /wallets
		await page.goto('/wallets');
		// Saldo Bank BCA turun dari 1.000.000 menjadi 900.000
		const bcaCard = page.locator('[data-testid="wallet-card"]').filter({ hasText: 'Bank BCA' });
		await expect(bcaCard).toContainText('Rp900.000');
		// Total saldo turun dari 1.200.000 menjadi 1.100.000
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp1.100.000'
		);

		// Verifikasi di /laporan: Pengeluaran tercatat Rp100.000
		await page.goto('/laporan');
		await expect(page.locator('[data-testid="report-total-expense"]')).toContainText('Rp100.000');
		await expect(page.locator('[data-testid="report-net-cashflow"]')).toContainText('-Rp100.000');

		// 3. Edit Nominal Pengeluaran (100.000 -> 150.000)
		await page.goto('/transactions');
		await txRow.click();
		await expect(page).toHaveURL(/\/transactions\/.+/);
		await expect(page.locator('[data-testid="transaction-detail-amount"]')).toContainText(
			'-Rp100.000'
		);

		// Buka form edit
		await page.locator('[data-testid="transaction-detail-edit-button"]').click();
		await expect(page).toHaveURL(/\/transactions\/.+\/edit/);

		// Hapus digit 100000 dengan backspace
		for (let i = 0; i < 6; i++) {
			await page.locator('[data-testid="keypad-backspace"]').click();
		}
		// Masukkan nominal baru: 150.000
		await page.locator('[data-testid="keypad-1"]').click();
		await page.locator('[data-testid="keypad-5"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="edit-transaction-amount-display"]')).toContainText(
			'Rp150.000'
		);

		// Simpan perubahan edit
		await page.locator('[data-testid="edit-transaction-submit-button"]').click();
		await expect(page).toHaveURL(/\/transactions\/.+/);
		await expect(page.locator('[data-testid="transaction-detail-amount"]')).toContainText(
			'-Rp150.000'
		);

		// Verifikasi saldo dompet konsisten setelah diedit
		await page.goto('/wallets');
		// Bank BCA: 1.000.000 - 150.000 = 850.000
		await expect(bcaCard).toContainText('Rp850.000');
		// Total saldo: 850.000 + 200.000 = 1.050.000
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp1.050.000'
		);

		// Verifikasi laporan: Pengeluaran berubah menjadi Rp150.000
		await page.goto('/laporan');
		await expect(page.locator('[data-testid="report-total-expense"]')).toContainText('Rp150.000');
		await expect(page.locator('[data-testid="report-net-cashflow"]')).toContainText('-Rp150.000');

		// 4. Hapus Transaksi & Verifikasi Saldo Kembali Penuh
		await page.goto('/transactions');
		await txRow.click();
		await page.locator('[data-testid="transaction-detail-delete-button"]').click();
		await page.locator('[data-testid="confirm-delete-tx-button"]').click();
		await expect(page).toHaveURL(/\/transactions$/);
		await expect(page.getByText('Belum Ada Transaksi')).toBeVisible();

		// Verifikasi saldo pulih seutuhnya di /wallets
		await page.goto('/wallets');
		await expect(bcaCard).toContainText('Rp1.000.000');
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp1.200.000'
		);

		// Verifikasi laporan pulih ke Rp0
		await page.goto('/laporan');
		await expect(page.locator('[data-testid="report-total-expense"]')).toContainText('Rp0');
		await expect(page.locator('[data-testid="report-net-cashflow"]')).toContainText('Rp0');

		// 5. Transfer Antar Dompet dengan Biaya Admin
		// Transfer dari Bank BCA ke GoPay sebesar Rp300.000 dengan Fee Rp2.500
		await page.goto('/transfer');
		await expect(page.getByText('Transfer Antar Dompet')).toBeVisible();

		// Gunakan tombol cepat +Rp200.000 dan keypad
		await page.locator('[data-testid="keypad-3"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="transfer-amount-display"]')).toContainText(
			'Rp300.000'
		);

		// Pilih biaya admin Rp2.500
		await page.locator('[data-testid="transfer-fee-trigger"]').click();
		await page.getByRole('button', { name: 'Rp2.500' }).click();
		await expect(page.locator('[data-testid="transfer-fee-trigger"]')).toContainText('Rp2.500');

		// Isi catatan transfer
		await page.locator('[data-testid="transfer-note-input"]').fill('Top up e-wallet GoPay');

		// Eksekusi transfer
		await page.locator('[data-testid="transfer-submit-button"]').click();
		await page.locator('[data-testid="transfer-success-done-button"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// Verifikasi saldo kedua dompet di /wallets:
		// Bank BCA: 1.000.000 - (300.000 + 2.500) = Rp697.500
		// GoPay: 200.000 + 300.000 = Rp500.000
		// Total Saldo Gabungan: 697.500 + 500.000 = Rp1.197.500
		await page.goto('/wallets');
		await expect(bcaCard).toContainText('Rp697.500');
		const gopayCard = page.locator('[data-testid="wallet-card"]').filter({ hasText: 'GoPay' });
		await expect(gopayCard).toContainText('Rp500.000');
		await expect(page.locator('[data-testid="wallets-total-balance"]')).toContainText(
			'Rp1.197.500'
		);

		// Verifikasi di /laporan:
		// ATURAN FINANSIAL: Pokok transfer (Rp300.000) TIDAK boleh masuk ke pemasukan maupun pengeluaran.
		// Hanya biaya admin transfer (Rp2.500) yang dicatat sebagai pengeluaran!
		await page.goto('/laporan');
		await expect(page.locator('[data-testid="report-total-income"]')).toContainText('Rp0');
		await expect(page.locator('[data-testid="report-total-expense"]')).toContainText('Rp2.500');
		await expect(page.locator('[data-testid="report-net-cashflow"]')).toContainText('-Rp2.500');
	});

	test('pencarian teks catatan & kategori, filter sheet multi-kriteria (dompet, kategori, nominal, tanggal), dan penghapusan chip filter aktif', async ({
		page
	}) => {
		// 1. Setup Dompet & Kategori via Onboarding
		await page.goto('/onboarding');
		await page.getByRole('button', { name: '+Rp500.000' }).click();
		await page.locator('[data-testid="onboarding-submit-button"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// Buat Transaksi 1: Kopi Susu (Rp25.000)
		await page.goto('/transactions/new');
		await expect(page.getByText('Catat Transaksi')).toBeVisible();
		await page.locator('[data-testid="keypad-2"]').click();
		await page.locator('[data-testid="keypad-5"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="transaction-form-amount"]')).toContainText('Rp25.000');
		await page.locator('[data-testid="transaction-note-input"]').fill('Kopi Susu Senja');
		await page.locator('[data-testid="transaction-form-submit"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// Buat Transaksi 2: Bensin Motor (Rp50.000)
		await page.goto('/transactions/new');
		await expect(page.getByText('Catat Transaksi')).toBeVisible();
		await page.locator('[data-testid="keypad-5"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await page.locator('[data-testid="keypad-0"]').click();
		await expect(page.locator('[data-testid="transaction-form-amount"]')).toContainText('Rp50.000');
		await page.locator('[data-testid="transaction-note-input"]').fill('Bensin Pertamax');
		await page.locator('[data-testid="transaction-form-submit"]').click();
		await expect(page).toHaveURL(/\/transactions$/);

		// 2. Uji Pencarian Teks
		const searchBtn = page.locator('[data-testid="transactions-search-button"]');
		await searchBtn.click();
		const searchInput = page.locator('[data-testid="transaction-search-input"]');
		await expect(searchInput).toBeVisible();

		// Cari "Kopi"
		await searchInput.fill('Kopi');
		await expect(page.locator('[data-testid="chip-search"]')).toContainText('Cari: "Kopi"');
		await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
		await expect(page.locator('[data-testid="transaction-row"]')).toContainText('Kopi Susu Senja');

		// Hapus chip pencarian via tombol x
		await page.locator('[data-testid="btn-remove-chip-search"]').click();
		await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(2);

		// 3. Uji Filter Sheet
		const filterBtn = page.locator('[data-testid="transactions-filter-button"]');
		await filterBtn.click();
		const filterSheet = page.locator('[data-testid="filter-sheet"]');
		await expect(filterSheet).toBeVisible();

		// Isi filter nominal minimum 40.000
		await page.locator('[data-testid="filter-min-amount"]').fill('40000');
		await page.locator('[data-testid="filter-apply-button"]').click();

		// Verifikasi hanya transaksi bensin yang tampil (Rp50.000 >= Rp40.000)
		await expect(page.locator('[data-testid="chip-amounts"]')).toBeVisible();
		await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
		await expect(page.locator('[data-testid="transaction-row"]')).toContainText('Bensin Pertamax');

		// Hapus chip nominal
		await page.locator('[data-testid="btn-remove-chip-amounts"]').click();
		await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(2);
	});

	test('ganti jenis transaksi dari sheet + saat /transactions/new sedang terbuka', async ({
		page
	}) => {
		// 1. Setup dompet awal
		await page.goto('/wallets/new');
		await page.locator('[data-testid="wallet-form-name"]').fill('Dompet Reaktif');
		await page.locator('[data-testid="wallet-form-balance"]').fill('500000');
		await page.locator('[data-testid="wallet-form-submit"]').click();
		await expect(page).toHaveURL(/\/wallets/);

		// 2. Buka Pengeluaran lewat tombol + (Aksi Cepat)
		await page.getByLabel('Aksi Cepat').click();
		await page.getByText('Catat Pengeluaran').click();
		await expect(page).toHaveURL(/\/transactions\/new\?type=expense/);
		await expect(page.getByText('Nominal Pengeluaran')).toBeVisible();

		// 3. Saat /transactions/new sedang terbuka, pilih Pemasukan dari sheet +
		await page.getByLabel('Aksi Cepat').click();
		await page.getByText('Catat Pemasukan').click();
		await expect(page).toHaveURL(/\/transactions\/new\?type=income/);
		await expect(page.getByText('Nominal Pemasukan')).toBeVisible();

		// 4. Dari /transactions/new, pilih Transfer dari sheet +
		await page.getByLabel('Aksi Cepat').click();
		await page.getByText('Transfer Saldo').click();
		await expect(page).toHaveURL(/\/transfer/);
		await expect(page.getByText('Nominal Transfer')).toBeVisible();
	});
});
