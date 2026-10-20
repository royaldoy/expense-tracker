/**
 * Platform Abstraction Layer Types
 * Menyediakan kontrak interface seragam untuk lingkungan Web SPA dan Native Android Capacitor.
 */

export type PlatformType = 'web' | 'android' | 'ios';

export interface FileWriteOptions {
	path: string;
	data: string;
	directory?: 'documents' | 'cache' | 'data';
	encoding?: 'utf8' | 'base64';
}

export interface FileReadOptions {
	path: string;
	directory?: 'documents' | 'cache' | 'data';
	encoding?: 'utf8' | 'base64';
}

export interface IFilesystemAdapter {
	writeFile(options: FileWriteOptions): Promise<{ uri: string }>;
	readFile(options: FileReadOptions): Promise<{ data: string }>;
	deleteFile(options: { path: string; directory?: 'documents' | 'cache' | 'data' }): Promise<void>;
	saveAndDownload(filename: string, content: string, mimeType: string): Promise<string>;
}

export interface ShareOptions {
	title?: string;
	text?: string;
	url?: string;
	dialogTitle?: string;
	files?: string[];
}

export interface IShareAdapter {
	share(options: ShareOptions): Promise<void>;
	canShare(): Promise<boolean>;
}

export type BackButtonListener = () => boolean | Promise<boolean>;

export interface IBackButtonAdapter {
	/**
	 * Mendaftarkan callback untuk tombol back fisik/gesture Android.
	 * Jika callback mengembalikan `true`, aksi back dianggap telah ditangani (misal menutup sheet/modal).
	 * Jika `false`, aksi default (misal keluar atau kembali di riwayat halaman) dijalankan.
	 */
	addListener(handler: BackButtonListener): () => void;
	exitApp(): Promise<void>;
}

export interface IStatusBarAdapter {
	setStyle(style: 'light' | 'dark' | 'default'): Promise<void>;
	setBackgroundColor(colorHex: string): Promise<void>;
	setOverlaysWebView(overlay: boolean): Promise<void>;
	show(): Promise<void>;
	hide(): Promise<void>;
}

export interface ScheduleNotificationOptions {
	id: number;
	title: string;
	body: string;
	scheduleAt?: Date;
	extra?: Record<string, unknown>;
}

export interface INotificationsAdapter {
	schedule(options: ScheduleNotificationOptions): Promise<void>;
	cancel(ids: number[]): Promise<void>;
	requestPermissions(): Promise<boolean>;
	checkPermissions(): Promise<boolean>;
}

export interface BiometricAvailability {
	available: boolean;
	hasEnrolled: boolean;
	biometryType?: 'touchId' | 'faceId' | 'fingerprint' | 'faceAuthentication' | 'iris' | 'none';
	error?: string;
}

export interface IBiometricsAdapter {
	isAvailable(): Promise<BiometricAvailability>;
	authenticate(reason?: string): Promise<boolean>;
}

export interface OcrBoundingBox {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface OcrPoint {
	x: number;
	y: number;
}

export interface OcrCornerPoints {
	topLeft: OcrPoint;
	topRight: OcrPoint;
	bottomRight: OcrPoint;
	bottomLeft: OcrPoint;
}

export interface OcrElement {
	text: string;
	boundingBox?: OcrBoundingBox;
	cornerPoints?: OcrCornerPoints | null;
}

export interface OcrLine {
	text: string;
	boundingBox?: OcrBoundingBox;
	elements?: OcrElement[];
	cornerPoints?: OcrCornerPoints | null;
}

export interface OcrBlock {
	text: string;
	boundingBox?: OcrBoundingBox;
	lines: OcrLine[];
	cornerPoints?: OcrCornerPoints | null;
}

export interface OcrResult {
	text: string;
	blocks: OcrBlock[];
}

export interface CompressedImage {
	base64: string; // Base64 murni tanpa prefix data URI
	dataUrl: string; // Format data:image/jpeg;base64,... untuk pratinjau DOM
	blob: Blob;
	mimeType: string;
	width: number;
	height: number;
}

export interface ICameraOcrAdapter {
	/**
	 * Mengambil foto dari kamera atau memilih dari galeri perangkat.
	 * Otomatis dikompresi ke format JPEG dengan sisi terpanjang maks 1600 px.
	 */
	captureOrPickPhoto(source: 'camera' | 'photos'): Promise<CompressedImage>;

	/**
	 * Mengompresi file atau base64 gambar yang diunggah ke JPEG dengan sisi terpanjang maks 1600 px.
	 */
	compressImage(
		input: File | Blob | string,
		maxDimension?: number,
		quality?: number
	): Promise<CompressedImage>;

	/**
	 * Menjalankan deteksi teks OCR pada gambar terkompresi.
	 */
	recognizeText(image: CompressedImage | string): Promise<OcrResult>;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface IHapticsAdapter {
	/**
	 * Memicu getaran benturan haptic fisik (light, medium, heavy).
	 */
	impact(style?: HapticImpactStyle): Promise<void>;

	/**
	 * Memicu getaran notifikasi (success, warning, error).
	 */
	notification(type?: HapticNotificationType): Promise<void>;

	/**
	 * Memicu getaran halus saat pergantian seleksi (misal tab atau item slider).
	 */
	selection(): Promise<void>;

	/**
	 * Memicu getaran durasi khusus (fallback web).
	 */
	vibrate(durationMs?: number): Promise<void>;
}

export type VoiceErrorCode =
	'permission_denied' | 'no_speech' | 'not_understood' | 'service_unavailable' | 'unknown';

export interface VoiceRecognitionOptions {
	language?: string;
	maxResults?: number;
	prompt?: string;
	popup?: boolean;
	partialResults?: boolean;
}

export interface VoiceRecognitionResult {
	matches: string[];
}

export interface IVoiceAdapter {
	/**
	 * Memeriksa apakah fitur pengenalan suara didukung dan tersedia di perangkat.
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Memeriksa status izin perekaman audio mikrofon.
	 */
	checkPermissions(): Promise<boolean>;

	/**
	 * Meminta izin perekaman audio mikrofon dari pengguna.
	 */
	requestPermissions(): Promise<boolean>;

	/**
	 * Memulai pendengaran rekognisi suara. Mengembalikan array string hasil ujaran.
	 */
	start(options?: VoiceRecognitionOptions): Promise<VoiceRecognitionResult>;

	/**
	 * Menghentikan proses pendengaran secara manual.
	 */
	stop(): Promise<void>;
}

export type FlashMode = 'off' | 'on' | 'torch' | 'auto';

export interface LiveCameraStartOptions {
	position?: 'rear' | 'front';
	toBack?: boolean;
	disableAudio?: boolean;
	parent?: string;
}

export interface ILiveCameraAdapter {
	/**
	 * Memeriksa apakah live camera preview didukung di platform ini.
	 */
	isSupported(): Promise<boolean>;

	/**
	 * Memeriksa apakah izin kamera sudah diberikan.
	 */
	checkPermissions(): Promise<boolean>;

	/**
	 * Meminta izin kamera dari pengguna.
	 */
	requestPermissions(): Promise<boolean>;

	/**
	 * Memulai live camera preview (biasanya di-render di belakang WebView dengan toBack: true).
	 */
	start(options?: LiveCameraStartOptions): Promise<void>;

	/**
	 * Menghentikan live camera preview dan membebaskan resource kamera.
	 */
	stop(): Promise<void>;

	/**
	 * Mengambil foto dengan resolusi penuh dari sensor kamera, lalu otomatis dikompresi.
	 */
	capture(quality?: number): Promise<CompressedImage>;

	/**
	 * Mengatur mode flash / torch kamera.
	 */
	setFlashMode(mode: FlashMode): Promise<void>;

	/**
	 * Mendapatkan mode flash aktif saat ini.
	 */
	getFlashMode(): FlashMode;

	/**
	 * Memutar mode flash: off -> on -> torch -> off.
	 */
	toggleFlashMode(): Promise<FlashMode>;

	/**
	 * Menyesuaikan fokus dan pencahayaan otomatis pada titik koordinat layar yang ditekan.
	 */
	setFocus(point: { x: number; y: number }): Promise<void>;
}

export interface IPlatform {
	readonly type: PlatformType;
	readonly isNative: boolean;
	readonly filesystem: IFilesystemAdapter;
	readonly share: IShareAdapter;
	readonly backButton: IBackButtonAdapter;
	readonly statusBar: IStatusBarAdapter;
	readonly notifications: INotificationsAdapter;
	readonly biometrics: IBiometricsAdapter;
	readonly cameraOcr: ICameraOcrAdapter;
	readonly liveCamera: ILiveCameraAdapter;
	readonly haptics: IHapticsAdapter;
	readonly voice: IVoiceAdapter;
}
