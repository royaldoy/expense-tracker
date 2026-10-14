import { describe, expect, it } from 'vitest';
import { calculateBalanceAdjustment } from './adjustment';

describe('calculateBalanceAdjustment (TDD Domain Core)', () => {
	it('menghitung selisih positif sebagai income', () => {
		const currentBalance = 100000;
		const targetBalance = 150000;

		const result = calculateBalanceAdjustment(currentBalance, targetBalance);

		expect(result.diff).toBe(50000);
		expect(result.type).toBe('income');
		expect(result.amount).toBe(50000);
	});

	it('menghitung selisih negatif sebagai expense', () => {
		const currentBalance = 100000;
		const targetBalance = 60000;

		const result = calculateBalanceAdjustment(currentBalance, targetBalance);

		expect(result.diff).toBe(-40000);
		expect(result.type).toBe('expense');
		expect(result.amount).toBe(40000);
	});

	it('mengembalikan selisih nol tanpa mutasi transaksi (type null, amount 0)', () => {
		const currentBalance = 100000;
		const targetBalance = 100000;

		const result = calculateBalanceAdjustment(currentBalance, targetBalance);

		expect(result.diff).toBe(0);
		expect(result.type).toBeNull();
		expect(result.amount).toBe(0);
	});

	it('membulatkan nilai target ke integer Rupiah murni', () => {
		const currentBalance = 50000;
		const targetBalance = 75000.8;

		const result = calculateBalanceAdjustment(currentBalance, targetBalance);

		expect(result.diff).toBe(25001);
		expect(result.type).toBe('income');
		expect(result.amount).toBe(25001);
	});

	it('menolak target saldo negatif', () => {
		expect(() => calculateBalanceAdjustment(100000, -50000)).toThrowError(
			/Saldo target tidak boleh negatif/i
		);
	});
});
