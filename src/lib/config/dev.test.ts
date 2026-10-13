import { describe, expect, it } from 'vitest';
import { isDevToolsEnabled } from './dev';

describe('Dev Tools Configuration (isDevToolsEnabled)', () => {
	it('mengembalikan true jika VITE_DEV_TOOLS bernilai "true"', () => {
		expect(isDevToolsEnabled({ VITE_DEV_TOOLS: 'true' })).toBe(true);
	});

	it('mengembalikan false jika VITE_DEV_TOOLS bernilai "false", undefined, atau kosong', () => {
		expect(isDevToolsEnabled({ VITE_DEV_TOOLS: 'false' })).toBe(false);
		expect(isDevToolsEnabled({ VITE_DEV_TOOLS: '' })).toBe(false);
		expect(isDevToolsEnabled({})).toBe(false);
		expect(isDevToolsEnabled({ VITE_DEV_TOOLS: undefined })).toBe(false);
	});
});
