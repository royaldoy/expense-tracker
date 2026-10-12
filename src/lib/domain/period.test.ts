import { describe, expect, it } from 'vitest';
import { formatPeriod, getPeriodForDate, isDateInPeriod } from './period';

describe('domain/period', () => {
	describe('getPeriodForDate', () => {
		it('menghitung periode standar kalender saat startDay = 1', () => {
			const date = new Date(2026, 9, 15); // 15 Oktober 2026
			const period = getPeriodForDate(date, 1);

			expect(period.startDate.getFullYear()).toBe(2026);
			expect(period.startDate.getMonth()).toBe(9); // Oktober
			expect(period.startDate.getDate()).toBe(1);

			expect(period.endDate.getFullYear()).toBe(2026);
			expect(period.endDate.getMonth()).toBe(9); // Oktober
			expect(period.endDate.getDate()).toBe(31);
		});

		it('menghitung periode gajian melintasi akhir tahun (Desember ke Januari)', () => {
			// Kasus A: Tanggal 28 Desember 2026 (setelah gajian 25 Des)
			const dateDesember = new Date(2026, 11, 28); // 28 Desember 2026
			const periodDes = getPeriodForDate(dateDesember, 25);

			expect(periodDes.startDate.getFullYear()).toBe(2026);
			expect(periodDes.startDate.getMonth()).toBe(11); // Desember
			expect(periodDes.startDate.getDate()).toBe(25);

			expect(periodDes.endDate.getFullYear()).toBe(2027);
			expect(periodDes.endDate.getMonth()).toBe(0); // Januari
			expect(periodDes.endDate.getDate()).toBe(24);

			// Kasus B: Tanggal 5 Januari 2027 (sebelum gajian 25 Jan, masuk periode Des 2026)
			const dateJanuari = new Date(2027, 0, 5); // 5 Januari 2027
			const periodJan = getPeriodForDate(dateJanuari, 25);

			expect(periodJan.startDate.getFullYear()).toBe(2026);
			expect(periodJan.startDate.getMonth()).toBe(11); // Desember
			expect(periodJan.startDate.getDate()).toBe(25);

			expect(periodJan.endDate.getFullYear()).toBe(2027);
			expect(periodJan.endDate.getMonth()).toBe(0); // Januari
			expect(periodJan.endDate.getDate()).toBe(24);
		});

		it('menangani bulan 28 hari (Februari tahun non-kabisat) dengan startDay = 31', () => {
			// 2026 bukan tahun kabisat (Februari = 28 hari)
			const dateFeb = new Date(2026, 1, 10); // 10 Februari 2026
			// startDay 31 pada Januari dimulai 31 Jan, berakhir 27 Feb (karena startDay Feb clamped ke 28)
			const period = getPeriodForDate(dateFeb, 31);

			expect(period.startDate.getFullYear()).toBe(2026);
			expect(period.startDate.getMonth()).toBe(0); // Januari
			expect(period.startDate.getDate()).toBe(31);

			expect(period.endDate.getFullYear()).toBe(2026);
			expect(period.endDate.getMonth()).toBe(1); // Februari
			expect(period.endDate.getDate()).toBe(27); // Sebelum 28 Feb (clamped startDay Feb)
		});

		it('menangani bulan 29 hari (Februari tahun kabisat) dengan startDay = 31', () => {
			// 2024 adalah tahun kabisat (Februari = 29 hari)
			const dateFeb = new Date(2024, 1, 15); // 15 Februari 2024
			const period = getPeriodForDate(dateFeb, 31);

			expect(period.startDate.getFullYear()).toBe(2024);
			expect(period.startDate.getMonth()).toBe(0); // Januari
			expect(period.startDate.getDate()).toBe(31);

			expect(period.endDate.getFullYear()).toBe(2024);
			expect(period.endDate.getMonth()).toBe(1); // Februari
			expect(period.endDate.getDate()).toBe(28); // Sebelum 29 Feb (clamped startDay Feb)
		});

		it('menangani bulan 30 hari (April) dengan startDay = 31', () => {
			// April = 30 hari
			const dateApr = new Date(2026, 3, 10); // 10 April 2026
			const period = getPeriodForDate(dateApr, 31);

			expect(period.startDate.getFullYear()).toBe(2026);
			expect(period.startDate.getMonth()).toBe(2); // Maret
			expect(period.startDate.getDate()).toBe(31);

			expect(period.endDate.getFullYear()).toBe(2026);
			expect(period.endDate.getMonth()).toBe(3); // April
			expect(period.endDate.getDate()).toBe(29); // Sebelum 30 Apr (clamped startDay Apr)
		});

		it('menangani bulan 31 hari (Juli-Agustus) dengan startDay = 31', () => {
			const dateAgs = new Date(2026, 7, 5); // 5 Agustus 2026
			const period = getPeriodForDate(dateAgs, 31);

			expect(period.startDate.getFullYear()).toBe(2026);
			expect(period.startDate.getMonth()).toBe(6); // Juli
			expect(period.startDate.getDate()).toBe(31);

			expect(period.endDate.getFullYear()).toBe(2026);
			expect(period.endDate.getMonth()).toBe(7); // Agustus
			expect(period.endDate.getDate()).toBe(30);
		});

		it('menerima tanggal dalam format ISO string', () => {
			const period = getPeriodForDate('2026-10-15', 1);
			expect(period.startDate.getDate()).toBe(1);
			expect(period.endDate.getDate()).toBe(31);
		});
	});

	describe('isDateInPeriod', () => {
		const period = getPeriodForDate(new Date(2026, 9, 15), 25);
		// Period: 25 Sep 2026 00:00:00 s/d 24 Okt 2026 23:59:59

		it('mengembalikan true untuk tanggal dalam periode', () => {
			expect(isDateInPeriod(new Date(2026, 9, 10), period)).toBe(true);
			expect(isDateInPeriod(new Date(2026, 8, 25, 0, 0, 0), period)).toBe(true);
			expect(isDateInPeriod(new Date(2026, 9, 24, 23, 59, 59), period)).toBe(true);
		});

		it('mengembalikan false untuk tanggal di luar periode', () => {
			expect(isDateInPeriod(new Date(2026, 8, 24, 23, 59, 59), period)).toBe(false);
			expect(isDateInPeriod(new Date(2026, 9, 25, 0, 0, 0), period)).toBe(false);
		});
	});

	describe('formatPeriod', () => {
		it('memformat rentang tanggal dengan bahasa Indonesia yang jelas', () => {
			const period = getPeriodForDate(new Date(2026, 11, 28), 25);
			const formatted = formatPeriod(period);
			expect(formatted).toBe('25 Des 2026 - 24 Jan 2027');
		});
	});
});
