/**
 * Domain Period - Penanganan Periode Siklus Bulanan & Gajian (Pure TypeScript)
 * Menangani siklus tanggal gajian 1-31, bulan 28/29/30/31 hari, dan lintas tahun.
 */

import {
	addMonths,
	endOfDay,
	format,
	getDaysInMonth,
	isAfter,
	isBefore,
	startOfDay,
	subDays,
	subMonths
} from 'date-fns';
import { id } from 'date-fns/locale';

export interface Period {
	startDate: Date;
	endDate: Date;
	startDay: number;
}

export function clampDayToMonth(year: number, month: number, targetDay: number): number {
	const refDate = new Date(year, month, 1);
	const maxDays = getDaysInMonth(refDate);
	return Math.min(Math.max(1, targetDay), maxDays);
}

/**
 * Hitung periode gajian/anggaran bulanan untuk tanggal tertentu.
 * @param date Tanggal acuan (Date atau ISO string)
 * @param startDay Tanggal awal siklus (1-31, default 1 untuk tanggal kalender normal)
 */
export function getPeriodForDate(date: Date | string, startDay: number): Period {
	const target = typeof date === 'string' ? new Date(date) : date;
	const year = target.getFullYear();
	const month = target.getMonth();
	const dayOfMonth = target.getDate();

	const validStartDay = Math.min(Math.max(1, startDay), 31);
	const currentMonthClampedDay = clampDayToMonth(year, month, validStartDay);

	let periodStart: Date;
	let periodEnd: Date;

	if (validStartDay === 1) {
		// Siklus kalender biasa (tanggal 1 hingga hari terakhir bulan)
		periodStart = startOfDay(new Date(year, month, 1));
		periodEnd = endOfDay(new Date(year, month, getDaysInMonth(periodStart)));
	} else if (dayOfMonth >= currentMonthClampedDay) {
		// Siklus dimulai di bulan ini, berakhir pada H-1 tanggal gajian bulan berikutnya
		periodStart = startOfDay(new Date(year, month, currentMonthClampedDay));
		const nextMonth = addMonths(periodStart, 1);
		const nextMonthClampedDay = clampDayToMonth(
			nextMonth.getFullYear(),
			nextMonth.getMonth(),
			validStartDay
		);
		const nextMonthStart = new Date(
			nextMonth.getFullYear(),
			nextMonth.getMonth(),
			nextMonthClampedDay
		);
		periodEnd = endOfDay(subDays(nextMonthStart, 1));
	} else {
		// Siklus dimulai di bulan sebelumnya, berakhir pada H-1 tanggal gajian bulan ini
		const prevMonth = subMonths(target, 1);
		const prevMonthClampedDay = clampDayToMonth(
			prevMonth.getFullYear(),
			prevMonth.getMonth(),
			validStartDay
		);
		periodStart = startOfDay(
			new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthClampedDay)
		);
		const thisMonthStart = new Date(year, month, currentMonthClampedDay);
		periodEnd = endOfDay(subDays(thisMonthStart, 1));
	}

	return {
		startDate: periodStart,
		endDate: periodEnd,
		startDay: validStartDay
	};
}

/**
 * Periksa apakah suatu tanggal berada dalam rentang periode (inklusif).
 */
export function isDateInPeriod(date: Date | string, period: Period): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	return !isBefore(d, period.startDate) && !isAfter(d, period.endDate);
}

/**
 * Format rentang periode ke teks bahasa Indonesia.
 * Contoh: "25 Des 2026 - 24 Jan 2027"
 */
export function formatPeriod(period: Period): string {
	const startStr = format(period.startDate, 'd MMM yyyy', { locale: id });
	const endStr = format(period.endDate, 'd MMM yyyy', { locale: id });
	return `${startStr} - ${endStr}`;
}
