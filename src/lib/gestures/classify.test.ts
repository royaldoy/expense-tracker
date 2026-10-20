import { describe, expect, it } from 'vitest';
import {
	calculateDampenedDisplacement,
	classifyGesture,
	DEFAULT_GESTURE_CONFIG,
	type GestureMoveContext,
	type GestureStartContext
} from './classify';

describe('Klasifikasi Gestur Cepat (Pure Function)', () => {
	const defaultStart: GestureStartContext = {
		startX: 50,
		startY: 100,
		startTime: 1000,
		scrollTop: 0,
		statusBarHeight: 36,
		edgeZoneMargin: 32,
		isIgnoredElement: false
	};

	it('mengembalikan type "none" bila isIgnoredElement bernilai true (misal pada elemen data-no-gesture)', () => {
		const start: GestureStartContext = { ...defaultStart, isIgnoredElement: true };
		const move: GestureMoveContext = {
			...start,
			currentX: 150,
			currentY: 100,
			currentTime: 1100
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('none');
		expect(result.progress).toBe(0);
		expect(result.isExceeded).toBe(false);
	});

	it('mengklasifikasikan "swipe_right" bila geseran ke kanan dimulai dari jarak >= edgeZoneMargin (32px) dan dominan horizontal', () => {
		const move: GestureMoveContext = {
			...defaultStart,
			startX: 40, // >= 32px
			currentX: 130, // deltaX = +90px
			currentY: 105, // deltaY = +5px
			currentTime: 1150
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('swipe_right');
		expect(result.deltaX).toBe(90);
		expect(result.progress).toBeGreaterThanOrEqual(1.0);
		expect(result.isExceeded).toBe(true);
	});

	it('mengabaikan swipe kanan bila sentuhan dimulai di zona tepi Android back gesture (startX < 32px)', () => {
		const move: GestureMoveContext = {
			...defaultStart,
			startX: 20, // < 32px
			currentX: 120, // deltaX = +100px
			currentY: 100,
			currentTime: 1150
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('none');
		expect(result.isExceeded).toBe(false);
	});

	it('mengabaikan swipe bila gerakan ke kiri (deltaX < 0)', () => {
		const move: GestureMoveContext = {
			...defaultStart,
			startX: 150,
			currentX: 50, // deltaX = -100px
			currentY: 100,
			currentTime: 1150
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('none');
	});

	it('mengabaikan swipe bila tidak dominan horizontal (sudut diagonal/vertikal)', () => {
		const move: GestureMoveContext = {
			...defaultStart,
			startX: 50,
			currentX: 100, // deltaX = +50px
			currentY: 180, // deltaY = +80px
			currentTime: 1150
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('none');
	});

	it('mendeteksi isExceeded berdasarkan kecepatan (velocity threshold) meskipun jarak belum maksimal', () => {
		const move: GestureMoveContext = {
			...defaultStart,
			startX: 50,
			currentX: 95, // deltaX = 45px (di bawah distanceThreshold 75px)
			currentY: 100,
			currentTime: 1040 // dt = 40ms -> velocity = 45 / 40 = 1.125 px/ms (> 0.5 px/ms)
		};

		const result = classifyGesture(move);
		expect(result.type).toBe('swipe_right');
		expect(result.velocity).toBeGreaterThanOrEqual(DEFAULT_GESTURE_CONFIG.velocityThreshold);
		expect(result.isExceeded).toBe(true);
	});

	it('menghitung pergeseran layar dengan hambatan (rubber-band resistance)', () => {
		const displacementSmall = calculateDampenedDisplacement(50, 100, 0.45);
		const displacementLarge = calculateDampenedDisplacement(200, 100, 0.45);

		// Pergeseran harus lebih kecil dari delta mentah karena ada hambatan
		expect(displacementSmall).toBeLessThan(50);
		expect(displacementLarge).toBeLessThan(200);
		// Tidak melebihi batas maksimum hambatan
		expect(displacementLarge).toBeLessThanOrEqual(100);
	});
});
