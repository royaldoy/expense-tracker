/**
 * Domain Logic: Penyesuaian Saldo Dompet (Pure TypeScript)
 * Aturan data uang: Integer Rupiah murni, tidak ada float.
 * Selisih dicatat sebagai transaksi income/expense, tidak menimpa balance secara langsung.
 */

export interface BalanceAdjustmentResult {
	diff: number; // targetBalance - currentBalance
	type: 'income' | 'expense' | null;
	amount: number; // Math.abs(diff)
}

/**
 * Menghitung selisih dan tipe mutasi penyesuaian saldo.
 */
export function calculateBalanceAdjustment(
	currentBalance: number,
	targetBalance: number
): BalanceAdjustmentResult {
	const current = Math.round(currentBalance);
	const target = Math.round(targetBalance);

	if (target < 0) {
		throw new Error('Saldo target tidak boleh negatif');
	}

	const diff = target - current;

	if (diff === 0) {
		return {
			diff: 0,
			type: null,
			amount: 0
		};
	}

	if (diff > 0) {
		return {
			diff,
			type: 'income',
			amount: diff
		};
	}

	return {
		diff,
		type: 'expense',
		amount: Math.abs(diff)
	};
}
