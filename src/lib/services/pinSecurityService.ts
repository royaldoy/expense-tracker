/**
 * PinSecurityService
 * Keamanan PIN 6-digit menggunakan Web Crypto PBKDF2 (SHA-256, 100.000 iterasi, 16-byte salt).
 * Menyediakan proteksi timing-safe, mekanisme lockout 30 detik setelah 5 kegagalan berturut-turut,
 * serta persistensi konfigurasi di IndexedDB via settingService.
 */

import { settingService, SETTING_KEYS } from './settingService';

export interface PinSecurityConfig {
	enabled: boolean;
	hashHex: string;
	saltHex: string;
	failedAttempts: number;
	lockoutUntil: number | null; // Unix timestamp ms
	autoLockTimeoutMs: number; // 0 = immediate, 60000 = 1 min, 300000 = 5 min, -1 = never
}

export interface VerifyPinResult {
	success: boolean;
	lockedOut: boolean;
	lockoutRemainingSeconds?: number;
	remainingAttempts?: number;
	error?: string;
}

const DEFAULT_PIN_CONFIG: PinSecurityConfig = {
	enabled: false,
	hashHex: '',
	saltHex: '',
	failedAttempts: 0,
	lockoutUntil: null,
	autoLockTimeoutMs: 0
};

const ITERATIONS = 100_000;
const HASH_BITS = 256; // 32 bytes SHA-256
const SALT_BYTES = 16;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 detik

export function bytesToHex(bytes: Uint8Array): string {
	let hex = '';
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, '0');
	}
	return hex;
}

export function hexToBytes(hex: string): Uint8Array {
	if (!hex || hex.length % 2 !== 0) return new Uint8Array(0);
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Perbandingan timing-safe untuk menghindari timing attack / side-channel leaks.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

export class PinSecurityService {
	/**
	 * Derivasi PBKDF2 SHA-256 menggunakan native Web Crypto API.
	 */
	async deriveHash(pin: string, salt: Uint8Array): Promise<Uint8Array> {
		const cryptoObj = globalThis.crypto;
		if (!cryptoObj || !cryptoObj.subtle) {
			throw new Error('Web Crypto API tidak didukung pada platform ini');
		}

		const keyMaterial = await cryptoObj.subtle.importKey(
			'raw',
			new TextEncoder().encode(pin),
			{ name: 'PBKDF2' },
			false,
			['deriveBits']
		);

		const derived = await cryptoObj.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: salt as unknown as BufferSource,
				iterations: ITERATIONS,
				hash: 'SHA-256'
			},
			keyMaterial,
			HASH_BITS
		);

		return new Uint8Array(derived);
	}

	async getConfig(): Promise<PinSecurityConfig> {
		const config = await settingService.get<PinSecurityConfig>(SETTING_KEYS.PIN_SECURITY);
		if (!config) return { ...DEFAULT_PIN_CONFIG };
		return { ...DEFAULT_PIN_CONFIG, ...config };
	}

	async saveConfig(config: PinSecurityConfig): Promise<void> {
		await settingService.set<PinSecurityConfig>(SETTING_KEYS.PIN_SECURITY, config);
	}

	async isPinEnabled(): Promise<boolean> {
		const config = await this.getConfig();
		return config.enabled && config.hashHex.length > 0;
	}

	/**
	 * Atur PIN 6-digit baru.
	 */
	async setPin(newPin: string): Promise<void> {
		if (!/^\d{6}$/.test(newPin)) {
			throw new Error('PIN harus berupa 6 digit angka');
		}

		const salt = new Uint8Array(SALT_BYTES);
		globalThis.crypto.getRandomValues(salt);

		const hashBytes = await this.deriveHash(newPin, salt);

		const current = await this.getConfig();
		const updated: PinSecurityConfig = {
			...current,
			enabled: true,
			hashHex: bytesToHex(hashBytes),
			saltHex: bytesToHex(salt),
			failedAttempts: 0,
			lockoutUntil: null
		};

		await this.saveConfig(updated);
	}

	/**
	 * Verifikasi PIN yang dimasukkan dengan mekanisme lockout.
	 */
	async verifyPin(enteredPin: string): Promise<VerifyPinResult> {
		const config = await this.getConfig();

		if (!config.enabled || !config.hashHex || !config.saltHex) {
			return { success: true, lockedOut: false };
		}

		const now = Date.now();

		// Periksa apakah sedang dalam masa penalti lockout
		if (config.lockoutUntil && now < config.lockoutUntil) {
			const remaining = Math.ceil((config.lockoutUntil - now) / 1000);
			return {
				success: false,
				lockedOut: true,
				lockoutRemainingSeconds: remaining,
				error: `Aplikasi terkunci. Silakan coba lagi dalam ${remaining} detik.`
			};
		}

		const saltBytes = hexToBytes(config.saltHex);
		const expectedHashBytes = hexToBytes(config.hashHex);

		const enteredHashBytes = await this.deriveHash(enteredPin, saltBytes);
		const matches = timingSafeEqual(enteredHashBytes, expectedHashBytes);

		if (matches) {
			// Reset kegagalan dan penalti lockout saat PIN benar
			if (config.failedAttempts > 0 || config.lockoutUntil !== null) {
				await this.saveConfig({
					...config,
					failedAttempts: 0,
					lockoutUntil: null
				});
			}
			return { success: true, lockedOut: false };
		}

		// PIN salah: hitung kegagalan
		const failed = config.failedAttempts + 1;
		if (failed >= MAX_ATTEMPTS) {
			const lockoutUntil = now + LOCKOUT_DURATION_MS;
			await this.saveConfig({
				...config,
				failedAttempts: failed,
				lockoutUntil
			});
			return {
				success: false,
				lockedOut: true,
				lockoutRemainingSeconds: 30,
				remainingAttempts: 0,
				error: 'Terlalu banyak percobaan salah. Aplikasi terkunci selama 30 detik.'
			};
		}

		await this.saveConfig({
			...config,
			failedAttempts: failed
		});

		const remaining = MAX_ATTEMPTS - failed;
		return {
			success: false,
			lockedOut: false,
			remainingAttempts: remaining,
			error: `PIN salah. Sisa kesempatan: ${remaining} kali.`
		};
	}

	/**
	 * Nonaktifkan kunci PIN dengan verifikasi PIN saat ini terlebih dahulu.
	 */
	async disablePin(currentPin: string): Promise<boolean> {
		const verifyResult = await this.verifyPin(currentPin);
		if (!verifyResult.success) {
			return false;
		}

		const config = await this.getConfig();
		await this.saveConfig({
			...config,
			enabled: false,
			hashHex: '',
			saltHex: '',
			failedAttempts: 0,
			lockoutUntil: null
		});

		return true;
	}

	/**
	 * Ganti PIN lama dengan PIN baru.
	 */
	async changePin(oldPin: string, newPin: string): Promise<boolean> {
		const verifyResult = await this.verifyPin(oldPin);
		if (!verifyResult.success) {
			return false;
		}

		await this.setPin(newPin);
		return true;
	}

	/**
	 * Ubah batas waktu auto-lock dalam milidetik.
	 */
	async setAutoLockTimeout(timeoutMs: number): Promise<void> {
		const config = await this.getConfig();
		await this.saveConfig({
			...config,
			autoLockTimeoutMs: timeoutMs
		});
	}
}

export const pinSecurityService = new PinSecurityService();
