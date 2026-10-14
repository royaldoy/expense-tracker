import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { pinSecurityService, bytesToHex, hexToBytes, timingSafeEqual } from './pinSecurityService';
import { db } from '../db/schema';

describe('PinSecurityService (Web Crypto PBKDF2 & Lockout)', () => {
	beforeEach(async () => {
		await db.settings.clear();
	});

	it('berhasil konversi bytes dan hex secara bolak-balik', () => {
		const original = new Uint8Array([0, 15, 255, 128, 42]);
		const hex = bytesToHex(original);
		expect(hex).toBe('000fff802a');
		const restored = hexToBytes(hex);
		expect(restored).toEqual(original);
	});

	it('timingSafeEqual mengembalikan true untuk array identik dan false untuk yang berbeda', () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 4]);
		const c = new Uint8Array([1, 2, 3, 5]);
		const d = new Uint8Array([1, 2, 3]);

		expect(timingSafeEqual(a, b)).toBe(true);
		expect(timingSafeEqual(a, c)).toBe(false);
		expect(timingSafeEqual(a, d)).toBe(false);
	});

	it('mengatur PIN baru, menghasilkan salt unik dan hash PBKDF2', async () => {
		expect(await pinSecurityService.isPinEnabled()).toBe(false);

		await pinSecurityService.setPin('123456');

		expect(await pinSecurityService.isPinEnabled()).toBe(true);
		const config = await pinSecurityService.getConfig();
		expect(config.enabled).toBe(true);
		expect(config.hashHex.length).toBe(64); // 32 bytes = 64 hex chars (SHA-256)
		expect(config.saltHex.length).toBe(32); // 16 bytes = 32 hex chars
		expect(config.failedAttempts).toBe(0);
		expect(config.lockoutUntil).toBeNull();
	});

	it('menolak format PIN yang bukan 6 digit angka', async () => {
		await expect(pinSecurityService.setPin('12345')).rejects.toThrow('PIN harus berupa 6 digit');
		await expect(pinSecurityService.setPin('1234567')).rejects.toThrow('PIN harus berupa 6 digit');
		await expect(pinSecurityService.setPin('123a56')).rejects.toThrow('PIN harus berupa 6 digit');
	});

	it('verifikasi PIN benar mengembalikan success true', async () => {
		await pinSecurityService.setPin('654321');

		const result = await pinSecurityService.verifyPin('654321');
		expect(result.success).toBe(true);
		expect(result.lockedOut).toBe(false);
	});

	it('verifikasi PIN salah mengurangi sisa kesempatan', async () => {
		await pinSecurityService.setPin('654321');

		const res1 = await pinSecurityService.verifyPin('000000');
		expect(res1.success).toBe(false);
		expect(res1.lockedOut).toBe(false);
		expect(res1.remainingAttempts).toBe(4);

		const res2 = await pinSecurityService.verifyPin('111111');
		expect(res2.success).toBe(false);
		expect(res2.remainingAttempts).toBe(3);
	});

	it('memicu lockout 30 detik setelah 5 kali gagal berturut-turut', async () => {
		await pinSecurityService.setPin('654321');

		for (let i = 0; i < 4; i++) {
			const res = await pinSecurityService.verifyPin('000000');
			expect(res.success).toBe(false);
			expect(res.lockedOut).toBe(false);
		}

		// Percobaan ke-5 memicu lockout
		const res5 = await pinSecurityService.verifyPin('000000');
		expect(res5.success).toBe(false);
		expect(res5.lockedOut).toBe(true);
		expect(res5.lockoutRemainingSeconds).toBe(30);

		// Percobaan selanjutnya langsung ditolak selama masa lockout bahkan jika PIN benar
		const resBlocked = await pinSecurityService.verifyPin('654321');
		expect(resBlocked.success).toBe(false);
		expect(resBlocked.lockedOut).toBe(true);
		expect(resBlocked.error).toContain('Aplikasi terkunci');
	});

	it('mereset counter kegagalan saat PIN benar dimasukkan', async () => {
		await pinSecurityService.setPin('123456');

		// 3 kali gagal
		await pinSecurityService.verifyPin('000000');
		await pinSecurityService.verifyPin('000000');
		await pinSecurityService.verifyPin('000000');

		let config = await pinSecurityService.getConfig();
		expect(config.failedAttempts).toBe(3);

		// Input benar
		const res = await pinSecurityService.verifyPin('123456');
		expect(res.success).toBe(true);

		config = await pinSecurityService.getConfig();
		expect(config.failedAttempts).toBe(0);
		expect(config.lockoutUntil).toBeNull();
	});

	it('ganti PIN dan nonaktifkan PIN dengan verifikasi PIN lama', async () => {
		await pinSecurityService.setPin('123456');

		// Gagal jika PIN lama salah
		const failChange = await pinSecurityService.changePin('000000', '654321');
		expect(failChange).toBe(false);

		// Berhasil jika PIN lama benar
		const successChange = await pinSecurityService.changePin('123456', '654321');
		expect(successChange).toBe(true);

		// Verifikasi PIN baru aktif
		expect((await pinSecurityService.verifyPin('654321')).success).toBe(true);
		expect((await pinSecurityService.verifyPin('123456')).success).toBe(false);

		// Nonaktifkan PIN
		const disabled = await pinSecurityService.disablePin('654321');
		expect(disabled).toBe(true);
		expect(await pinSecurityService.isPinEnabled()).toBe(false);
	});
});
