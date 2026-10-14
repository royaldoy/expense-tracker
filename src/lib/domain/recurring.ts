/**
 * Domain Recurring - Logika Transaksi Berulang (Pure TypeScript)
 * DILARANG import svelte, dexie, atau capacitor.
 */

import { clampDayToMonth } from './period';
import type { RecurringFrequency } from './types';

export interface AdvanceRuleResult {
	nextRunAt: string; // YYYY-MM-DD (> asOfDate)
	dueDates: string[]; // [YYYY-MM-DD] (<= asOfDate)
}

/**
 * Parsing string tanggal YYYY-MM-DD ke objek Date lokal murni (tanpa UTC skew).
 */
function parseLocalDate(dateStr: string | Date): Date {
	if (dateStr instanceof Date) return dateStr;
	const parts = dateStr.slice(0, 10).split('-');
	const year = parseInt(parts[0], 10);
	const month = parseInt(parts[1], 10) - 1;
	const day = parseInt(parts[2], 10);
	return new Date(year, month, day);
}

/**
 * Format Date ke YYYY-MM-DD standar.
 */
function formatDateString(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Menghitung tanggal jadwal berikutnya berdasarkan frekuensi.
 * Menangani:
 * - Harian (daily): +1 hari.
 * - Mingguan (weekly): +7 hari.
 * - Bulanan (monthly): +1 bulan dengan penanganan tanggal 29-31 jatuh ke hari terakhir
 *   pada bulan pendek dan kembali ke hari basis di bulan panjang.
 * - Tahunan (yearly): +1 tahun dengan penanganan tanggal 29 Februari pada tahun kabisat.
 */
export function calculateNextRunAt(
	fromDate: Date | string,
	frequency: RecurringFrequency,
	baseDayOfMonth?: number
): string {
	const current = parseLocalDate(fromDate);
	const year = current.getFullYear();
	const month = current.getMonth();
	const day = current.getDate();

	const targetDay = baseDayOfMonth !== undefined ? baseDayOfMonth : day;

	switch (frequency) {
		case 'daily': {
			const next = new Date(year, month, day + 1);
			return formatDateString(next);
		}
		case 'weekly': {
			const next = new Date(year, month, day + 7);
			return formatDateString(next);
		}
		case 'monthly': {
			const nextMonthIndex = month + 1;
			const targetYear = year + Math.floor(nextMonthIndex / 12);
			const targetMonth = nextMonthIndex % 12;
			const clampedDay = clampDayToMonth(targetYear, targetMonth, targetDay);
			const next = new Date(targetYear, targetMonth, clampedDay);
			return formatDateString(next);
		}
		case 'yearly': {
			const targetYear = year + 1;
			const clampedDay = clampDayToMonth(targetYear, month, targetDay);
			const next = new Date(targetYear, month, clampedDay);
			return formatDateString(next);
		}
		default: {
			const next = new Date(year, month, day + 1);
			return formatDateString(next);
		}
	}
}

/**
 * Mengambil seluruh tanggal jatuh tempo yang terlewat (<= asOfDate).
 */
export function getDueDates(
	nextRunAt: string,
	frequency: RecurringFrequency,
	asOfDate: Date | string,
	baseDayOfMonth?: number
): string[] {
	const asOfStr = typeof asOfDate === 'string' ? asOfDate.slice(0, 10) : formatDateString(asOfDate);
	const targetDay =
		baseDayOfMonth !== undefined ? baseDayOfMonth : parseInt(nextRunAt.slice(8, 10), 10);

	const dueDates: string[] = [];
	let curr = nextRunAt.slice(0, 10);

	while (curr <= asOfStr) {
		dueDates.push(curr);
		curr = calculateNextRunAt(curr, frequency, targetDay);
	}

	return dueDates;
}

/**
 * Memajukan tanggal nextRunAt aturan berulang dan mengembalikan semua jadwal yang terlewat.
 */
export function advanceNextRunAt(
	currentNextRunAt: string,
	frequency: RecurringFrequency,
	asOfDate: Date | string,
	baseDayOfMonth?: number
): AdvanceRuleResult {
	const dueDates = getDueDates(currentNextRunAt, frequency, asOfDate, baseDayOfMonth);

	if (dueDates.length === 0) {
		return {
			nextRunAt: currentNextRunAt.slice(0, 10),
			dueDates: []
		};
	}

	const lastDueDate = dueDates[dueDates.length - 1];
	const targetDay =
		baseDayOfMonth !== undefined ? baseDayOfMonth : parseInt(currentNextRunAt.slice(8, 10), 10);
	const nextFutureDate = calculateNextRunAt(lastDueDate, frequency, targetDay);

	return {
		nextRunAt: nextFutureDate,
		dueDates
	};
}
