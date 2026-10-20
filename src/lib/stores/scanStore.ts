import { writable } from 'svelte/store';
import type { CompressedImage, OcrResult } from '$lib/platform/types';

export interface ReceiptScanData {
	image: CompressedImage;
	ocrResult: OcrResult;
	scannedAt: Date;
}

const innerStore = writable<ReceiptScanData | null>(null);

export const receiptScanStore = {
	subscribe: innerStore.subscribe,
	set: (data: ReceiptScanData | null) => innerStore.set(data),
	consume: (): ReceiptScanData | null => {
		let current: ReceiptScanData | null = null;
		innerStore.update((val) => {
			current = val;
			return null;
		});
		return current;
	},
	clear: () => innerStore.set(null)
};
