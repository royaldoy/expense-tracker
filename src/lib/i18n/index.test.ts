import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import idDictionary from './id.json';
import { t } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSourceFiles(dir: string): string[] {
	let results: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results = results.concat(getSourceFiles(fullPath));
		} else if (
			(entry.name.endsWith('.svelte') || entry.name.endsWith('.ts')) &&
			!entry.name.endsWith('.test.ts') &&
			!entry.name.endsWith('.spec.ts') &&
			!entry.name.endsWith('.e2e.ts')
		) {
			results.push(fullPath);
		}
	}

	return results;
}

function hasTranslationKey(dict: Record<string, unknown>, key: string): boolean {
	const segments = key.split('.');
	let current: unknown = dict;

	for (const segment of segments) {
		if (current && typeof current === 'object' && segment in current) {
			current = (current as Record<string, unknown>)[segment];
		} else {
			return false;
		}
	}

	return typeof current === 'string';
}

describe('Modul Internasionalisasi (i18n)', () => {
	it('menerjemahkan kunci teks tingkat atas dan bertingkat', () => {
		expect(t('common.simpan')).toBe('Simpan');
		expect(t('nav.beranda')).toBe('Beranda');
	});

	it('mengembalikan nama kunci jika kunci tidak ditemukan di id.json', () => {
		expect(t('nonexistent.key.xyz')).toBe('nonexistent.key.xyz');
	});

	it('mengganti parameter placeholder {param}', () => {
		expect(t('budgets.ambangDesc', { pct: 80 })).toBe(
			'Tandai waspada saat pengeluaran mencapai 80% limit'
		);
	});

	it('gagal bila ada panggilan t(...) di komponen atau kode sumber yang tidak ditemukan di id.json', () => {
		const srcDir = path.resolve(__dirname, '../../');
		const files = getSourceFiles(srcDir);
		const callRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
		const missingKeys: { file: string; key: string }[] = [];

		for (const file of files) {
			const content = fs.readFileSync(file, 'utf-8');
			// Hanya periksa berkas yang mengimpor atau menggunakan modul i18n
			if (!content.includes('i18n')) continue;

			let match: RegExpExecArray | null;
			while ((match = callRegex.exec(content)) !== null) {
				const key = match[1];
				if (!hasTranslationKey(idDictionary as Record<string, unknown>, key)) {
					const relativePath = path.relative(srcDir, file);
					missingKeys.push({ file: relativePath, key });
				}
			}
		}

		if (missingKeys.length > 0) {
			const report = missingKeys
				.map((m) => `  - [${m.file}] t('${m.key}') tidak ditemukan di id.json`)
				.join('\n');
			throw new Error(
				`Ditemukan ${missingKeys.length} kunci terjemahan yang belum ada di id.json:\n${report}`
			);
		}

		expect(missingKeys).toEqual([]);
	});
});
