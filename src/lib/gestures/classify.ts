/**
 * Klasifikasi Gestur Cepat (Pure Functions)
 * Logika murni bebas efek samping untuk mendeteksi swipe kanan eksklusif di Beranda
 * dengan hambatan (rubber-banding), dominasi sumbu horizontal, dan zona tepi Android back.
 */

export type GestureType = 'swipe_right' | 'none';

export interface GestureStartContext {
	startX: number;
	startY: number;
	startTime: number;
	scrollTop: number;
	statusBarHeight?: number; // default 36px
	edgeZoneMargin?: number; // default 32px (hindari gesture back Android)
	isIgnoredElement?: boolean; // misal target di dalam data-no-gesture
}

export interface GestureMoveContext extends GestureStartContext {
	currentX: number;
	currentY: number;
	currentTime: number;
}

export interface GestureConfig {
	distanceThreshold: number; // ambang jarak minimum untuk aktivasi (px)
	velocityThreshold: number; // ambang kecepatan minimum untuk aktivasi (px/ms)
	axisDominanceRatio: number; // rasio dominasi sumbu utama vs minor
	maxResistanceDistance: number; // jarak pergeseran visual maksimum pada layar
	resistanceFactor: number; // faktor hambatan pegas
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
	distanceThreshold: 75,
	velocityThreshold: 0.5,
	axisDominanceRatio: 1.25,
	maxResistanceDistance: 96,
	resistanceFactor: 0.45
};

export interface GestureClassification {
	type: GestureType;
	deltaX: number;
	deltaY: number;
	velocity: number; // px/ms pada sumbu utama
	displacement: number; // pergeseran visual dengan hambatan (px)
	progress: number; // rasio progres menuju ambang batas (0.0 - 1.5)
	isExceeded: boolean; // apakah sudah melewati ambang batas jarak atau kecepatan
}

/**
 * Menghitung pergeseran visual dengan hambatan (rubber-band resistance)
 * @param delta Jarak seretan mentah pengguna (px)
 * @param maxDistance Batas perpindahan maksimum elemen pada layar
 * @param factor Faktor hambatan awal (semakin kecil semakin berat ditarik)
 */
export function calculateDampenedDisplacement(
	delta: number,
	maxDistance = 96,
	factor = 0.45
): number {
	if (delta <= 0) return 0;
	// Rumus kurva resistensi: delta * factor tereduksi seiring mendekati maxDistance
	const dampened = (delta * factor * maxDistance) / (delta * factor + maxDistance);
	return Math.min(dampened, maxDistance);
}

/**
 * Mengklasifikasikan gestur berdasarkan posisi sentuhan awal dan saat bergerak
 */
export function classifyGesture(
	ctx: GestureMoveContext,
	config: GestureConfig = DEFAULT_GESTURE_CONFIG
): GestureClassification {
	const noneResult: GestureClassification = {
		type: 'none',
		deltaX: 0,
		deltaY: 0,
		velocity: 0,
		displacement: 0,
		progress: 0,
		isExceeded: false
	};

	// 1. Abaikan sentuhan pada elemen yang dikecualikan (misal strip dompet data-no-gesture)
	if (ctx.isIgnoredElement) {
		return noneResult;
	}

	const deltaX = ctx.currentX - ctx.startX;
	const deltaY = ctx.currentY - ctx.startY;
	const absX = Math.abs(deltaX);
	const absY = Math.abs(deltaY);

	const dt = Math.max(1, ctx.currentTime - ctx.startTime);
	const edgeZoneMargin = ctx.edgeZoneMargin ?? 32;

	// 2. Evaluasi Swipe Kanan (menuju alur kamera scan)
	// Syarat:
	// - deltaX > 0 (arah kanan)
	// - startX >= edgeZoneMargin (tidak mulai di tepi paling kiri layar untuk hindari back Android)
	// - Dominan horizontal: absX > absY * axisDominanceRatio
	const isHorizontalSwipe = deltaX > 0 && absX > absY * config.axisDominanceRatio;
	const isOutsideBackZone = ctx.startX >= edgeZoneMargin;

	if (isHorizontalSwipe && isOutsideBackZone) {
		const velocity = deltaX / dt;
		const progress = Math.min(1.5, Math.max(0, deltaX / config.distanceThreshold));
		const isExceeded =
			progress >= 1.0 ||
			(velocity >= config.velocityThreshold && deltaX >= config.distanceThreshold * 0.4);
		const displacement = calculateDampenedDisplacement(
			deltaX,
			config.maxResistanceDistance,
			config.resistanceFactor
		);

		return {
			type: 'swipe_right',
			deltaX,
			deltaY,
			velocity,
			displacement,
			progress,
			isExceeded
		};
	}

	return noneResult;
}
