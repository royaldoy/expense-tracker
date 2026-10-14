import { describe, expect, it, vi } from 'vitest';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { CapacitorVoiceAdapter } from './capacitor';
import { VOICE_RECOGNITION_CONFIG } from './voiceConfig';
import { WebVoiceAdapter } from './web';

vi.mock('@capacitor-community/speech-recognition', () => ({
	SpeechRecognition: {
		available: vi.fn(),
		checkPermissions: vi.fn(),
		requestPermissions: vi.fn(),
		start: vi.fn(),
		stop: vi.fn()
	}
}));

describe('Voice Recognition Platform Adapters', () => {
	describe('1. WebVoiceAdapter', () => {
		it('mengembalikan status tersedia dan izin berhasil secara default', async () => {
			const adapter = new WebVoiceAdapter();
			expect(await adapter.isAvailable()).toBe(true);
			expect(await adapter.checkPermissions()).toBe(true);
			expect(await adapter.requestPermissions()).toBe(true);
		});

		it('mengembalikan ujaran mock default bila tidak ada konfigurasi kustom', async () => {
			const adapter = new WebVoiceAdapter();
			const result = await adapter.start();
			expect(result.matches).toEqual(['beli kopi kenangan 25 ribu pakai gopay kemarin']);
		});

		it('mengembalikan ujaran mock yang disetel lewat setMockMatches', async () => {
			const adapter = new WebVoiceAdapter();
			adapter.setMockMatches(['transfer seratus ribu dari bca ke gopay']);
			const result = await adapter.start();
			expect(result.matches).toEqual(['transfer seratus ribu dari bca ke gopay']);
		});

		it('melempar error terpetakan bila mockError disetel', async () => {
			const adapter = new WebVoiceAdapter();
			adapter.setMockError('permission_denied');

			await expect(adapter.start()).rejects.toThrow('Voice error: permission_denied');
		});
	});

	describe('2. CapacitorVoiceAdapter', () => {
		const adapter = new CapacitorVoiceAdapter();

		it('memanggil SpeechRecognition.available()', async () => {
			vi.mocked(SpeechRecognition.available).mockResolvedValueOnce({ available: true });
			expect(await adapter.isAvailable()).toBe(true);

			vi.mocked(SpeechRecognition.available).mockRejectedValueOnce(new Error('unavailable'));
			expect(await adapter.isAvailable()).toBe(false);
		});

		it('memeriksa dan meminta izin mikrofon RECORD_AUDIO', async () => {
			vi.mocked(SpeechRecognition.checkPermissions).mockResolvedValueOnce({
				speechRecognition: 'granted'
			});
			expect(await adapter.checkPermissions()).toBe(true);

			vi.mocked(SpeechRecognition.requestPermissions).mockResolvedValueOnce({
				speechRecognition: 'denied'
			});
			expect(await adapter.requestPermissions()).toBe(false);
		});

		it('memulai pengenalan suara dengan opsi default dari VOICE_RECOGNITION_CONFIG', async () => {
			vi.mocked(SpeechRecognition.start).mockResolvedValueOnce({
				matches: ['beli bensin gocap lewat bca']
			});

			const res = await adapter.start();
			expect(res.matches).toEqual(['beli bensin gocap lewat bca']);
			expect(SpeechRecognition.start).toHaveBeenCalledWith({
				popup: VOICE_RECOGNITION_CONFIG.popup,
				language: VOICE_RECOGNITION_CONFIG.language,
				prompt: VOICE_RECOGNITION_CONFIG.prompt,
				maxResults: VOICE_RECOGNITION_CONFIG.maxResults,
				partialResults: false
			});
		});

		it('memetakan error permission denied', async () => {
			vi.mocked(SpeechRecognition.start).mockRejectedValueOnce(
				new Error('Permission not granted by user')
			);

			try {
				await adapter.start();
				expect.unreachable();
			} catch (err: unknown) {
				const errorObj = err as { code?: string };
				expect(errorObj.code).toBe('permission_denied');
			}
		});

		it('memetakan error no speech / no match', async () => {
			vi.mocked(SpeechRecognition.start).mockRejectedValueOnce(
				new Error('No speech detected (error 7)')
			);

			try {
				await adapter.start();
				expect.unreachable();
			} catch (err: unknown) {
				const errorObj = err as { code?: string };
				expect(errorObj.code).toBe('no_speech');
			}
		});

		it('memetakan error not understood / unclear', async () => {
			vi.mocked(SpeechRecognition.start).mockRejectedValueOnce(
				new Error('Speech recognition not recognized (error 5)')
			);

			try {
				await adapter.start();
				expect.unreachable();
			} catch (err: unknown) {
				const errorObj = err as { code?: string };
				expect(errorObj.code).toBe('not_understood');
			}
		});

		it('memetakan error service unavailable / network timeout', async () => {
			vi.mocked(SpeechRecognition.start).mockRejectedValueOnce(
				new Error('Recognition service unavailable offline (error 2)')
			);

			try {
				await adapter.start();
				expect.unreachable();
			} catch (err: unknown) {
				const errorObj = err as { code?: string };
				expect(errorObj.code).toBe('service_unavailable');
			}
		});

		it('menghentikan pengenalan suara saat stop() dipanggil', async () => {
			vi.mocked(SpeechRecognition.stop).mockResolvedValueOnce(undefined);
			await adapter.stop();
			expect(SpeechRecognition.stop).toHaveBeenCalled();
		});
	});
});
