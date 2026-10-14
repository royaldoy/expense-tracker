import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { DEFAULT_CATEGORIES } from './defaultCategories';
import type { Category, Wallet } from './types';
import { VoiceFixturesFileSchema, type VoiceFixtureItem } from './voiceFixtureSchema';
import { parseIndonesianSpokenNumber, parseVoiceTransaction } from './voiceParser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dummy dompet untuk pengujian
const mockWallets: Wallet[] = [
	{
		id: 'w-gopay',
		name: 'GoPay',
		type: 'ewallet',
		openingBalance: 100000,
		balance: 100000,
		color: '#00AED6',
		icon: 'account_balance_wallet',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'w-shopeepay',
		name: 'ShopeePay',
		type: 'ewallet',
		openingBalance: 50000,
		balance: 50000,
		color: '#EE4D2D',
		icon: 'account_balance_wallet',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'w-bca',
		name: 'BCA',
		type: 'bank',
		openingBalance: 5000000,
		balance: 5000000,
		color: '#0058BC',
		icon: 'account_balance',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	},
	{
		id: 'w-tunai',
		name: 'Tunai',
		type: 'cash',
		openingBalance: 200000,
		balance: 200000,
		color: '#006E28',
		icon: 'payments',
		includeInTotal: true,
		archivedAt: null,
		createdAt: 1000,
		updatedAt: 1000,
		deletedAt: null
	}
];

// Dummy kategori untuk pengujian berdasarkan DEFAULT_CATEGORIES
const mockCategories: Category[] = DEFAULT_CATEGORIES.map((def, idx) => ({
	id: `cat-${idx + 1}`,
	name: def.name,
	kind: def.kind,
	parentId: null,
	icon: def.icon,
	color: def.color,
	order: idx + 1,
	createdAt: 1000,
	updatedAt: 1000,
	deletedAt: null
}));

describe('Voice Transaction Parser (TDD)', () => {
	const refDate = new Date(2026, 9, 14, 12, 0, 0); // 14 Oktober 2026

	describe('1. Penguraian Angka & Bilangan Bahasa Indonesia', () => {
		it('mengurai format angka langsung dan simbol Rupiah', () => {
			expect(parseIndonesianSpokenNumber('25000')?.value).toBe(25000);
			expect(parseIndonesianSpokenNumber('25.000')?.value).toBe(25000);
			expect(parseIndonesianSpokenNumber('Rp 150.000')?.value).toBe(150000);
			expect(parseIndonesianSpokenNumber('Rp1.250.000')?.value).toBe(1250000);
			expect(parseIndonesianSpokenNumber('12,500')?.value).toBe(12500);
		});

		it('mengurai singkatan nominal (k, rb, jt)', () => {
			expect(parseIndonesianSpokenNumber('5k')?.value).toBe(5000);
			expect(parseIndonesianSpokenNumber('25rb')?.value).toBe(25000);
			expect(parseIndonesianSpokenNumber('50 rb')?.value).toBe(50000);
			expect(parseIndonesianSpokenNumber('1.5jt')?.value).toBe(1500000);
			expect(parseIndonesianSpokenNumber('1,5 jt')?.value).toBe(1500000);
			expect(parseIndonesianSpokenNumber('8.5jt')?.value).toBe(8500000);
			expect(parseIndonesianSpokenNumber('2 jt')?.value).toBe(2000000);
			expect(parseIndonesianSpokenNumber('100k')?.value).toBe(100000);
		});

		it('mengurai kata slang (goceng, ceban, gocap) dan perkaliannya', () => {
			expect(parseIndonesianSpokenNumber('goceng')?.value).toBe(5000);
			expect(parseIndonesianSpokenNumber('ceban')?.value).toBe(10000);
			expect(parseIndonesianSpokenNumber('gocap')?.value).toBe(50000);
			expect(parseIndonesianSpokenNumber('tiga ceban')?.value).toBe(30000);
			expect(parseIndonesianSpokenNumber('dua goceng')?.value).toBe(10000);
			expect(parseIndonesianSpokenNumber('dua ceban')?.value).toBe(20000);
		});

		it('mengurai kata bilangan dasar, belasan, puluhan, ratusan, ribuan, jutaan', () => {
			expect(parseIndonesianSpokenNumber('sepuluh ribu')?.value).toBe(10000);
			expect(parseIndonesianSpokenNumber('dua puluh lima ribu')?.value).toBe(25000);
			expect(parseIndonesianSpokenNumber('tiga puluh lima ribu')?.value).toBe(35000);
			expect(parseIndonesianSpokenNumber('seratus ribu')?.value).toBe(100000);
			expect(parseIndonesianSpokenNumber('seratus empat puluh dua ribu lima ratus')?.value).toBe(
				142500
			);
			expect(parseIndonesianSpokenNumber('delapan juta lima ratus ribu')?.value).toBe(8500000);
			expect(parseIndonesianSpokenNumber('satu miliar')?.value).toBe(1000000000);
		});

		it('mengurai pola fraksi setengah (setengah juta, satu setengah juta, dua setengah ribu)', () => {
			expect(parseIndonesianSpokenNumber('setengah juta')?.value).toBe(500000);
			expect(parseIndonesianSpokenNumber('satu setengah juta')?.value).toBe(1500000);
			expect(parseIndonesianSpokenNumber('dua setengah juta')?.value).toBe(2500000);
			expect(parseIndonesianSpokenNumber('dua setengah ribu')?.value).toBe(2500);
			expect(parseIndonesianSpokenNumber('setengah miliar')?.value).toBe(500000000);
		});
	});

	describe('2. Deteksi Tipe Transaksi & Penanda Tidak Yakin', () => {
		it('mendeteksi transaksi transfer dengan dompet asal dan tujuan', () => {
			const res = parseVoiceTransaction(
				'transfer lima ratus ribu dari bca ke gopay',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.type).toBe('transfer');
			expect(res.uncertainFlags.type).toBe(false);
			expect(res.amount).toBe(500000);
			expect(res.walletId).toBe('w-bca');
			expect(res.toWalletId).toBe('w-gopay');
		});

		it('mendeteksi transaksi pemasukan (income)', () => {
			const res = parseVoiceTransaction(
				'terima gaji delapan juta di bca hari ini',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.type).toBe('income');
			expect(res.uncertainFlags.type).toBe(false);
			expect(res.amount).toBe(8000000);
			expect(res.walletId).toBe('w-bca');
		});

		it('mendeteksi transaksi pengeluaran (expense)', () => {
			const res = parseVoiceTransaction(
				'beli makan siang 35 ribu pakai tunai',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.type).toBe('expense');
			expect(res.uncertainFlags.type).toBe(false);
			expect(res.amount).toBe(35000);
			expect(res.walletId).toBe('w-tunai');
		});

		it('menandai uncertainFlags.type bila kata kerja tipe transaksi tidak jelas', () => {
			const res = parseVoiceTransaction('kopi kenangan 25 ribu', mockWallets, mockCategories, {
				referenceDate: refDate
			});
			expect(res.type).toBe('expense'); // Default fallback
			expect(res.uncertainFlags.type).toBe(true);
			expect(res.amount).toBe(25000);
		});
	});

	describe('3. Deteksi Tanggal Relatif', () => {
		it('mendeteksi kemarin (-1 hari)', () => {
			const res = parseVoiceTransaction(
				'beli kopi 25rb pakai gopay kemarin',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.date.getDate()).toBe(13); // 14 - 1
			expect(res.uncertainFlags.date).toBe(false);
		});

		it('mendeteksi semalam (-1 hari)', () => {
			const res = parseVoiceTransaction('isi pulsa 50rb semalam', mockWallets, mockCategories, {
				referenceDate: refDate
			});
			expect(res.date.getDate()).toBe(13);
		});

		it('mendeteksi lusa (+2 hari)', () => {
			const res = parseVoiceTransaction(
				'bayar langganan netflix 186 ribu lusa',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.date.getDate()).toBe(16); // 14 + 2
		});

		it('mendeteksi kemarin lusa (-2 hari)', () => {
			const res = parseVoiceTransaction(
				'beli laptop 8.5jt kemarin lusa',
				mockWallets,
				mockCategories,
				{ referenceDate: refDate }
			);
			expect(res.date.getDate()).toBe(12); // 14 - 2
		});
	});

	describe('4. Evaluasi Fixture Lengkap tests/fixtures/voice/fixtures.json', () => {
		const fixturePath = path.resolve(__dirname, '../../../tests/fixtures/voice/fixtures.json');
		const rawJson = fs.readFileSync(fixturePath, 'utf-8');
		const parsedJson = JSON.parse(rawJson);

		it('memvalidasi format skema file fixture dengan Valibot', () => {
			const valRes = v.safeParse(VoiceFixturesFileSchema, parsedJson);
			if (!valRes.success) {
				const issues = valRes.issues.map((i) => i.message).join(', ');
				throw new Error(`Skema fixture gagal: ${issues}`);
			}
			expect(valRes.success).toBe(true);
		});

		const items: VoiceFixtureItem[] = parsedJson.fixtures;
		let typeMatches = 0;
		let amountMatches = 0;
		let categoryMatches = 0;
		let walletMatches = 0;
		let toWalletMatches = 0;
		let dateMatches = 0;

		for (const fixture of items) {
			it(`Fixture ${fixture.id}: "${fixture.sentence}"`, () => {
				const result = parseVoiceTransaction(fixture.sentence, mockWallets, mockCategories, {
					referenceDate: refDate
				});

				const expected = fixture.expected;

				// Evaluasi Tipe
				const typeOk = result.type === expected.type;
				if (typeOk) typeMatches++;
				expect(result.type).toBe(expected.type);

				if (expected.uncertain?.type !== undefined) {
					expect(result.uncertainFlags.type).toBe(expected.uncertain.type);
				}

				// Evaluasi Nominal
				const amountOk = result.amount === expected.amount;
				if (amountOk) amountMatches++;
				expect(result.amount).toBe(expected.amount);

				if (expected.uncertain?.amount !== undefined) {
					expect(result.uncertainFlags.amount).toBe(expected.uncertain.amount);
				}

				// Evaluasi Kategori
				const expectedCatId = expected.categoryName
					? (mockCategories.find((c) => c.name === expected.categoryName)?.id ?? null)
					: null;
				const catOk = result.categoryId === expectedCatId;
				if (catOk) categoryMatches++;
				expect(result.categoryId).toBe(expectedCatId);

				if (expected.uncertain?.category !== undefined) {
					expect(result.uncertainFlags.category).toBe(expected.uncertain.category);
				}

				// Evaluasi Dompet Asal
				const expectedWalletId = expected.walletName
					? (mockWallets.find((w) => w.name.toLowerCase() === expected.walletName?.toLowerCase())
							?.id ?? null)
					: null;
				const walletOk = result.walletId === expectedWalletId;
				if (walletOk) walletMatches++;
				expect(result.walletId).toBe(expectedWalletId);

				if (expected.uncertain?.wallet !== undefined) {
					expect(result.uncertainFlags.wallet).toBe(expected.uncertain.wallet);
				}

				// Evaluasi Dompet Tujuan (jika transfer)
				if (expected.type === 'transfer' || expected.toWalletName !== null) {
					const expectedToWalletId = expected.toWalletName
						? (mockWallets.find(
								(w) => w.name.toLowerCase() === expected.toWalletName?.toLowerCase()
							)?.id ?? null)
						: null;
					const toWalletOk = result.toWalletId === expectedToWalletId;
					if (toWalletOk) toWalletMatches++;
					expect(result.toWalletId).toBe(expectedToWalletId);
				}

				// Evaluasi Tanggal
				if (expected.relativeDays !== undefined) {
					const expDay = new Date(refDate);
					expDay.setDate(expDay.getDate() + expected.relativeDays);
					const dateOk = result.date.toDateString() === expDay.toDateString();
					if (dateOk) dateMatches++;
					expect(result.date.toDateString()).toBe(expDay.toDateString());
				} else {
					dateMatches++;
				}
			});
		}

		it('menghitung dan memverifikasi laporan akurasi per field', () => {
			const total = items.length;
			const transferTotal = items.filter(
				(i) => i.expected.type === 'transfer' || i.expected.toWalletName !== null
			).length;
			const typeAcc = (typeMatches / total) * 100;
			const amountAcc = (amountMatches / total) * 100;
			const catAcc = (categoryMatches / total) * 100;
			const walletAcc = (walletMatches / total) * 100;
			const toWalletAcc = (toWalletMatches / transferTotal) * 100;
			const dateAcc = (dateMatches / total) * 100;

			process.stdout.write('\n=== LAPORAN AKURASI VOICE PARSER ===\n');
			process.stdout.write(`Total Fixture : ${total}\n`);
			process.stdout.write(`Type Accuracy : ${typeAcc.toFixed(1)}% (${typeMatches}/${total})\n`);
			process.stdout.write(
				`Amount Accuracy: ${amountAcc.toFixed(1)}% (${amountMatches}/${total})\n`
			);
			process.stdout.write(
				`Category Acc   : ${catAcc.toFixed(1)}% (${categoryMatches}/${total})\n`
			);
			process.stdout.write(
				`Wallet Acc     : ${walletAcc.toFixed(1)}% (${walletMatches}/${total})\n`
			);
			process.stdout.write(
				`ToWallet Acc   : ${toWalletAcc.toFixed(1)}% (${toWalletMatches}/${transferTotal})\n`
			);
			process.stdout.write(`Date Acc       : ${dateAcc.toFixed(1)}% (${dateMatches}/${total})\n`);
			process.stdout.write('====================================\n');

			expect(typeAcc).toBeGreaterThanOrEqual(95);
			expect(amountAcc).toBeGreaterThanOrEqual(95);
			expect(catAcc).toBeGreaterThanOrEqual(95);
			expect(walletAcc).toBeGreaterThanOrEqual(95);
			expect(toWalletAcc).toBeGreaterThanOrEqual(95);
			expect(dateAcc).toBeGreaterThanOrEqual(95);
		});
	});
});
