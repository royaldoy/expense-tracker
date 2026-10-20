import { compressImageToJpeg } from './imageUtils';
import type {
	BiometricAvailability,
	CompressedImage,
	FileReadOptions,
	FileWriteOptions,
	FlashMode,
	HapticImpactStyle,
	HapticNotificationType,
	IBackButtonAdapter,
	IBiometricsAdapter,
	ICameraOcrAdapter,
	IFilesystemAdapter,
	IHapticsAdapter,
	ILiveCameraAdapter,
	INotificationsAdapter,
	IPlatform,
	IShareAdapter,
	IStatusBarAdapter,
	IVoiceAdapter,
	LiveCameraStartOptions,
	OcrResult,
	ScheduleNotificationOptions,
	ShareOptions,
	VoiceErrorCode,
	VoiceRecognitionOptions,
	VoiceRecognitionResult
} from './types';

export class WebFilesystemAdapter implements IFilesystemAdapter {
	private memoryFs = new Map<string, string>();

	async writeFile(options: FileWriteOptions): Promise<{ uri: string }> {
		this.memoryFs.set(options.path, options.data);
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(`fs_${options.path}`, options.data);
			} catch {
				// Abaikan kegagalan kuota storage
			}
		}
		return { uri: `blob:${options.path}` };
	}

	async readFile(options: FileReadOptions): Promise<{ data: string }> {
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(`fs_${options.path}`);
			if (stored !== null) return { data: stored };
		}
		return { data: this.memoryFs.get(options.path) ?? '' };
	}

	async deleteFile(options: { path: string }): Promise<void> {
		this.memoryFs.delete(options.path);
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			localStorage.removeItem(`fs_${options.path}`);
		}
	}

	async saveAndDownload(filename: string, content: string, mimeType: string): Promise<string> {
		if (typeof window === 'undefined' || typeof document === 'undefined') return filename;
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		setTimeout(() => URL.revokeObjectURL(url), 2000);
		return url;
	}
}

export class WebShareAdapter implements IShareAdapter {
	async canShare(): Promise<boolean> {
		if (typeof navigator === 'undefined') return false;
		return typeof navigator.share === 'function';
	}

	async share(options: ShareOptions): Promise<void> {
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({
					title: options.title,
					text: options.text,
					url: options.url
				});
				return;
			} catch (e) {
				if ((e as Error).name === 'AbortError') return;
			}
		}
		// Fallback ke Clipboard jika share API tidak tersedia
		if (typeof navigator !== 'undefined' && navigator.clipboard && options.text) {
			await navigator.clipboard.writeText(options.text);
		}
	}
}

export class WebBackButtonAdapter implements IBackButtonAdapter {
	private listeners = new Set<() => boolean | Promise<boolean>>();

	constructor() {
		if (typeof window !== 'undefined') {
			window.addEventListener('popstate', async () => {
				for (const listener of this.listeners) {
					const handled = await listener();
					if (handled) break;
				}
			});
		}
	}

	addListener(handler: () => boolean | Promise<boolean>): () => void {
		this.listeners.add(handler);
		return () => {
			this.listeners.delete(handler);
		};
	}

	async exitApp(): Promise<void> {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		}
	}
}

export class WebStatusBarAdapter implements IStatusBarAdapter {
	async setStyle(_style: 'light' | 'dark' | 'default'): Promise<void> {
		void _style;
	}

	async setBackgroundColor(colorHex: string): Promise<void> {
		if (typeof document === 'undefined') return;
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement('meta');
			meta.setAttribute('name', 'theme-color');
			document.head.appendChild(meta);
		}
		meta.setAttribute('content', colorHex);
	}

	async setOverlaysWebView(_overlay: boolean): Promise<void> {
		void _overlay;
	}
	async show(): Promise<void> {}
	async hide(): Promise<void> {}
}

export class WebNotificationsAdapter implements INotificationsAdapter {
	async checkPermissions(): Promise<boolean> {
		if (typeof window === 'undefined' || !('Notification' in window)) return false;
		return Notification.permission === 'granted';
	}

	async requestPermissions(): Promise<boolean> {
		if (typeof window === 'undefined' || !('Notification' in window)) return false;
		const perm = await Notification.requestPermission();
		return perm === 'granted';
	}

	async schedule(options: ScheduleNotificationOptions): Promise<void> {
		const granted = await this.checkPermissions();
		if (!granted) return;

		const delay = options.scheduleAt ? options.scheduleAt.getTime() - Date.now() : 0;
		if (delay <= 0) {
			new Notification(options.title, { body: options.body });
		} else {
			setTimeout(() => {
				new Notification(options.title, { body: options.body });
			}, delay);
		}
	}

	async cancel(_ids: number[]): Promise<void> {
		void _ids;
	}
}

export class WebBiometricsAdapter implements IBiometricsAdapter {
	async isAvailable(): Promise<BiometricAvailability> {
		return {
			available: false,
			hasEnrolled: false,
			biometryType: 'none',
			error: 'Biometrics tidak tersedia di lingkungan browser Web'
		};
	}

	async authenticate(_reason?: string): Promise<boolean> {
		void _reason;
		return false;
	}
}

let activeWebOcrFixture: OcrResult | null = null;

export function setWebOcrFixture(fixture: OcrResult | null): void {
	activeWebOcrFixture = fixture;
}

export class WebCameraOcrAdapter implements ICameraOcrAdapter {
	async captureOrPickPhoto(source: 'camera' | 'photos'): Promise<CompressedImage> {
		if (typeof document === 'undefined') {
			return compressImageToJpeg('', 1600, 0.85);
		}

		return new Promise((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			if (source === 'camera') {
				input.capture = 'environment';
			}

			input.onchange = async () => {
				const file = input.files?.[0];
				if (!file) {
					reject(new Error('Batal memilih foto'));
					return;
				}
				try {
					const compressed = await compressImageToJpeg(file, 1600, 0.85);
					resolve(compressed);
				} catch (e) {
					reject(e);
				}
			};

			input.oncancel = () => {
				reject(new Error('Batal memilih foto'));
			};

			input.click();
		});
	}

	async compressImage(
		input: File | Blob | string,
		maxDimension = 1600,
		quality = 0.85
	): Promise<CompressedImage> {
		return compressImageToJpeg(input, maxDimension, quality);
	}

	async recognizeText(_image: CompressedImage | string): Promise<OcrResult> {
		void _image;
		if (activeWebOcrFixture) {
			return activeWebOcrFixture;
		}

		return {
			text: 'INDOMARET\nMINYAK GORENG 2L  1  32.000\nTOTAL  32.000',
			blocks: [
				{
					text: 'INDOMARET',
					boundingBox: { left: 40, top: 20, right: 200, bottom: 50 },
					lines: [
						{
							text: 'INDOMARET',
							boundingBox: { left: 40, top: 20, right: 200, bottom: 50 }
						}
					]
				},
				{
					text: 'MINYAK GORENG 2L  1  32.000',
					boundingBox: { left: 40, top: 80, right: 350, bottom: 110 },
					lines: [
						{
							text: 'MINYAK GORENG 2L  1  32.000',
							boundingBox: { left: 40, top: 80, right: 350, bottom: 110 }
						}
					]
				},
				{
					text: 'TOTAL  32.000',
					boundingBox: { left: 40, top: 150, right: 350, bottom: 180 },
					lines: [
						{
							text: 'TOTAL  32.000',
							boundingBox: { left: 40, top: 150, right: 350, bottom: 180 }
						}
					]
				}
			]
		};
	}
}

export class WebHapticsAdapter implements IHapticsAdapter {
	async impact(_style?: HapticImpactStyle): Promise<void> {
		void _style;
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			try {
				navigator.vibrate(10);
			} catch {
				// Abaikan jika tidak didukung
			}
		}
	}

	async notification(type: HapticNotificationType = 'success'): Promise<void> {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			try {
				if (type === 'success') navigator.vibrate([15, 40, 15]);
				else if (type === 'warning') navigator.vibrate([25, 30, 25]);
				else navigator.vibrate([40, 40, 40]);
			} catch {
				// Abaikan jika tidak didukung
			}
		}
	}

	async selection(): Promise<void> {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			try {
				navigator.vibrate(5);
			} catch {
				// Abaikan jika tidak didukung
			}
		}
	}

	async vibrate(durationMs = 20): Promise<void> {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			try {
				navigator.vibrate(durationMs);
			} catch {
				// Abaikan jika tidak didukung
			}
		}
	}
}

export class WebVoiceAdapter implements IVoiceAdapter {
	private mockMatches: string[] = ['beli kopi kenangan 25 ribu pakai gopay kemarin'];
	private mockError: VoiceErrorCode | null = null;
	private listening = false;

	setMockMatches(matches: string[]): void {
		this.mockMatches = matches;
	}

	setMockError(error: VoiceErrorCode | null): void {
		this.mockError = error;
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}

	async checkPermissions(): Promise<boolean> {
		if (typeof window !== 'undefined' && '__MOCK_VOICE_PERMISSION__' in window) {
			return Boolean((window as unknown as Record<string, unknown>).__MOCK_VOICE_PERMISSION__);
		}
		return true;
	}

	async requestPermissions(): Promise<boolean> {
		if (typeof window !== 'undefined' && '__MOCK_VOICE_PERMISSION__' in window) {
			return Boolean((window as unknown as Record<string, unknown>).__MOCK_VOICE_PERMISSION__);
		}
		return true;
	}

	async start(_options?: VoiceRecognitionOptions): Promise<VoiceRecognitionResult> {
		void _options;
		this.listening = true;

		// 1. Cek mock error global (untuk pengujian Playwright E2E)
		if (typeof window !== 'undefined') {
			const winObj = window as unknown as Record<string, unknown>;
			if (winObj.__MOCK_VOICE_ERROR__) {
				this.listening = false;
				const code = String(winObj.__MOCK_VOICE_ERROR__) as VoiceErrorCode;
				const err = new Error(`Voice error: ${code}`);
				(err as unknown as Record<string, unknown>).code = code;
				throw err;
			}
		}

		if (this.mockError) {
			this.listening = false;
			const code = this.mockError;
			const err = new Error(`Voice error: ${code}`);
			(err as unknown as Record<string, unknown>).code = code;
			throw err;
		}

		// Simulasi jeda mendengarkan suara (200ms)
		await new Promise((resolve) => setTimeout(resolve, 200));

		this.listening = false;

		// 2. Cek mock matches global (untuk pengujian Playwright E2E)
		if (typeof window !== 'undefined') {
			const winObj = window as unknown as Record<string, unknown>;
			if (
				Array.isArray(winObj.__MOCK_VOICE_MATCHES__) &&
				winObj.__MOCK_VOICE_MATCHES__.length > 0
			) {
				return { matches: winObj.__MOCK_VOICE_MATCHES__ as string[] };
			}
		}

		return { matches: [...this.mockMatches] };
	}

	async stop(): Promise<void> {
		this.listening = false;
	}
}

export class WebLiveCameraAdapter implements ILiveCameraAdapter {
	private currentFlashMode: FlashMode = 'off';
	private running = false;
	private mockSupported = true;

	setMockSupported(supported: boolean): void {
		this.mockSupported = supported;
	}

	async isSupported(): Promise<boolean> {
		return this.mockSupported;
	}

	async checkPermissions(): Promise<boolean> {
		if (typeof window !== 'undefined' && '__MOCK_CAMERA_PERMISSION__' in window) {
			return Boolean((window as unknown as Record<string, unknown>).__MOCK_CAMERA_PERMISSION__);
		}
		return true;
	}

	async requestPermissions(): Promise<boolean> {
		if (typeof window !== 'undefined' && '__MOCK_CAMERA_PERMISSION__' in window) {
			return Boolean((window as unknown as Record<string, unknown>).__MOCK_CAMERA_PERMISSION__);
		}
		return true;
	}

	async start(_options?: LiveCameraStartOptions): Promise<void> {
		void _options;
		this.running = true;
	}

	async stop(): Promise<void> {
		this.running = false;
	}

	async capture(_quality = 90): Promise<CompressedImage> {
		void _quality;
		const dummyJpegBase64 =
			'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
		return compressImageToJpeg(dummyJpegBase64, 1600, 0.85);
	}

	async setFlashMode(mode: FlashMode): Promise<void> {
		this.currentFlashMode = mode;
	}

	getFlashMode(): FlashMode {
		return this.currentFlashMode;
	}

	async toggleFlashMode(): Promise<FlashMode> {
		const nextMode: Record<FlashMode, FlashMode> = {
			off: 'on',
			on: 'torch',
			torch: 'auto',
			auto: 'off'
		};
		this.currentFlashMode = nextMode[this.currentFlashMode] || 'off';
		return this.currentFlashMode;
	}

	async setFocus(_point: { x: number; y: number }): Promise<void> {
		void _point;
	}
}

export class WebPlatform implements IPlatform {
	readonly type = 'web';
	readonly isNative = false;
	readonly filesystem = new WebFilesystemAdapter();
	readonly share = new WebShareAdapter();
	readonly backButton = new WebBackButtonAdapter();
	readonly statusBar = new WebStatusBarAdapter();
	readonly notifications = new WebNotificationsAdapter();
	readonly biometrics = new WebBiometricsAdapter();
	readonly cameraOcr = new WebCameraOcrAdapter();
	readonly liveCamera = new WebLiveCameraAdapter();
	readonly haptics = new WebHapticsAdapter();
	readonly voice = new WebVoiceAdapter();
}

export const webPlatform = new WebPlatform();
