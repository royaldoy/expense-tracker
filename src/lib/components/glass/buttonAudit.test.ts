import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Daftar pengecualian eksplisit untuk file .svelte yang diizinkan memuat tag <button> mentah.
 * Komponen dalam daftar ini adalah komponen primitif antarmuka yang memerlukan elemen semantik
 * khusus (seperti tombol switch, tab kontrol, grid keypad, atau container kartu yang dapat diklik).
 *
 * Semua tombol aksi pengguna umum pada rute (src/routes) WAJIB menggunakan GlassButton.
 */
const ALLOWED_RAW_BUTTON_COMPONENTS = new Set([
	'src/lib/components/glass/GlassButton.svelte',
	'src/lib/components/glass/GlassCard.svelte',
	'src/lib/components/glass/GlassFab.svelte',
	'src/lib/components/glass/GlassKeypad.svelte',
	'src/lib/components/glass/GlassListRow.svelte',
	'src/lib/components/glass/GlassSegmented.svelte',
	'src/lib/components/glass/GlassSwitch.svelte',
	'src/lib/components/glass/GlassTabBar.svelte',
	'src/lib/components/glass/WalletCard.svelte'
]);

function getAllSvelteFiles(dir: string, fileList: string[] = []): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			getAllSvelteFiles(fullPath, fileList);
		} else if (entry.isFile() && entry.name.endsWith('.svelte')) {
			fileList.push(fullPath);
		}
	}
	return fileList;
}

describe('Audit Standardisasi Tombol (GlassButton Enforcement)', () => {
	it('memastikan tidak ada tag <button> mentah di luar komponen yang diizinkan dalam allowlist', () => {
		const projectRoot = path.resolve(__dirname, '../../../../');
		const srcDir = path.join(projectRoot, 'src');
		const svelteFiles = getAllSvelteFiles(srcDir);

		const violations: Array<{ file: string; line: number; snippet: string }> = [];

		for (const file of svelteFiles) {
			const relativePath = path.relative(projectRoot, file);
			if (ALLOWED_RAW_BUTTON_COMPONENTS.has(relativePath)) {
				continue;
			}

			const content = fs.readFileSync(file, 'utf8');
			const lines = content.split('\n');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				// Deteksi pembuka tag <button
				if (/<button\b[^>]*>/i.test(line) || /<button\s*$/i.test(line)) {
					violations.push({
						file: relativePath,
						line: i + 1,
						snippet: line.trim()
					});
				}
			}
		}

		if (violations.length > 0) {
			const report = violations.map((v) => `  - ${v.file}:${v.line} -> ${v.snippet}`).join('\n');
			expect.fail(
				`Ditemukan ${violations.length} elemen <button> mentah di luar GlassButton allowlist:\n${report}\n\nHarap ganti dengan GlassButton.`
			);
		}

		expect(violations).toHaveLength(0);
	});

	it('memastikan GlassButton tidak memakai backdrop-filter (Zero-Backdrop-Filter performance rule)', () => {
		const projectRoot = path.resolve(__dirname, '../../../../');
		const glassButtonPath = path.join(projectRoot, 'src/lib/components/glass/GlassButton.svelte');
		const content = fs.readFileSync(glassButtonPath, 'utf8');

		expect(content).not.toContain('backdrop-filter');
		expect(content).not.toContain('backdrop-blur');
	});

	it('memastikan GlassButton mendefinisikan 5 varian kanonikal dan alias kompatibilitas', () => {
		const projectRoot = path.resolve(__dirname, '../../../../');
		const glassButtonPath = path.join(projectRoot, 'src/lib/components/glass/GlassButton.svelte');
		const content = fs.readFileSync(glassButtonPath, 'utf8');

		// 5 varian kanonikal
		expect(content).toContain("'primary'");
		expect(content).toContain("'secondary'");
		expect(content).toContain("'icon'");
		expect(content).toContain("'destructive'");
		expect(content).toContain("'text'");

		// Backward-compatible aliases
		expect(content).toContain("'danger'");
		expect(content).toContain("'ghost'");
		expect(content).toContain("if (variant === 'danger') return 'destructive'");
		expect(content).toContain("if (variant === 'ghost') return 'text'");
	});

	it('memastikan GlassButton memiliki dukungan 5 status interaktif (normal, pressed, disabled, focus-visible, loading)', () => {
		const projectRoot = path.resolve(__dirname, '../../../../');
		const glassButtonPath = path.join(projectRoot, 'src/lib/components/glass/GlassButton.svelte');
		const content = fs.readFileSync(glassButtonPath, 'utf8');

		// Pressed: spring transition and active scale
		expect(content).toContain('active:scale-[0.97]');
		expect(content).toContain('var(--motion-ease-spring');

		// Disabled: opacity & pointer events
		expect(content).toContain('disabled:opacity-40');
		expect(content).toContain('disabled:pointer-events-none');

		// Focus-visible: outline and ring
		expect(content).toContain('focus-visible:ring-2');
		expect(content).toContain('focus-visible:ring-primary');

		// Loading: spinner svg and aria-busy
		expect(content).toContain('aria-busy={loading');
		expect(content).toContain('animate-spin');
	});
});
