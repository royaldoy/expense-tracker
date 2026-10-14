import { Capacitor } from '@capacitor/core';
import {
	CapacitorBackButtonAdapter,
	CapacitorBiometricsAdapter,
	CapacitorFilesystemAdapter,
	CapacitorHapticsAdapter,
	CapacitorNotificationsAdapter,
	CapacitorPlatform,
	capacitorPlatform,
	CapacitorShareAdapter,
	CapacitorStatusBarAdapter,
	CapacitorVoiceAdapter
} from './capacitor';
import type { IPlatform } from './types';
import { VOICE_RECOGNITION_CONFIG } from './voiceConfig';
import {
	WebBackButtonAdapter,
	WebBiometricsAdapter,
	WebFilesystemAdapter,
	WebHapticsAdapter,
	WebNotificationsAdapter,
	WebPlatform,
	webPlatform,
	WebShareAdapter,
	WebStatusBarAdapter,
	WebVoiceAdapter
} from './web';

export * from './types';
export * from './voiceConfig';
export {
	WebPlatform,
	webPlatform,
	WebFilesystemAdapter,
	WebShareAdapter,
	WebBackButtonAdapter,
	WebStatusBarAdapter,
	WebNotificationsAdapter,
	WebBiometricsAdapter,
	WebHapticsAdapter,
	WebVoiceAdapter
};

export {
	CapacitorPlatform,
	capacitorPlatform,
	CapacitorFilesystemAdapter,
	CapacitorShareAdapter,
	CapacitorBackButtonAdapter,
	CapacitorStatusBarAdapter,
	CapacitorNotificationsAdapter,
	CapacitorBiometricsAdapter,
	CapacitorHapticsAdapter,
	CapacitorVoiceAdapter,
	VOICE_RECOGNITION_CONFIG
};

/**
 * Singleton instance platform yang otomatis mendeteksi lingkungan runtime:
 * Menggunakan Capacitor native adapter jika berjalan di aplikasi Android/iOS,
 * dan menggunakan Web adapter fallback jika di browser biasa.
 */
export const platform: IPlatform = Capacitor.isNativePlatform() ? capacitorPlatform : webPlatform;
