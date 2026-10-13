# Format & Panduan Fixture Ekstraksi Struk (Receipt OCR Fixtures)

Direktori ini digunakan untuk menyimpan sampel hasil OCR dari struk fisik kasir asli (Indomaret, Alfamart, SPBU Pertamina/Shell, Restoran/Kafe, dll.) untuk pengembangan dan pengujian otomatis (TDD) parser struk `receiptParser.ts`.

---

## 1. Cara Membuat Fixture Langsung dari HP (Android APK Debug)

1. Buka aplikasi **Money Tracker** di ponsel Android.
2. Masuk ke tab **Pengaturan** (`/settings`).
3. Gulir ke bagian bawah dan pilih menu **"Uji Kamera OCR"** (menu ini otomatis aktif pada build debug).
4. Tekan tombol **"Foto Kamera"** untuk memotret struk fisik secara tegak dan jelas, atau **"Pilih Galeri"** jika foto sudah diambil sebelumnya.
5. Tunggu proses OCR di perangkat selesai (<1 detik).
6. Tinjau hasil pembacaan baris teks dan lengkapi formulir **"Hasil yang Benar" (Ground Truth)**:
   - Nama Toko / Merchant (misal: `Indomaret`, `Kopi Kenangan`).
   - Grand Total Tagihan (angka integer Rupiah, misal: `45500`).
   - Tanggal & Jam Transaksi (opsional).
   - Daftar item produk: nama, kuantitas, harga satuan, dan total (opsional).
     _(Semua kolom bersifat opsional, isi data yang terlihat jelas pada struk fisik)._
7. Tekan tombol **"Bagikan Fixture (File JSON)"**.
8. Dialog native Android `@capacitor/share` akan terbuka. Simpan berkas JSON ke Google Drive, kirim via email, atau simpan ke File Manager.
   - Nama berkas otomatis: `<merchant>-<nomor>.json` (contoh: `indomaret-4210.json`, `kopi-kenangan-9042.json`).
9. Pindahkan berkas JSON tersebut ke dalam direktori ini (`tests/fixtures/receipts/`).

---

## 2. Struktur Format Berkas JSON (`*.json`)

Setiap berkas divalidasi oleh skema Valibot `ReceiptFixtureSchema` di `src/lib/domain/receiptFixtureSchema.ts`:

```json
{
	"description": "Struk fisik Indomaret belanja kebutuhan rumah tangga",
	"image": {
		"width": 1600,
		"height": 1200
	},
	"ocr": {
		"rawText": "INDOMARET POINT\nJL. JEND SUDIRMAN NO 10\n01/10/2026 14:30\nBIMOLI MNYK GRG 2L  1  34.000\nTOTAL                 34.000",
		"lines": [
			{
				"text": "INDOMARET POINT",
				"boundingBox": { "left": 160, "top": 45, "right": 440, "bottom": 80 }
			},
			{
				"text": "JL. JEND SUDIRMAN NO 10",
				"boundingBox": { "left": 120, "top": 85, "right": 480, "bottom": 110 }
			},
			{
				"text": "01/10/2026 14:30",
				"boundingBox": { "left": 150, "top": 120, "right": 450, "bottom": 145 }
			},
			{
				"text": "BIMOLI MNYK GRG 2L  1  34.000",
				"boundingBox": { "left": 60, "top": 160, "right": 540, "bottom": 195 }
			},
			{
				"text": "TOTAL                 34.000",
				"boundingBox": { "left": 60, "top": 200, "right": 540, "bottom": 240 }
			}
		]
	},
	"expected": {
		"merchantName": "INDOMARET POINT",
		"date": "2026-10-01",
		"time": "14:30",
		"grandTotal": 34000,
		"items": [
			{
				"name": "BIMOLI MNYK GRG 2L",
				"qty": 1,
				"unitPrice": 34000,
				"totalPrice": 34000
			}
		]
	}
}
```

### Catatan Nilai Angka & Keuangan:

- Semua nilai nominal uang di `expected` wajib berupa **Integer Rupiah** tanpa desimal (misal `34000`, bukan `34000.0` atau `"Rp34.000"`).
- Foto struk **TIDAK DIMASUKKAN** ke dalam berkas JSON (hanya dimensi pixel yang disimpan).

---

## 3. Aturan Menyamarkan Data Sensitif (Privacy & Anonymization Guidelines)

Sebelum menyimpan berkas JSON ke repositori git, **periksa teks OCR (`rawText` dan `lines`)** untuk memastikan tidak ada data pribadi sensitif yang terekam:

1. **Nama Kasir / Operator**:
   - Jika tertera nama kasir spesifik pada teks struk (misal: `KASIR: BUDI SANTOSO`), samarkan menjadi `KASIR: KASIR 01` atau `KASIR: ***`.
2. **Nomor Kartu Pembayaran (Debit / Kredit / QRIS)**:
   - Jika terdapat informasi nomor kartu ATM/kartu kredit, pastikan hanya 4 digit terakhir yang tersisa (misal: `**** **** **** 5678`), atau samarkan seluruh digit nomor kartu dengan karakter bintang `************`.
3. **Nomor Member / Nomor Telepon / ID Pelanggan**:
   - Jika struk memuat nomor telepon pelanggan atau barcode member (misal: `MEMBER: 081234567890`), samarkan digit tengah menjadi `0812****7890` atau `ID: MEM-****`.
4. **Alamat Rumah / Identitas Pribadi**:
   - Jika struk restoran pesan antar memuat alamat rumah penerima, ganti nama jalan dan nomor rumah dengan nama samaran (misal: `JL. CONTOH NO. 123`).
