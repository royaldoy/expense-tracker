import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { compressImageToJpeg } from './imageUtils';
import type {
	BackButtonListener,
	BiometricAvailability,
	CompressedImage,
	FileReadOptions,
	FileWriteOptions,
	HapticImpactStyle,
	HapticNotificationType,
	IBackButtonAdapter,
	IBiometricsAdapter,
	ICameraOcrAdapter,
	IFilesystemAdapter,
	IHapticsAdapter,
	INotificationsAdapter,
	IPlatform,
	IShareAdapter,
	IStatusBarAdapter,
	IVoiceAdapter,
	OcrResult,
	PlatformType,
	ScheduleNotificationOptions,
	ShareOptions,
	VoiceErrorCode,
	VoiceRecognitionOptions,
	VoiceRecognitionResult
} from './types';
import { VOICE_RECOGNITION_CONFIG } from './voiceConfig';

function resolveDirectory(dir?: 'documents' | 'cache' | 'data'): Directory {
	switch (dir) {
		case 'cache':
			return Directory.Cache;
		case 'data':
			return Directory.Data;
		case 'documents':
		default:
			return Directory.Documents;
	}
}

export class CapacitorFilesystemAdapter implements IFilesystemAdapter {
	async writeFile(options: FileWriteOptions): Promise<{ uri: string }> {
		const result = await Filesystem.writeFile({
			path: options.path,
			data: options.data,
			directory: resolveDirectory(options.directory),
			encoding: options.encoding === 'base64' ? undefined : Encoding.UTF8
		});
		return { uri: result.uri };
	}

	async readFile(options: FileReadOptions): Promise<{ data: string }> {
		const result = await Filesystem.readFile({
			path: options.path,
			directory: resolveDirectory(options.directory),
			encoding: options.encoding === 'base64' ? undefined : Encoding.UTF8
		});
		return { data: typeof result.data === 'string' ? result.data : '' };
	}

	async deleteFile(options: {
		path: string;
		directory?: 'documents' | 'cache' | 'data';
	}): Promise<void> {
		await Filesystem.deleteFile({
			path: options.path,
			directory: resolveDirectory(options.directory)
		});
	}

	async saveAndDownload(filename: string, content: string, _mimeType: string): Promise<string> {
		void _mimeType;
		const writeRes = await this.writeFile({
			path: filename,
			data: content,
			directory: 'documents'
		});
		return writeRes.uri;
	}
}

export class CapacitorShareAdapter implements IShareAdapter {
	async canShare(): Promise<boolean> {
		try {
			const res = await Share.canShare();
			return res.value;
		} catch {
			return false;
		}
	}

	async share(options: ShareOptions): Promise<void> {
		await Share.share({
			title: options.title,
			text: options.text,
			url: options.url,
			dialogTitle: options.dialogTitle,
			files: options.files
		});
	}
}

export class CapacitorBackButtonAdapter implements IBackButtonAdapter {
	private listeners: BackButtonListener[] = [];
	private registered = false;

	private init() {
		if (this.registered) return;
		this.registered = true;

		App.addListener('backButton', async (event) => {
			// Jalankan listeners dari yang paling baru didaftarkan (LIFO - e.g. modal/sheet tertutup dulu)
			for (let i = this.listeners.length - 1; i >= 0; i--) {
				const handler = this.listeners[i];
				const consumed = await handler();
				if (consumed) {
					return;
				}
			}

			// Jika tidak ada listener yang menangani dan bisa navigate back
			if (event.canGoBack) {
				window.history.back();
			} else {
				await App.exitApp();
			}
		});
	}

	addListener(handler: BackButtonListener): () => void {
		this.init();
		this.listeners.push(handler);
		return () => {
			const index = this.listeners.indexOf(handler);
			if (index !== -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	async exitApp(): Promise<void> {
		await App.exitApp();
	}
}

export class CapacitorStatusBarAdapter implements IStatusBarAdapter {
	async setStyle(style: 'light' | 'dark' | 'default'): Promise<void> {
		try {
			let s = Style.Default;
			if (style === 'dark') s = Style.Dark;
			if (style === 'light') s = Style.Light;
			await StatusBar.setStyle({ style: s });
		} catch {
			// Abaikan kegagalan status bar jika platform tidak mendukung
		}
	}

	async setBackgroundColor(colorHex: string): Promise<void> {
		try {
			await StatusBar.setBackgroundColor({ color: colorHex });
		} catch {
			// Abaikan jika tidak didukung
		}
	}

	async setOverlaysWebView(overlay: boolean): Promise<void> {
		try {
			await StatusBar.setOverlaysWebView({ overlay });
		} catch {
			// Abaikan jika tidak didukung
		}
	}

	async show(): Promise<void> {
		try {
			await StatusBar.show();
		} catch {
			// Abaikan jika tidak didukung
		}
	}

	async hide(): Promise<void> {
		try {
			await StatusBar.hide();
		} catch {
			// Abaikan jika tidak didukung
		}
	}
}

export class CapacitorNotificationsAdapter implements INotificationsAdapter {
	async checkPermissions(): Promise<boolean> {
		try {
			const status = await LocalNotifications.checkPermissions();
			return status.display === 'granted';
		} catch {
			return false;
		}
	}

	async requestPermissions(): Promise<boolean> {
		try {
			const status = await LocalNotifications.requestPermissions();
			return status.display === 'granted';
		} catch {
			return false;
		}
	}

	async schedule(options: ScheduleNotificationOptions): Promise<void> {
		const hasPerm = await this.checkPermissions();
		if (!hasPerm) {
			const granted = await this.requestPermissions();
			if (!granted) return;
		}

		await LocalNotifications.schedule({
			notifications: [
				{
					id: options.id,
					title: options.title,
					body: options.body,
					schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
					extra: options.extra
				}
			]
		});
	}

	async cancel(ids: number[]): Promise<void> {
		await LocalNotifications.cancel({
			notifications: ids.map((id) => ({ id }))
		});
	}
}

export class CapacitorBiometricsAdapter implements IBiometricsAdapter {
	async isAvailable(): Promise<BiometricAvailability> {
		try {
			const result = await NativeBiometric.isAvailable();
			return {
				available: result.isAvailable,
				hasEnrolled: result.isAvailable,
				biometryType:
					result.biometryType === 1
						? 'touchId'
						: result.biometryType === 2
							? 'faceId'
							: result.biometryType === 3
								? 'fingerprint'
								: result.biometryType === 4
									? 'faceAuthentication'
									: result.biometryType === 5
										? 'iris'
										: 'none'
			};
		} catch (error) {
			return {
				available: false,
				hasEnrolled: false,
				biometryType: 'none',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async authenticate(reason = 'Verifikasi identitas Anda untuk melanjutkan'): Promise<boolean> {
		try {
			await NativeBiometric.verifyIdentity({
				reason,
				title: 'Otentikasi Biometrik',
				subtitle: 'Gunakan sidik jari atau wajah Anda',
				description: reason
			});
			return true;
		} catch {
			return false;
		}
	}
}

export class CapacitorCameraOcrAdapter implements ICameraOcrAdapter {
	async captureOrPickPhoto(source: 'camera' | 'photos'): Promise<CompressedImage> {
		const photo = await Camera.getPhoto({
			resultType: CameraResultType.Base64,
			source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
			quality: 90,
			width: 2400,
			correctOrientation: true
		});

		if (!photo.base64String) {
			throw new Error('Tidak ada data gambar yang diterima dari kamera atau galeri');
		}

		return compressImageToJpeg(photo.base64String, 1600, 0.85);
	}

	async compressImage(
		input: File | Blob | string,
		maxDimension = 1600,
		quality = 0.85
	): Promise<CompressedImage> {
		return compressImageToJpeg(input, maxDimension, quality);
	}

	async recognizeText(image: CompressedImage | string): Promise<OcrResult> {
		const base64Data =
			typeof image === 'string'
				? image.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
				: image.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

		try {
			const result = await CapacitorPluginMlKitTextRecognition.detectText({
				base64Image: base64Data
			});

			return {
				text: result.text,
				blocks: result.blocks.map((block) => ({
					text: block.text,
					boundingBox: block.boundingBox,
					cornerPoints: block.cornerPoints,
					lines: block.lines.map((line) => ({
						text: line.text,
						boundingBox: line.boundingBox,
						cornerPoints: line.cornerPoints,
						elements: line.elements.map((el) => ({
							text: el.text,
							boundingBox: el.boundingBox,
							cornerPoints: el.cornerPoints
						}))
					}))
				}))
			};
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);
			if (
				errMsg.toLowerCase().includes('waiting for the text recognition module') ||
				errMsg.toLowerCase().includes('download') ||
				errMsg.toLowerCase().includes('not yet available')
			) {
				throw new Error(
					'Model OCR Google Play Services sedang diunduh di latar belakang. Pastikan perangkat memiliki koneksi internet dan coba beberapa saat lagi.',
					{ cause: err }
				);
			}
			throw new Error(`Pemindaian teks gagal: ${errMsg}`, { cause: err });
		}
	}
}

export class CapacitorHapticsAdapter implements IHapticsAdapter {
	async impact(style: HapticImpactStyle = 'light'): Promise<void> {
		try {
			let s = ImpactStyle.Light;
			if (style === 'medium') s = ImpactStyle.Medium;
			if (style === 'heavy') s = ImpactStyle.Heavy;
			await Haptics.impact({ style: s });
		} catch {
			// Abaikan kegagalan haptic pada emulator / perangkat tanpa vibrator
		}
	}

	async notification(type: HapticNotificationType = 'success'): Promise<void> {
		try {
			let t = NotificationType.Success;
			if (type === 'warning') t = NotificationType.Warning;
			if (type === 'error') t = NotificationType.Error;
			await Haptics.notification({ type: t });
		} catch {
			// Abaikan
		}
	}

	async selection(): Promise<void> {
		try {
			await Haptics.selectionChanged();
		} catch {
			// Abaikan
		}
	}

	async vibrate(durationMs = 20): Promise<void> {
		try {
			await Haptics.vibrate({ duration: durationMs });
		} catch {
			// Abaikan
		}
	}
}

export class CapacitorVoiceAdapter implements IVoiceAdapter {
	async isAvailable(): Promise<boolean> {
		try {
			const res = await SpeechRecognition.available();
			return res.available;
		} catch {
			return false;
		}
	}

	async checkPermissions(): Promise<boolean> {
		try {
			const status = await SpeechRecognition.checkPermissions();
			return status.speechRecognition === 'granted';
		} catch {
			return false;
		}
	}

	async requestPermissions(): Promise<boolean> {
		try {
			const status = await SpeechRecognition.requestPermissions();
			return status.speechRecognition === 'granted';
		} catch {
			return false;
		}
	}

	async start(options?: VoiceRecognitionOptions): Promise<VoiceRecognitionResult> {
		const opts = {
			popup: options?.popup ?? VOICE_RECOGNITION_CONFIG.popup,
			language: options?.language ?? VOICE_RECOGNITION_CONFIG.language,
			prompt: options?.prompt ?? VOICE_RECOGNITION_CONFIG.prompt,
			maxResults: options?.maxResults ?? VOICE_RECOGNITION_CONFIG.maxResults,
			partialResults: options?.partialResults ?? false
		};

		try {
			const res = await SpeechRecognition.start(opts);
			const matches = res.matches ?? [];
			if (matches.length === 0) {
				const err = new Error('Tidak ada suara yang terdeteksi');
				(err as unknown as Record<string, unknown>).code = 'no_speech' satisfies VoiceErrorCode;
				throw err;
			}
			return { matches };
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'code' in error) {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			const lower = msg.toLowerCase();

			let code: VoiceErrorCode = 'unknown';
			if (
				lower.includes('permission') ||
				lower.includes('denied') ||
				lower.includes('not granted')
			) {
				code = 'permission_denied';
			} else if (
				lower.includes('no speech') ||
				lower.includes('no match') ||
				lower.includes('error 7') ||
				lower.includes("didn't catch")
			) {
				code = 'no_speech';
			} else if (
				lower.includes('not recognized') ||
				lower.includes('unclear') ||
				lower.includes('error 3') ||
				lower.includes('error 5')
			) {
				code = 'not_understood';
			} else if (
				lower.includes('unavailable') ||
				lower.includes('network') ||
				lower.includes('offline') ||
				lower.includes('error 1') ||
				lower.includes('error 2') ||
				lower.includes('error 4')
			) {
				code = 'service_unavailable';
			}

			const err = new Error(msg);
			(err as unknown as Record<string, unknown>).code = code;
			throw err;
		}
	}

	async stop(): Promise<void> {
		try {
			await SpeechRecognition.stop();
		} catch {
			// Abaikan
		}
	}
}

export class CapacitorPlatform implements IPlatform {
	readonly type: PlatformType;
	readonly isNative: boolean;
	readonly filesystem = new CapacitorFilesystemAdapter();
	readonly share = new CapacitorShareAdapter();
	readonly backButton = new CapacitorBackButtonAdapter();
	readonly statusBar = new CapacitorStatusBarAdapter();
	readonly notifications = new CapacitorNotificationsAdapter();
	readonly biometrics = new CapacitorBiometricsAdapter();
	readonly cameraOcr = new CapacitorCameraOcrAdapter();
	readonly haptics = new CapacitorHapticsAdapter();
	readonly voice = new CapacitorVoiceAdapter();

	constructor() {
		const p = Capacitor.getPlatform();
		this.type = p === 'android' ? 'android' : p === 'ios' ? 'ios' : 'web';
		this.isNative = Capacitor.isNativePlatform();
	}
}

export const capacitorPlatform = new CapacitorPlatform();
