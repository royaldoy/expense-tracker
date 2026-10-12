import { describe, expect, it } from 'vitest';
import { formatRupiah, parseRupiah } from './money';

describe('domain/money', () => {
	describe('formatRupiah', () => {
		it('memformat angka positif menjadi format Rupiah standar Indonesia', () => {
			expect(formatRupiah(1250000)).toBe('Rp1.250.000');
			expect(formatRupiah(50000)).toBe('Rp50.000');
			expect(formatRupiah(500)).toBe('Rp500');
		});

		it('memformat angka nol', () => {
			expect(formatRupiah(0)).toBe('Rp0');
		});

		it('memformat angka negatif dengan prefix minus sebelum Rp', () => {
			expect(formatRupiah(-50000)).toBe('-Rp50.000');
			expect(formatRupiah(-1250000)).toBe('-Rp1.250.000');
			expect(formatRupiah(-750)).toBe('-Rp750');
		});

		it('membulatkan angka desimal ke integer Rupiah terdekat', () => {
			expect(formatRupiah(1250000.4)).toBe('Rp1.250.000');
			expect(formatRupiah(1250000.6)).toBe('Rp1.250.001');
			expect(formatRupiah(-50000.8)).toBe('-Rp50.001');
		});

		it('memformat nominal besar dengan benar', () => {
			expect(formatRupiah(1000000000)).toBe('Rp1.000.000.000');
			expect(formatRupiah(999999999999)).toBe('Rp999.999.999.999');
		});
	});

	describe('parseRupiah', () => {
		it('mem-parsing string angka murni', () => {
			expect(parseRupiah('1250000')).toBe(1250000);
			expect(parseRupiah('0')).toBe(0);
		});

		it('mem-parsing string berformat Rupiah standar', () => {
			expect(parseRupiah('Rp1.250.000')).toBe(1250000);
			expect(parseRupiah('Rp 1.250.000')).toBe(1250000);
			expect(parseRupiah('1.250.000')).toBe(1250000);
		});

		it('mem-parsing angka negatif dari berbagai format', () => {
			expect(parseRupiah('-Rp50.000')).toBe(-50000);
			expect(parseRupiah('- Rp50.000')).toBe(-50000);
			expect(parseRupiah('-50.000')).toBe(-50000);
			expect(parseRupiah('(Rp50.000)')).toBe(-50000);
			expect(parseRupiah('(50.000)')).toBe(-50000);
		});

		it('menangani input kotor dengan spasi atau karakter tak beraturan', () => {
			expect(parseRupiah('  Rp. 1.250.000,00  ')).toBe(1250000);
			expect(parseRupiah('rp 75.000')).toBe(75000);
		});

		it('mengembalikan 0 untuk input kosong atau tanpa angka', () => {
			expect(parseRupiah('')).toBe(0);
			expect(parseRupiah('   ')).toBe(0);
			expect(parseRupiah('Rp')).toBe(0);
			expect(parseRupiah('tidak ada angka')).toBe(0);
		});
	});
});
