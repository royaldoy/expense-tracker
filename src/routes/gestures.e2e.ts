import { expect, test, type Page } from '@playwright/test';

test.describe('Gestur Cepat Beranda (Quick Gestures E2E)', () => {
	test.use({
		hasTouch: true,
		viewport: { width: 390, height: 844 }
	});

	// Helper simulasi gerakan sentuhan multi-langkah
	async function simulateTouchGesture(
		page: Page,
		selector: string,
		start: { x: number; y: number },
		end: { x: number; y: number },
		steps = 5
	) {
		await page.waitForSelector(selector);
		await page.evaluate(
			({
				sel,
				start,
				end,
				steps
			}: {
				sel: string;
				start: { x: number; y: number };
				end: { x: number; y: number };
				steps: number;
			}) => {
				const el = document.querySelector(sel);
				if (!el) throw new Error(`Elemen ${sel} tidak ditemukan`);

				function makeTouch(x: number, y: number, target: Element) {
					if (typeof window.Touch !== 'undefined') {
						return new Touch({
							identifier: 1,
							target,
							clientX: x,
							clientY: y,
							pageX: x,
							pageY: y,
							screenX: x,
							screenY: y
						});
					}
					return {
						identifier: 1,
						target,
						clientX: x,
						clientY: y,
						pageX: x,
						pageY: y,
						screenX: x,
						screenY: y
					} as unknown as Touch;
				}

				// 1. Touch Start
				const tStart = makeTouch(start.x, start.y, el);
				const evStart =
					typeof TouchEvent !== 'undefined'
						? new TouchEvent('touchstart', {
								bubbles: true,
								cancelable: true,
								touches: [tStart],
								targetTouches: [tStart],
								changedTouches: [tStart]
							})
						: new CustomEvent('touchstart', {
								bubbles: true,
								cancelable: true,
								detail: { touches: [tStart] }
							});
				if (!('touches' in evStart)) {
					Object.defineProperty(evStart, 'touches', { value: [tStart] });
				}
				el.dispatchEvent(evStart);

				// 2. Touch Move Steps
				for (let i = 1; i <= steps; i++) {
					const curX = start.x + ((end.x - start.x) * i) / steps;
					const curY = start.y + ((end.y - start.y) * i) / steps;
					const tMove = makeTouch(curX, curY, el);
					const evMove =
						typeof TouchEvent !== 'undefined'
							? new TouchEvent('touchmove', {
									bubbles: true,
									cancelable: true,
									touches: [tMove],
									targetTouches: [tMove],
									changedTouches: [tMove]
								})
							: new CustomEvent('touchmove', {
									bubbles: true,
									cancelable: true,
									detail: { touches: [tMove] }
								});
					if (!('touches' in evMove)) {
						Object.defineProperty(evMove, 'touches', { value: [tMove] });
					}
					el.dispatchEvent(evMove);
				}

				// 3. Touch End
				const tEnd = makeTouch(end.x, end.y, el);
				const evEnd =
					typeof TouchEvent !== 'undefined'
						? new TouchEvent('touchend', {
								bubbles: true,
								cancelable: true,
								touches: [],
								targetTouches: [],
								changedTouches: [tEnd]
							})
						: new CustomEvent('touchend', {
								bubbles: true,
								cancelable: true,
								detail: { changedTouches: [tEnd] }
							});
				if (!('touches' in evEnd)) {
					Object.defineProperty(evEnd, 'touches', { value: [] });
					Object.defineProperty(evEnd, 'changedTouches', { value: [tEnd] });
				}
				el.dispatchEvent(evEnd);
			},
			{ sel: selector, start, end, steps }
		);
	}

	test('1. Banner petunjuk edukasi gestur cepat tampil dan dapat ditutup secara persisten', async ({
		page
	}) => {
		await page.goto('/');

		// Verifikasi banner petunjuk tampil pada awal
		const banner = page.locator('[data-testid="gesture-hint-banner"]');
		await expect(banner).toBeVisible();

		// Klik tombol paham / dismiss
		const dismissBtn = page.locator('[data-testid="gesture-hint-dismiss-button"]');
		await dismissBtn.click();

		// Banner harus menghilang
		await expect(banner).toHaveCount(0);

		// Tunggu transaksi IndexedDB tuntas sebelum reload
		await page.waitForTimeout(200);

		// Reload halaman, verifikasi banner tidak muncul lagi karena status sudah tersimpan
		await page.reload();
		await page.waitForTimeout(300);
		await expect(page.locator('[data-testid="gesture-hint-banner"]')).toHaveCount(0);
	});

	test('2. Swipe kanan dari jarak aman (>= 32px) membuka alur scan dan tombol kembali menjaga state Beranda', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.locator('[data-testid="home-gesture-container"]')).toBeVisible();

		// Catat saldo aktif sebelum gestur
		const balanceTextBefore = await page
			.locator('[data-testid="dashboard-total-balance"]')
			.textContent();

		// Lakukan swipe kanan (mulai dari X=60px > 32px tepi, geser sejauh +150px)
		await simulateTouchGesture(
			page,
			'[data-testid="home-gesture-container"]',
			{ x: 60, y: 200 },
			{ x: 220, y: 205 },
			6
		);

		// Halaman harus berpindah ke /scan
		await expect(page).toHaveURL(/\/scan/);
		await expect(page.locator('text=Scan Struk Belanja')).toBeVisible();

		// Klik tombol kembali di layar scan
		await page.click('button:has-text("Kembali")');

		// Kembali ke Beranda dengan saldo dan state utuh
		await expect(page).toHaveURL('/');
		const balanceTextAfter = await page
			.locator('[data-testid="dashboard-total-balance"]')
			.textContent();
		expect(balanceTextAfter).toBe(balanceTextBefore);
	});

	test('3. Swipe kanan di zona tepi Android (startX < 32px) diabaikan untuk menghindari konflik gesture back', async ({
		page
	}) => {
		await page.goto('/');

		// Sentuhan dimulai di X=15px (< 32px)
		await simulateTouchGesture(
			page,
			'[data-testid="home-gesture-container"]',
			{ x: 15, y: 250 },
			{ x: 180, y: 250 },
			6
		);

		// Tetap berada di Beranda, tidak memicu scan
		await page.waitForTimeout(200);
		await expect(page).toHaveURL('/');
	});

	test('4. Sentuhan pada elemen bertanda data-no-gesture (strip dompet) diabaikan', async ({
		page
	}) => {
		await page.goto('/');

		// Tunggu strip dompet ter-render
		const walletStrip = page.locator('[data-testid="home-wallet-strip"]');
		if ((await walletStrip.count()) > 0) {
			// Lakukan geser ke kanan dari strip dompet
			await simulateTouchGesture(
				page,
				'[data-testid="home-wallet-strip"]',
				{ x: 80, y: 400 },
				{ x: 260, y: 400 },
				6
			);

			// Tetap di Beranda
			await page.waitForTimeout(200);
			await expect(page).toHaveURL('/');
		}
	});

	test('5. Tarik turun dari scrollTop = 0 membuka alur suara (VoiceInputModal) dan batal mengembalikan ke Beranda', async ({
		page
	}) => {
		await page.goto('/');

		// Lakukan tarik turun vertikal (mulai Y=80 > 36 status bar, geser turun +140px)
		await simulateTouchGesture(
			page,
			'[data-testid="home-gesture-container"]',
			{ x: 150, y: 80 },
			{ x: 155, y: 240 },
			6
		);

		// Alur suara berjalan: modal suara memproses input dan membuka form transaksi suara
		await expect(page).toHaveURL(/\/transactions\/new\?from=voice/);

		// Tekan tombol Kembali pada form transaksi untuk membatalkan
		const backBtn = page.locator('button[aria-label="Kembali"]');
		await expect(backBtn).toBeVisible();
		await backBtn.click();

		// Kembali ke Beranda dengan state utuh
		await expect(page).toHaveURL('/');
	});

	test('6. Gerakan di bawah ambang batas (under threshold) memicu gerak pegas balik tanpa menjalankan aksi', async ({
		page
	}) => {
		await page.goto('/');

		// Gerakan kecil (deltaX hanya 20px, di bawah threshold 75px)
		await simulateTouchGesture(
			page,
			'[data-testid="home-gesture-container"]',
			{ x: 50, y: 200 },
			{ x: 70, y: 200 },
			3
		);

		// Tetap berada di Beranda
		await page.waitForTimeout(200);
		await expect(page).toHaveURL('/');
	});

	test('7. Toggle "Gestur Cepat" di Pengaturan menonaktifkan gestur di Beranda', async ({
		page
	}) => {
		// 1. Masuk ke Pengaturan
		await page.goto('/settings');
		const gestureSwitch = page.locator('[data-testid="toggle-quick-gestures-switch"]');
		await expect(gestureSwitch).toBeVisible();

		// Pastikan toggle dalam keadaan aktif awal
		await expect(gestureSwitch).toHaveAttribute('aria-checked', 'true');

		// Matikan toggle dan tunggu sampai state aria-checked menjadi false
		await gestureSwitch.click();
		await expect(gestureSwitch).toHaveAttribute('aria-checked', 'false');

		// 2. Kembali ke Beranda lewat tombol kembali di header
		await page.click('a[aria-label="Kembali ke Beranda"]');
		await expect(page).toHaveURL('/');

		// Lakukan swipe kanan sejauh +160px yang biasanya memicu scan
		await simulateTouchGesture(
			page,
			'[data-testid="home-gesture-container"]',
			{ x: 60, y: 200 },
			{ x: 240, y: 205 },
			6
		);

		// Verifikasi halaman TIDAK berpindah ke /scan karena preferensi nonaktif
		await page.waitForTimeout(200);
		await expect(page).toHaveURL('/');

		// 3. Hidupkan kembali toggle di Pengaturan
		await page.goto('/settings');
		await gestureSwitch.click();
		await expect(gestureSwitch).toHaveAttribute('aria-checked', 'true');
	});
});
