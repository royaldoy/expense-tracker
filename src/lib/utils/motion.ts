/**
 * Utilitas Animasi Finansial
 * - animateCount: Animasi hitung naik angka moneter integer Rupiah
 *   - Hanya saat nilai pertama kali dimuat atau saat nilai berubah
 *   - Maksimum 600ms
 *   - Angka akhir selalu 100% persis sama dengan nilai asli
 *   - Otomatis dilewati (instan) pada mode Minimal, Mati, atau reduced-motion
 */

export function isMotionActive(): boolean {
	if (typeof window === 'undefined' || typeof document === 'undefined') return false;

	// Periksa preferensi dokumen
	const docMotion = document.documentElement.getAttribute('data-motion');
	if (docMotion === 'off' || docMotion === 'minimal') return false;

	// Periksa OS prefers-reduced-motion
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;

	return true;
}

export interface AnimateCountOptions {
	durationMs?: number;
	onUpdate: (value: number) => void;
}

/**
 * Menganimasikan transisi angka integer secara bertahap.
 * Mengembalikan fungsi cancel untuk membatalkan animasi jika komponen unmount.
 */
export function animateCount(from: number, to: number, options: AnimateCountOptions): () => void {
	const { durationMs = 500, onUpdate } = options;

	// Jika nilai sama, langsung kembalikan
	if (from === to) {
		onUpdate(to);
		return () => {};
	}

	// Nonaktif di mode Minimal / Mati / Reduced-Motion
	if (!isMotionActive()) {
		onUpdate(to);
		return () => {};
	}

	// Batasi durasi maksimum 600ms sesuai instruksi
	const duration = Math.min(600, Math.max(100, durationMs));
	const startTime = performance.now();
	let rafId = 0;
	let isCancelled = false;

	function tick(now: number) {
		if (isCancelled) return;

		const elapsed = now - startTime;
		const rawProgress = Math.min(1, elapsed / duration);

		// Easing curve: Quartic Out (sangat halus untuk angka)
		const easeProgress = 1 - Math.pow(1 - rawProgress, 4);

		if (rawProgress < 1) {
			const currentVal = Math.round(from + (to - from) * easeProgress);
			onUpdate(currentVal);
			rafId = requestAnimationFrame(tick);
		} else {
			// Angka akhir selalu persis sama dengan nilai asli
			onUpdate(to);
		}
	}

	rafId = requestAnimationFrame(tick);

	return () => {
		isCancelled = true;
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
	};
}
