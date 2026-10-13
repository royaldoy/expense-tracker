import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { ReceiptFixtureSchema } from '../../../src/lib/domain/receiptFixtureSchema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Validasi Format Fixture Ekstraksi Struk (Valibot Schema)', () => {
	const fixturesDir = path.resolve(__dirname);
	const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

	it('memiliki minimal satu file fixture contoh untuk pengujian', () => {
		expect(fixtureFiles.length).toBeGreaterThan(0);
	});

	for (const filename of fixtureFiles) {
		it(`file fixture ${filename} memenuhi skema ReceiptFixtureSchema`, () => {
			const filePath = path.join(fixturesDir, filename);
			const rawContent = fs.readFileSync(filePath, 'utf-8');
			const parsedJson = JSON.parse(rawContent);

			const parseResult = v.safeParse(ReceiptFixtureSchema, parsedJson);
			if (!parseResult.success) {
				const issues = parseResult.issues
					.map((i) => `${i.path?.map((p) => p.key).join('.')}: ${i.message}`)
					.join(', ');
				throw new Error(`Fixture ${filename} tidak valid: ${issues}`);
			}

			expect(parseResult.success).toBe(true);
			expect(parseResult.output.ocr.rawText).toBeDefined();
			expect(parseResult.output.ocr.lines.length).toBeGreaterThan(0);
			expect(parseResult.output.image.width).toBeGreaterThan(0);
			expect(parseResult.output.image.height).toBeGreaterThan(0);
		});
	}
});
