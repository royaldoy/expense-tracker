# Format Fixture Ekstraksi Struk (Receipt OCR Fixtures)

Direktori ini digunakan untuk menyimpan sampel hasil OCR dari struk fisik asli (Indomaret, Alfamart, SPBU Pertamina/Shell, Kafe/Restoran, dll.) untuk pengujian TDD modul `receiptParser.ts`.

---

## Cara Membuat Fixture Baru

1. Buka halaman `/dev/ocr` di aplikasi (pada browser atau Android).
2. Unggah atau ambil foto struk asli.
3. Klik tombol **"Jalankan OCR"**.
4. Salin hasil JSON melalui tombol **"Salin JSON Fixture"**.
5. Simpan sebagai file baru di folder ini, misalnya: `indomaret_sample_1.json`, `kopi_kenangan_pb1.json`.

---

## Struktur File Fixture (`*.json`)

Setiap berkas fixture memuat dua bagian utama:

1. `ocr`: Blok dan baris teks mentah hasil ML Kit beserta `boundingBox` (`left, top, right, bottom`).
2. `expected`: Hasil finansial yang diharapkan setelah diekstraksi oleh parser aturan.

```json
{
	"description": "Struk Indomaret belanja kebutuhan rumah tangga dengan diskon",
	"ocr": {
		"rawText": "INDOMARET POINT\nJL. JEND SUDIRMAN NO 10\n01/10/2026 14:30\nBIMOLI MNYK GRG 2L  1  34.000\nINDOMIE GRG SPESIAL 5  3.100  15.500\nPOTONGAN HARGA        -4.000\nTOTAL                 45.500\nTUNAI                 50.000\nKEMBALIAN              4.500",
		"blocks": [
			{
				"text": "INDOMARET POINT\nJL. JEND SUDIRMAN NO 10",
				"boundingBox": { "left": 120, "top": 45, "right": 480, "bottom": 110 },
				"lines": [
					{
						"text": "INDOMARET POINT",
						"boundingBox": { "left": 160, "top": 45, "right": 440, "bottom": 80 }
					},
					{
						"text": "JL. JEND SUDIRMAN NO 10",
						"boundingBox": { "left": 120, "top": 85, "right": 480, "bottom": 110 }
					}
				]
			},
			{
				"text": "01/10/2026 14:30",
				"boundingBox": { "left": 150, "top": 120, "right": 450, "bottom": 145 },
				"lines": [
					{
						"text": "01/10/2026 14:30",
						"boundingBox": { "left": 150, "top": 120, "right": 450, "bottom": 145 }
					}
				]
			},
			{
				"text": "BIMOLI MNYK GRG 2L  1  34.000\nINDOMIE GRG SPESIAL 5  3.100  15.500",
				"boundingBox": { "left": 60, "top": 160, "right": 540, "bottom": 240 },
				"lines": [
					{
						"text": "BIMOLI MNYK GRG 2L  1  34.000",
						"boundingBox": { "left": 60, "top": 160, "right": 540, "bottom": 195 }
					},
					{
						"text": "INDOMIE GRG SPESIAL 5  3.100  15.500",
						"boundingBox": { "left": 60, "top": 200, "right": 540, "bottom": 235 }
					}
				]
			},
			{
				"text": "POTONGAN HARGA        -4.000\nTOTAL                 45.500",
				"boundingBox": { "left": 60, "top": 250, "right": 540, "bottom": 330 },
				"lines": [
					{
						"text": "POTONGAN HARGA        -4.000",
						"boundingBox": { "left": 60, "top": 250, "right": 540, "bottom": 285 }
					},
					{
						"text": "TOTAL                 45.500",
						"boundingBox": { "left": 60, "top": 290, "right": 540, "bottom": 330 }
					}
				]
			}
		]
	},
	"expected": {
		"merchantName": "INDOMARET POINT",
		"date": "2026-10-01",
		"time": "14:30:00",
		"items": [
			{
				"name": "BIMOLI MNYK GRG 2L",
				"qty": 1,
				"unitPrice": 34000,
				"totalPrice": 34000
			},
			{
				"name": "INDOMIE GRG SPESIAL",
				"qty": 5,
				"unitPrice": 3100,
				"totalPrice": 15500
			}
		],
		"subtotal": 49500,
		"discountAmount": 4000,
		"taxAmount": 0,
		"serviceCharge": 0,
		"grandTotal": 45500,
		"suggestedCategoryKeyword": "Belanja"
	}
}
```

---

## Catatan Aturan Angka Uang

- Seluruh nilai nominal di dalam `expected` wajib berupa **Integer Rupiah** tanpa desimal (misal `45500`, bukan `45500.0` atau `"45.500"`).
- Kolom tanggal diformat standar ISO: `YYYY-MM-DD`.
