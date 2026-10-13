/**
 * uiStore
 * Store reaktif untuk preferensi UI global:
 * - Sensor saldo (hideBalance)
 * - Sistem Animasi (animationMode: 'full' | 'minimal' | 'off')
 * - Umpan balik getaran (hapticsEnabled: boolean)
 * Tersinkronisasi secara otomatis dengan IndexedDB melalui settingService.
 */

import { get, writable } from 'svelte/store';
import { platform } from '../platform';
import type { HapticImpactStyle, HapticNotificationType } from '../platform/types';
import { settingService } from '../services/settingService';

export type AnimationMode = 'full' | 'minimal' | 'off';

export const hideBalance = writable<boolean>(false);
export const animationMode = writable<AnimationMode>('full');
export const hapticsEnabled = writable<boolean>(true);

let isInitialized = false;

export function applyMotionModeToDocument(mode: AnimationMode): void {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-motion', mode);
	}
}

export async function initUiStore(): Promise<void> {
	if (isInitialized) return;
	try {
		const [savedHide, savedAnim, savedHaptics] = await Promise.all([
			settingService.getHideBalance(),
			settingService.getAnimationMode(),
			settingService.getHapticsEnabled()
		]);

		hideBalance.set(savedHide);
		animationMode.set(savedAnim);
		hapticsEnabled.set(savedHaptics);
		applyMotionModeToDocument(savedAnim);

		isInitialized = true;
	} catch {
		// Fallback jika database belum siap
		hideBalance.set(false);
		animationMode.set('full');
		hapticsEnabled.set(true);
		applyMotionModeToDocument('full');
	}
}

export async function setHideBalancePreference(val: boolean): Promise<void> {
	hideBalance.set(val);
	try {
		await settingService.setHideBalance(val);
	} catch (error) {
		console.error('Gagal menyimpan preferensi hideBalance:', error);
	}
}

export async function toggleHideBalance(): Promise<boolean> {
	let nextVal = false;
	hideBalance.update((curr) => {
		nextVal = !curr;
		return nextVal;
	});
	try {
		await settingService.setHideBalance(nextVal);
	} catch (error) {
		console.error('Gagal menyimpan preferensi hideBalance:', error);
	}
	return nextVal;
}

export async function setAnimationModePreference(mode: AnimationMode): Promise<void> {
	animationMode.set(mode);
	applyMotionModeToDocument(mode);
	try {
		await settingService.setAnimationMode(mode);
	} catch (error) {
		console.error('Gagal menyimpan preferensi animationMode:', error);
	}
}

export async function setHapticsPreference(enabled: boolean): Promise<void> {
	hapticsEnabled.set(enabled);
	try {
		await settingService.setHapticsEnabled(enabled);
	} catch (error) {
		console.error('Gagal menyimpan preferensi hapticsEnabled:', error);
	}
}

/**
 * Pemicu Haptic dari antarmuka pengguna (hanya dieksekusi bila toggle getaran aktif)
 */
export async function triggerHapticImpact(style: HapticImpactStyle = 'light'): Promise<void> {
	if (!get(hapticsEnabled)) return;
	await platform.haptics.impact(style);
}

export async function triggerHapticNotification(
	type: HapticNotificationType = 'success'
): Promise<void> {
	if (!get(hapticsEnabled)) return;
	await platform.haptics.notification(type);
}

export async function triggerHapticSelection(): Promise<void> {
	if (!get(hapticsEnabled)) return;
	await platform.haptics.selection();
}
