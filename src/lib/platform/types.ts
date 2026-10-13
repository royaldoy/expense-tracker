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
}
