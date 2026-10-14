# Voice Transaction Fixtures

Direktori ini berisi berkas fixture ujaran suara bahasa Indonesia untuk pengujian domain `voiceParser.ts`.

## Format Berkas `fixtures.json`

Setiap item fixture memiliki struktur berikut:

```json
{
  "id": "identifier-unik",
  "sentence": "kalimat ujaran suara bahasa Indonesia",
  "description": "keterangan skenario",
  "expected": {
    "type": "expense" | "income" | "transfer",
    "amount": 25000,
    "categoryName": "Makanan & Minuman" | null,
    "walletName": "GoPay" | null,
    "toWalletName": "BCA" | null,
    "relativeDays": 0, // 0 = hari ini, -1 = kemarin, -2 = 2 hari lalu, 2 = lusa
    "note": "Kopi kenangan" | null,
    "uncertain": {
      "type": false,
      "amount": false,
      "category": false,
      "wallet": false,
      "toWallet": false,
      "date": false
    }
  }
}
```

## Aturan Penambahan Fixture Nyata

1. Tulis kalimat persis seperti teks yang dihasilkan pengenal suara (tanpa tanda baca rumit, huruf kecil wajar).
2. Bila tipe transaksi tidak secara eksplisit disebutkan (misal hanya "kopi 25 ribu"), tentukan `type: "expense"` dengan `uncertain.type: true`.
3. Bila nama dompet tidak disebutkan, tentukan `walletName: null` dan `uncertain.wallet: true`.
4. Bila kategori tidak dikenali dari kamus, tentukan `categoryName: null` dan `uncertain.category: true`.
5. Jangan menyertakan data sensitif seperti nomor rekening lengkap, PIN, atau identitas pribadi.
