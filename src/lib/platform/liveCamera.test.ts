import { describe, expect, it, vi } from 'vitest';
import { CameraPreview } from '@capgo/camera-preview';
import { CapacitorLiveCameraAdapter } from './capacitor';
import { WebLiveCameraAdapter } from './web';

vi.mock('@capgo/camera-preview', () => ({
	CameraPreview: {
		checkPermissions: vi.fn(),
		requestPermissions: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		capture: vi.fn(),
		setFlashMode: vi.fn(),
		getFlashMode: vi.fn(),
		setFocus: vi.fn()
	}
}));

describe('Live Camera Platform Adapters', () => {
	describe('1. WebLiveCameraAdapter', () => {
		it('mengembalikan status dukungan dan izin secara benar', async () => {
			const adapter = new WebLiveCameraAdapter();
			expect(await adapter.isSupported()).toBe(true);
			expect(await adapter.checkPermissions()).toBe(true);
			expect(await adapter.requestPermissions()).toBe(true);

			adapter.setMockSupported(false);
			expect(await adapter.isSupported()).toBe(false);
		});

		it('mengelola siklus hidup start dan stop tanpa error', async () => {
			const adapter = new WebLiveCameraAdapter();
			await expect(adapter.start({ toBack: true })).resolves.toBeUndefined();
			await expect(adapter.stop()).resolves.toBeUndefined();
		});

		it('mengambil foto snapshot placeholder terkompresi', async () => {
			const adapter = new WebLiveCameraAdapter();
			const result = await adapter.capture();
			expect(result).toBeDefined();
			expect(result.mimeType).toBe('image/jpeg');
			expect(typeof result.base64).toBe('string');
			expect(result.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
		});

		it('memutar rotasi flash mode dengan benar: off -> on -> torch -> auto -> off', async () => {
			const adapter = new WebLiveCameraAdapter();
			expect(adapter.getFlashMode()).toBe('off');

			expect(await adapter.toggleFlashMode()).toBe('on');
			expect(adapter.getFlashMode()).toBe('on');

			expect(await adapter.toggleFlashMode()).toBe('torch');
			expect(adapter.getFlashMode()).toBe('torch');

			expect(await adapter.toggleFlashMode()).toBe('auto');
			expect(adapter.getFlashMode()).toBe('auto');

			expect(await adapter.toggleFlashMode()).toBe('off');
			expect(adapter.getFlashMode()).toBe('off');
		});

		it('mengatur fokus koordinat tanpa melempar exception', async () => {
			const adapter = new WebLiveCameraAdapter();
			await expect(adapter.setFocus({ x: 0.5, y: 0.5 })).resolves.toBeUndefined();
		});
	});

	describe('2. CapacitorLiveCameraAdapter', () => {
		const adapter = new CapacitorLiveCameraAdapter();

		it('memeriksa dan meminta izin via CameraPreview plugin', async () => {
			vi.mocked(CameraPreview.checkPermissions).mockResolvedValueOnce({
				camera: 'granted'
			});
			expect(await adapter.checkPermissions()).toBe(true);
			expect(CameraPreview.checkPermissions).toHaveBeenCalledWith({ disableAudio: true });

			vi.mocked(CameraPreview.requestPermissions).mockResolvedValueOnce({
				camera: 'denied'
			});
			expect(await adapter.requestPermissions()).toBe(false);
		});

		it('memulai live preview dengan opsi toBack: true secara default', async () => {
			vi.mocked(CameraPreview.start).mockResolvedValueOnce({
				width: 1080,
				height: 2400,
				x: 0,
				y: 0
			});

			await adapter.start();
			expect(CameraPreview.start).toHaveBeenCalledWith(
				expect.objectContaining({
					position: 'rear',
					toBack: true,
					disableAudio: true
				})
			);
		});

		it('menghentikan preview kamera dengan force: true', async () => {
			vi.mocked(CameraPreview.stop).mockResolvedValueOnce();
			await adapter.stop();
			expect(CameraPreview.stop).toHaveBeenCalledWith({ force: true });
		});

		it('mengambil foto dan mengompresi ke JPEG', async () => {
			const dummyBase64 =
				'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
			vi.mocked(CameraPreview.capture).mockResolvedValueOnce({
				value: dummyBase64,
				exif: {}
			});

			const photo = await adapter.capture(95);
			expect(CameraPreview.capture).toHaveBeenCalledWith({ quality: 95 });
			expect(photo.mimeType).toBe('image/jpeg');
			expect(photo.base64).toBe(dummyBase64);
		});

		it('melempar error jika capture tidak mengembalikan data foto', async () => {
			vi.mocked(CameraPreview.capture).mockResolvedValueOnce({
				value: '',
				exif: {}
			});

			await expect(adapter.capture()).rejects.toThrow(
				'Tidak ada data foto yang dihasilkan oleh kamera'
			);
		});

		it('mengatur dan memutar flash mode', async () => {
			vi.mocked(CameraPreview.setFlashMode).mockResolvedValue();

			await adapter.setFlashMode('torch');
			expect(CameraPreview.setFlashMode).toHaveBeenCalledWith({ flashMode: 'torch' });
			expect(adapter.getFlashMode()).toBe('torch');

			const next = await adapter.toggleFlashMode();
			expect(next).toBe('auto');
			expect(CameraPreview.setFlashMode).toHaveBeenCalledWith({ flashMode: 'auto' });
		});

		it('menyesuaikan fokus dengan koordinat ternormalisasi', async () => {
			vi.mocked(CameraPreview.setFocus).mockResolvedValueOnce();

			await adapter.setFocus({ x: 0.5, y: 0.5 });
			expect(CameraPreview.setFocus).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
		});
	});
});
