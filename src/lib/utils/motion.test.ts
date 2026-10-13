import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateCount, isMotionActive } from './motion';

describe('Motion Utilities (animateCount & isMotionActive)', () => {
	let motionAttr = 'full';
	const originalDoc = globalThis.document;
	const originalWindow = globalThis.window;

	beforeEach(() => {
		vi.useFakeTimers();
		motionAttr = 'full';

		// Setup lightweight browser mocks
		globalThis.document = {
			documentElement: {
				getAttribute: () => motionAttr,
				setAttribute: (_: string, val: string) => {
					motionAttr = val;
				},
				removeAttribute: () => {
					motionAttr = 'full';
				}
			}
		} as unknown as Document;

		globalThis.window = {
			matchMedia: () => ({ matches: false })
		} as unknown as Window & typeof globalThis;
	});

	afterEach(() => {
		vi.useRealTimers();
		globalThis.document = originalDoc;
		globalThis.window = originalWindow;
	});

	it('mengembalikan angka final langsung jika from === to', () => {
		const onUpdate = vi.fn();
		animateCount(1000, 1000, { onUpdate });
		expect(onUpdate).toHaveBeenCalledWith(1000);
	});

	it('mengembalikan angka final langsung jika data-motion="off"', () => {
		motionAttr = 'off';
		const onUpdate = vi.fn();
		animateCount(0, 500000, { onUpdate });
		expect(onUpdate).toHaveBeenCalledWith(500000);
	});

	it('mengembalikan angka final langsung jika data-motion="minimal"', () => {
		motionAttr = 'minimal';
		const onUpdate = vi.fn();
		animateCount(0, 500000, { onUpdate });
		expect(onUpdate).toHaveBeenCalledWith(500000);
	});

	it('isMotionActive mendeteksi status dengan benar', () => {
		motionAttr = 'full';
		expect(isMotionActive()).toBe(true);
		motionAttr = 'minimal';
		expect(isMotionActive()).toBe(false);
		motionAttr = 'off';
		expect(isMotionActive()).toBe(false);
	});

	it('menghitung naik angka secara bertahap dan angka akhir persis sama dengan nilai asli', () => {
		motionAttr = 'full';
		let rafCallback: ((time: number) => void) | null = null;
		vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
			rafCallback = cb;
			return 1;
		});

		const updates: number[] = [];
		animateCount(0, 1000000, {
			durationMs: 500,
			onUpdate: (v) => updates.push(v)
		});

		// Trigger initial tick
		if (rafCallback) (rafCallback as (time: number) => void)(performance.now() + 250);
		// Trigger completion tick
		if (rafCallback) (rafCallback as (time: number) => void)(performance.now() + 600);

		expect(updates.length).toBeGreaterThan(0);
		expect(updates[updates.length - 1]).toBe(1000000);

		vi.unstubAllGlobals();
	});
});
