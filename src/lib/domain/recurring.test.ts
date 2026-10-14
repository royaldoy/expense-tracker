import { describe, expect, it } from 'vitest';
import { advanceNextRunAt, calculateNextRunAt, getDueDates } from './recurring';

describe('Domain Recurring (TDD Core Pure TypeScript)', () => {
	describe('calculateNextRunAt - Perhitungan Siklus Berikutnya', () => {
		it('menghitung siklus harian (daily)', () => {
			const next = calculateNextRunAt('2026-10-13', 'daily');
			expect(next).toBe('2026-10-14');
		});

		it('menghitung siklus mingguan (weekly)', () => {
			const next = calculateNextRunAt('2026-10-13', 'weekly');
			expect(next).toBe('2026-10-20');
		});

		it('menghitung siklus bulanan kalender normal', () => {
			const next = calculateNextRunAt('2026-05-15', 'monthly', 15);
			expect(next).toBe('2026-06-15');
		});

		it('menangani tanggal akhir bulan (31) yang jatuh ke hari terakhir bulan pendek', () => {
			// Jan 31 -> Feb 2026 (non-kabisat) jatuh ke 28 Feb
			const nextFeb = calculateNextRunAt('2026-01-31', 'monthly', 31);
			expect(nextFeb).toBe('2026-02-28');

			// Feb 28 (dengan base 31) -> Maret memiliki 31 hari, kembali ke 31 Maret!
			const nextMar = calculateNextRunAt('2026-02-28', 'monthly', 31);
			expect(nextMar).toBe('2026-03-31');

			// Mar 31 -> April memiliki 30 hari, jatuh ke 30 April
			const nextApr = calculateNextRunAt('2026-03-31', 'monthly', 31);
			expect(nextApr).toBe('2026-04-30');

			// Apr 30 (dengan base 31) -> Mei memiliki 31 hari, kembali ke 31 Mei!
			const nextMay = calculateNextRunAt('2026-04-30', 'monthly', 31);
			expect(nextMay).toBe('2026-05-31');
		});

		it('menangani tanggal 31 Januari pada tahun kabisat (2024) jatuh ke 29 Februari', () => {
			const nextLeapFeb = calculateNextRunAt('2024-01-31', 'monthly', 31);
			expect(nextLeapFeb).toBe('2024-02-29');

			const nextLeapMar = calculateNextRunAt('2024-02-29', 'monthly', 31);
			expect(nextLeapMar).toBe('2024-03-31');
		});

		it('menangani tanggal 30 pada bulan Februari', () => {
			const next = calculateNextRunAt('2026-01-30', 'monthly', 30);
			expect(next).toBe('2026-02-28');
		});

		it('menghitung siklus tahunan (yearly) normal dan tahun kabisat', () => {
			// Normal: 15 Okt 2026 -> 15 Okt 2027
			const nextNormal = calculateNextRunAt('2026-10-15', 'yearly');
			expect(nextNormal).toBe('2027-10-15');

			// 29 Feb 2024 (kabisat) -> 2025 bukan kabisat, jatuh ke 28 Feb!
			const nextNonLeap = calculateNextRunAt('2024-02-29', 'yearly', 29);
			expect(nextNonLeap).toBe('2025-02-28');

			// 28 Feb 2027 (dengan base 29 Feb) -> 2028 tahun kabisat, kembali ke 29 Feb!
			const nextLeap = calculateNextRunAt('2027-02-28', 'yearly', 29);
			expect(nextLeap).toBe('2028-02-29');
		});
	});

	describe('getDueDates & advanceNextRunAt - Catch-up Jadwal Terlewat & Idempotensi', () => {
		it('mengembalikan array kosong jika nextRunAt masih di masa depan (> asOfDate)', () => {
			const due = getDueDates('2026-10-20', 'monthly', '2026-10-13');
			expect(due).toEqual([]);

			const adv = advanceNextRunAt('2026-10-20', 'monthly', '2026-10-13');
			expect(adv.dueDates).toEqual([]);
			expect(adv.nextRunAt).toBe('2026-10-20');
		});

		it('mengembalikan tepat 1 tanggal jika jadwal jatuh tempo hari ini (= asOfDate)', () => {
			const adv = advanceNextRunAt('2026-10-13', 'daily', '2026-10-13');
			expect(adv.dueDates).toEqual(['2026-10-13']);
			expect(adv.nextRunAt).toBe('2026-10-14');
		});

		it('mencatat semua jadwal yang terlewat beberapa bulan (bukan hanya yang terakhir)', () => {
			// Jadwal bulanan tanggal 1, terlewat sejak 1 Juli 2026, dicek per 13 Oktober 2026
			const adv = advanceNextRunAt('2026-07-01', 'monthly', '2026-10-13', 1);

			// Harus mencakup 4 jadwal terlewat: 1 Juli, 1 Agu, 1 Sep, 1 Okt!
			expect(adv.dueDates).toEqual(['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']);

			// nextRunAt masa depan berikutnya adalah 1 Nov 2026
			expect(adv.nextRunAt).toBe('2026-11-01');
		});

		it('mencatat semua jadwal harian yang terlewat beberapa hari', () => {
			const adv = advanceNextRunAt('2026-10-09', 'daily', '2026-10-13');

			expect(adv.dueDates).toEqual([
				'2026-10-09',
				'2026-10-10',
				'2026-10-11',
				'2026-10-12',
				'2026-10-13'
			]);
			expect(adv.nextRunAt).toBe('2026-10-14');
		});

		it('menangani catch-up jadwal bulanan akhir bulan (tanggal 31) yang terlewat sepanjang tahun', () => {
			// Jadwal 31 Januari 2026, dicek per 3 Mei 2026
			const adv = advanceNextRunAt('2026-01-31', 'monthly', '2026-05-03', 31);

			// Harus menghasilkan tanggal akhir bulan yang tepat untuk masing-masing bulan
			expect(adv.dueDates).toEqual([
				'2026-01-31',
				'2026-02-28', // Feb non-kabisat clamped ke 28
				'2026-03-31', // Mar kembali ke 31
				'2026-04-30' // Apr clamped ke 30
			]);

			// Next run di masa depan adalah 31 Mei 2026
			expect(adv.nextRunAt).toBe('2026-05-31');
		});
	});
});
