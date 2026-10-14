/**
 * securityStore
 * Store reaktif untuk status penguncian aplikasi (PIN Lock Screen).
 * Memantau event visibilitychange untuk auto-lock saat aplikasi diminimalkan / latar belakang.
 */

import { writable } from 'svelte/store';
import { pinSecurityService, type PinSecurityConfig } from '../services/pinSecurityService';

export const isLocked = writable<boolean>(false);
export const isPinSet = writable<boolean>(false);

let lastHiddenTimestamp: number | null = null;
let isInitialized = false;

export async function initSecurityStore(): Promise<void> {
	if (isInitialized) return;

	try {
		const pinEnabled = await pinSecurityService.isPinEnabled();
		isPinSet.set(pinEnabled);

		// Jika PIN aktif saat pertama kali aplikasi dibuka, kunci langsung
		if (pinEnabled) {
			isLocked.set(true);
		}
	} catch {
		isPinSet.set(false);
		isLocked.set(false);
	}

	// Daftarkan listener visibilitas untuk auto-lock di browser / PWA / Android
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', handleVisibilityChange);
	}

	isInitialized = true;
}

export async function refreshPinStatus(): Promise<boolean> {
	try {
		const pinEnabled = await pinSecurityService.isPinEnabled();
		isPinSet.set(pinEnabled);
		return pinEnabled;
	} catch {
		isPinSet.set(false);
		return false;
	}
}

export function lockApp(): void {
	isLocked.set(true);
}

export function unlockApp(): void {
	isLocked.set(false);
}

async function handleVisibilityChange(): Promise<void> {
	if (typeof document === 'undefined') return;

	if (document.visibilityState === 'hidden') {
		lastHiddenTimestamp = Date.now();
	} else if (document.visibilityState === 'visible') {
		if (lastHiddenTimestamp === null) return;

		const elapsed = Date.now() - lastHiddenTimestamp;
		lastHiddenTimestamp = null;

		try {
			const config: PinSecurityConfig = await pinSecurityService.getConfig();
			if (!config.enabled) return;

			// Jika autoLockTimeoutMs === -1, tidak pernah mengunci otomatis
			if (config.autoLockTimeoutMs === -1) return;

			// Jika 0 (langsung) atau selisih waktu melampaui timeout
			if (config.autoLockTimeoutMs === 0 || elapsed >= config.autoLockTimeoutMs) {
				isLocked.set(true);
			}
		} catch (error) {
			console.error('Gagal mengecek auto-lock:', error);
		}
	}
}
