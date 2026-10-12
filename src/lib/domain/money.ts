/**
 * Domain Money - Operasi Uang Rupiah (Pure TypeScript)
 * Aturan data uang: Integer Rupiah, tanpa float/sen.
 */

/**
 * Format integer Rupiah ke string standar Indonesia.
 * Contoh: 1250000 -> "Rp1.250.000", -50000 -> "-Rp50.000", 0 -> "Rp0"
 */
export function formatRupiah(amount: number): string {
	const rounded = Math.round(amount);
	const isNegative = rounded < 0;
	const absolute = Math.abs(rounded);
	const formattedNumber = absolute.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

	return isNegative ? `-Rp${formattedNumber}` : `Rp${formattedNumber}`;
}

/**
 * Parsing string input (kotor/bersih/beragam) menjadi integer Rupiah.
 * Menangani:
 * - "Rp1.250.000" -> 1250000
 * - "-Rp50.000" -> -50000
 * - "(Rp50.000)" -> -50000
 * - "1.250.000,00" -> 1250000 (mengabaikan sen desimal)
 */
export function parseRupiah(input: string): number {
	if (!input || typeof input !== 'string') return 0;
	const trimmed = input.trim();
	if (!trimmed) return 0;

	// Deteksi tanda negatif (- atau kurung akuntansi)
	const isNegative =
		trimmed.startsWith('-') ||
		trimmed.includes('-Rp') ||
		trimmed.includes('- Rp') ||
		trimmed.includes('-') ||
		(trimmed.startsWith('(') && trimmed.endsWith(')'));

	// Tangani kasus ada desimal ",00" di akhir (format Indonesia)
	let cleaned = trimmed;
	const commaIndex = cleaned.lastIndexOf(',');
	if (commaIndex !== -1 && cleaned.length - commaIndex <= 3) {
		// Hapus bagian sen desimal setelah koma
		cleaned = cleaned.substring(0, commaIndex);
	}

	// Ambil hanya digit angka
	const cleanDigits = cleaned.replace(/\D/g, '');
	if (!cleanDigits) return 0;

	const val = parseInt(cleanDigits, 10);
	return isNegative ? -val : val;
}
