import { Capacitor } from '@capacitor/core';
import {
	CapacitorBackButtonAdapter,
	CapacitorBiometricsAdapter,
	CapacitorFilesystemAdapter,
	CapacitorNotificationsAdapter,
	CapacitorPlatform,
	capacitorPlatform,
	CapacitorShareAdapter,
	CapacitorStatusBarAdapter
} from './capacitor';
import type { IPlatform } from './types';
import {
	WebBackButtonAdapter,
	WebBiometricsAdapter,
	WebFilesystemAdapter,
	WebNotificationsAdapter,
	WebPlatform,
	webPlatform,
	WebShareAdapter,
	WebStatusBarAdapter
} from './web';

export * from './types';
export {
	WebPlatform,
	webPlatform,
	WebFilesystemAdapter,
	WebShareAdapter,
	WebBackButtonAdapter,
	WebStatusBarAdapter,
	WebNotificationsAdapter,
	WebBiometricsAdapter
};

export {
	CapacitorPlatform,
	capacitorPlatform,
	CapacitorFilesystemAdapter,
	CapacitorShareAdapter,
	CapacitorBackButtonAdapter,
	CapacitorStatusBarAdapter,
	CapacitorNotificationsAdapter,
	CapacitorBiometricsAdapter
};

/**
 * Singleton instance platform yang otomatis mendeteksi lingkungan runtime:
 * Menggunakan Capacitor native adapter jika berjalan di aplikasi Android/iOS,
 * dan menggunakan Web adapter fallback jika di browser biasa.
 */
export const platform: IPlatform = Capacitor.isNativePlatform() ? capacitorPlatform : webPlatform;
