import { describe, expect, it, vi } from 'vitest';
import {
	CapacitorPlatform,
	WebBackButtonAdapter,
	WebBiometricsAdapter,
	WebFilesystemAdapter,
	WebNotificationsAdapter,
	webPlatform,
	WebShareAdapter,
	WebStatusBarAdapter
} from './index';

describe('Platform Abstraction Layer', () => {
	it('webPlatform memiliki tipe web dan isNative false', () => {
		expect(webPlatform.type).toBe('web');
		expect(webPlatform.isNative).toBe(false);
		expect(webPlatform.filesystem).toBeDefined();
		expect(webPlatform.share).toBeDefined();
		expect(webPlatform.backButton).toBeDefined();
		expect(webPlatform.statusBar).toBeDefined();
		expect(webPlatform.notifications).toBeDefined();
		expect(webPlatform.biometrics).toBeDefined();
		expect(webPlatform.cameraOcr).toBeDefined();
		expect(webPlatform.haptics).toBeDefined();
	});

	it('WebFilesystemAdapter dapat menulis dan membaca data di lingkungan simulasi', async () => {
		const fs = new WebFilesystemAdapter();
		const writeRes = await fs.writeFile({ path: 'test.json', data: '{"hello":"world"}' });
		expect(writeRes.uri).toBeDefined();

		const readRes = await fs.readFile({ path: 'test.json' });
		expect(readRes.data).toBe('{"hello":"world"}');

		await fs.deleteFile({ path: 'test.json' });
		const afterDelete = await fs.readFile({ path: 'test.json' });
		expect(afterDelete.data).toBe('');
	});

	it('WebBackButtonAdapter mengeksekusi listener yang didaftarkan', async () => {
		const backAdapter = new WebBackButtonAdapter();
		const handler = vi.fn().mockReturnValue(true);

		const unsubscribe = backAdapter.addListener(handler);
		expect(typeof unsubscribe).toBe('function');
		unsubscribe();
	});

	it('WebBiometricsAdapter mengembalikan available: false di web browser', async () => {
		const biometrics = new WebBiometricsAdapter();
		const avail = await biometrics.isAvailable();
		expect(avail.available).toBe(false);
		expect(avail.hasEnrolled).toBe(false);

		const authResult = await biometrics.authenticate('Test auth');
		expect(authResult).toBe(false);
	});

	it('WebNotificationsAdapter menangani schedule dengan aman', async () => {
		const notifications = new WebNotificationsAdapter();
		await expect(
			notifications.schedule({
				id: 1,
				title: 'Pengingat',
				body: 'Catat transaksi hari ini'
			})
		).resolves.not.toThrow();
	});

	it('WebShareAdapter fallback ke clipboard jika navigator.share tidak tersedia', async () => {
		const shareAdapter = new WebShareAdapter();
		await expect(
			shareAdapter.share({ title: 'Money Tracker', text: 'Catatan Keuangan' })
		).resolves.not.toThrow();
	});

	it('WebStatusBarAdapter tidak melempar error di lingkungan browser', async () => {
		const statusBar = new WebStatusBarAdapter();
		await expect(statusBar.setStyle('dark')).resolves.not.toThrow();
		await expect(statusBar.setBackgroundColor('#000000')).resolves.not.toThrow();
		await expect(statusBar.setOverlaysWebView(true)).resolves.not.toThrow();
	});

	it('CapacitorPlatform dapat diinstansiasi dengan benar', () => {
		const capPlatform = new CapacitorPlatform();
		expect(capPlatform.filesystem).toBeDefined();
		expect(capPlatform.share).toBeDefined();
		expect(capPlatform.backButton).toBeDefined();
		expect(capPlatform.statusBar).toBeDefined();
		expect(capPlatform.notifications).toBeDefined();
		expect(capPlatform.biometrics).toBeDefined();
		expect(capPlatform.cameraOcr).toBeDefined();
		expect(capPlatform.haptics).toBeDefined();
	});

	it('WebHapticsAdapter tidak melempar error di lingkungan browser', async () => {
		const haptics = webPlatform.haptics;
		await expect(haptics.impact('light')).resolves.not.toThrow();
		await expect(haptics.impact('medium')).resolves.not.toThrow();
		await expect(haptics.impact('heavy')).resolves.not.toThrow();
		await expect(haptics.notification('success')).resolves.not.toThrow();
		await expect(haptics.notification('warning')).resolves.not.toThrow();
		await expect(haptics.notification('error')).resolves.not.toThrow();
		await expect(haptics.selection()).resolves.not.toThrow();
		await expect(haptics.vibrate(10)).resolves.not.toThrow();
	});

	it('webPlatform.cameraOcr dapat menjalankan OCR fallback dan mengompresi gambar', async () => {
		const compressed = await webPlatform.cameraOcr.compressImage('data:image/jpeg;base64,1234');
		expect(compressed).toBeDefined();
		expect(compressed.mimeType).toBe('image/jpeg');

		const ocrResult = await webPlatform.cameraOcr.recognizeText(compressed);
		expect(ocrResult.text).toBeDefined();
		expect(ocrResult.blocks.length).toBeGreaterThan(0);
		expect(ocrResult.blocks[0].lines.length).toBeGreaterThan(0);
		expect(ocrResult.blocks[0].lines[0].boundingBox).toBeDefined();
	});
});
