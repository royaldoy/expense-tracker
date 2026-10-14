# Money Tracker (Liquid Glass Finance)

Aplikasi pencatat keuangan pribadi multi-dompet modern (_expense & income tracker_) dengan estetika **iOS Liquid Glass**. Dirancang dengan arsitektur **Offline-First**, data Anda tersimpan 100% di perangkat secara privat tanpa server pihak ketiga.

Dibangun dengan **Svelte 5 (Runes)**, **TypeScript Strict**, **Tailwind CSS v4**, **Dexie (IndexedDB)** & **SQLite**, serta dibungkus menggunakan **Capacitor 7** menjadi aplikasi Android native.

---

## 🌟 Fitur Utama

### 1. 💳 Multi-Dompet Terintegrasi (Multi-Wallet)

- Kelola berbagai sumber dana dalam satu dashboard: Rekening Bank (BCA, Mandiri, BRI), E-Wallet (GoPay, ShopeePay, OVO, DANA), hingga Uang Tunai (_Cash_).
- Saldo dihitung secara atomik dan akurat menggunakan integer Rupiah.
- Dilengkapi fitur **Penyesuaian Saldo** (koreksi saldo riil vs catatan tanpa merusak konsistensi riwayat transaksi).
- Opsi untuk menyembunyikan atau menyertakan dompet tertentu dalam total saldo gabungan.

### 2. ⚡ Pencatatan Kilat & Transfer Antar Dompet

- **Keypad Cepat**: Dilengkapi tombol nominal cepat (`000`), kalkulasi instan, dan haptic feedback saat ditekan.
- **Transfer Antar Dompet**: Mendukung pencatatan biaya admin (misal biaya transfer Rp2.500) yang otomatis dicatat sebagai pengeluaran terpisah tanpa mengubah status transfer.
- **Hierarki Kategori**: Kategori pengeluaran dan pemasukan dengan ikon dan warna kustom yang mudah dipersonalisasi.
- **Filter Canggih**: Pencarian teks catatan & kategori, filter multi-dompet, multi-kategori, rentang nominal, dan rentang tanggal dengan indikator chip yang dapat dihapus.

### 3. 🎙️ Pencatatan Berbasis Suara (Voice Transaction Input)

- Bicara dalam bahasa Indonesia alami untuk mencatat transaksi:
  > _"Beli kopi susu 25 ribu pakai GoPay kemarin"_  
  > _"Gajian 8 juta masuk ke BCA"_  
  > _"Transfer 500rb dari BCA ke ShopeePay biaya admin 2500"_
- **Voice Parser Cerdas**: Mendukung bilangan kata Indonesia (_satu_ hingga _miliar_, _seratus_, _seribu_, _setengah_), singkatan nominal (_rb_, _k_, _jt_), dan istilah gaul (_goceng_, _ceban_, _gocap_).
- **Konfirmasi Aman**: Hasil pengenalan suara tidak pernah langsung menyimpan transaksi ke database. Field yang ambigu diberi tanda oranye agar dapat diverifikasi terlebih dahulu oleh pengguna.

### 4. 📸 Pemindai Struk Belanja (Receipt Scanner & OCR)

- Pindai struk fisik belanja (Indomaret, Alfamart, restoran, supermarket) via kamera perangkat atau galeri.
- Didukung Google ML Kit Text Recognition di sisi perangkat secara luring (_offline_).
- Tersedia alat inspeksi dan generator fixture OCR di `/dev/ocr` untuk pengujian deterministik.

### 5. 👆 Gestur Cepat di Beranda (Quick Gestures)

- **Geser ke Kanan (Swipe Right)**: Membuka alur pemindai struk instan. Dilengkapi proteksi zona tepi sistem Android (`>= 32px`) agar tidak berbenturan dengan gestur _back_ OS.
- **Tarik ke Bawah (Pull Down)**: Membuka perekam suara transaksi. Hanya aktif saat berada di bagian paling atas (`scrollTop = 0`).
- **Fisika Pegas & Hambatan Karet (_Rubber-Banding_)**: Pergeseran visual halus 60fps dengan pegas balik jika sentuhan dilepas sebelum melewati batas ambang.
- Saklar aktivasi di Pengaturan serta pengecualian cerdas pada elemen scroll horizontal (`data-no-gesture`).

### 6. 📊 Anggaran Bulanan (Category Budgets)

- Atur batas pengeluaran per kategori bulanan.
- Status pemantauan visual otomatis: **Aman** (hijau), **Waspada** (oranye saat mencapai batas peringatan, default 80%), dan **Lewat** (merah saat _overbudget_).
- Periode anggaran otomatis menyesuaikan **Siklus Tanggal Gajian** (misal tanggal 25 hingga 24 bulan berikutnya).
- Ringkasan anggaran terintegrasi di Dashboard Beranda.

### 7. 🔁 Transaksi Berulang & Langganan (Recurring Bills)

- Otomatisasi pengeluaran rutin: Tagihan listrik, sewa kontrakan, cicilan, langganan Netflix/Spotify, atau gaji bulanan.
- Mendukung frekuensi harian, mingguan, bulanan (termasuk penanganan cerdas tanggal 29–31 pada bulan pendek/kabisat), dan tahunan.
- **Eksekusi Idempoten**: Mencatat seluruh jadwal yang jatuh tempo saat aplikasi dibuka tanpa risiko transaksi ganda (_double posting_).
- Mode **Catat Otomatis** (_autoPost_) atau konfirmasi manual.

### 8. 🔔 Pusat Notifikasi Lokal (Notification Center)

- Kotak masuk lokal di `/notifications` dengan filter Belum Dibaca dan Semua.
- Pengingat tagihan jatuh tempo, peringatan batas anggaran, dan pengingat catat harian pada jam yang dapat diatur.
- Berjalan 100% lokal di perangkat tanpa memerlukan server notifikasi eksternal.

### 9. 📈 Laporan Keuangan & Ekspor Berkas Resmi

- **4 Tab Analisis**:
  1. _Ringkasan_: Arus kas total pemasukan, pengeluaran, transfer, dan tabungan bersih.
  2. _Kategori_: Diagram donat komposisi pengeluaran per kategori.
  3. _Dompet_: Sebaran saldo dan transaksi per dompet.
  4. _Tren_: Kurva tren pengeluaran harian dan mingguan.
- **Ekspor Dokumen**:
  - **PDF (.pdf)**: Dokumen siap cetak dengan ringkasan visual dan tabel riwayat transaksi.
  - **Excel (.xlsx)**: Spreadsheet terstruktur dengan multi-sheet (Ringkasan, Kategori, Transaksi).
  - **CSV (.csv)**: Berkas data universal dengan format UTF-8 BOM.
  - Berbagi dokumen langsung melalui fitur share bawaan Android/iOS (_Capacitor Share_).

### 10. 🔒 Keamanan & Privasi Tingkat Tinggi

- **Kunci PIN Keamanan**: Disimpan menggunakan hashing kriptografi **PBKDF2 Web Crypto SHA-256** dengan _salt_ acak lokal.
- **Sensor Saldo di Beranda**: Opsi menyamarkan seluruh nominal saldo menjadi `••••••••` untuk privasi di tempat umum.
- **Cadangan & Pemulihan (Backup & Restore)**: Ekspor seluruh database menjadi berkas JSON berversi terenkripsi lokal, dengan validasi skema Valibot ketat sebelum pemulihan. Status PIN tidak pernah diekspor demi keamanan.

### 11. 🎨 Estetika iOS Liquid Glass & Sistem Animasi

- **GlassDock 4-Tab**: Navigasi simetris dengan sliding pill indicator murni GPU-accelerated (60fps).
- **GlassFab (Floating Action Button)**: Tombol aksi cepat bulat 56px dengan fitur _Scroll Auto-Hide_ (sembunyi saat scroll ke bawah, muncul saat scroll ke atas).
- **Sistem Animasi Terpadu**: View Transitions API, efek haptic presisi (@capacitor/haptics), transisi pegas (_spring physics_), dan preferensi mode animasi (_Penuh_, _Minimal_, _Mati_).
- **Aksesibilitas**: Mendukung tema Gelap (_Dark Mode_), opsi _Kurangi Transparansi_ (tanpa backdrop-filter untuk ponsel hemat daya), dan kepatuhan kontras WCAG.

---

## 🛠️ Stack Teknologi

| Komponen            | Teknologi / Pustaka                                                   |
| :------------------ | :-------------------------------------------------------------------- |
| **Framework**       | [Svelte 5](https://svelte.dev/) (Runes reactivity)                    |
| **Meta-Framework**  | [SvelteKit](https://kit.svelte.dev/) (adapter-static)                 |
| **Bahasa**          | TypeScript (Strict mode, zero `any`)                                  |
| **Styling**         | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Vars                |
| **Database Lokal**  | [Dexie.js](https://dexie.org/) (IndexedDB) & SQLite                   |
| **Validasi Skema**  | [Valibot](https://valibot.dev/)                                       |
| **Waktu & Tanggal** | [date-fns](https://date-fns.org/)                                     |
| **Mobile Native**   | [Capacitor 7](https://capacitorjs.com/) (Android)                     |
| **OCR & Kamera**    | Google ML Kit Text Recognition via Capacitor Plugin                   |
| **Pengujian**       | [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/) |

---

## 📐 Prinsip & Aturan Data Keuangan

1. **Uang adalah Integer Rupiah**: Dilarang keras menggunakan tipe data `float` untuk uang. Seluruh perhitungan menggunakan integer Rupiah murni untuk mencegah masalah pembulatan desimal biner. Format dan parsing hanya dilakukan melalui modul `src/lib/domain/money.ts`.
2. **Kemandirian Domain**: Direktori `src/lib/domain/` berisi logika bisnis TypeScript murni tanpa dependensi ke Svelte, Dexie, atau Capacitor.
3. **Pemisahan Lapisan (Layering)**: Komponen antarmuka pengguna tidak pernah mengakses database secara langsung. Alur data mengikuti: `UI Component -> Store -> Service -> Domain & Repository`.
4. **Konsistensi Saldo Atomik**: Pembaruan transaksi dan pembaruan cache saldo dompet dieksekusi dalam satu transaksi database atomik (_all-or-nothing_). Fungsi pemulihan `rebuildBalances()` selalu tersedia untuk mengaudit integritas saldo.
5. **Soft Delete & ULID**: Seluruh entitas tabel menggunakan ULID sebagai ID unik berurut waktu serta field `createdAt`, `updatedAt`, dan `deletedAt`.

---

## 🚀 Memulai Proyek

### Prasyarat

- [Node.js](https://nodejs.org/) v18.0.0 atau lebih baru
- [pnpm](https://pnpm.io/) v9.0.0 atau lebih baru
- Android Studio / Android SDK (jika ingin mengompilasi APK Android)

### Instalasi & Menjalankan Mode Dev

```bash
# 1. Klon repositori
git clone https://github.com/royaldoy/expense-tracker.git
cd expense-tracker

# 2. Pasang dependensi
pnpm install

# 3. Jalankan server pengembang lokal
pnpm dev
```

Buka peramban di `http://localhost:5173`.

---

## 🧪 Pengujian & Pemeriksaan Kode

Aplikasi ini menerapkan standar pengujian ketat (_Test-Driven Development_):

```bash
# Pemeriksaan tipe TypeScript dan validasi template Svelte
pnpm check

# Pemeriksaan linter dan format kode (ESLint + Prettier)
pnpm lint

# Menjalankan seluruh unit test logika domain & service (Vitest)
pnpm test

# Menjalankan end-to-end testing dengan browser simulasi mobile (Playwright)
pnpm test:e2e

# Membangun build produksi SPA statis ke folder build/
pnpm build
```

---

## 📱 Membangun Aplikasi Android (APK)

Aplikasi dibungkus menjadi aplikasi Android mandiri menggunakan Capacitor:

```bash
# 1. Bangun aset statis web
pnpm build

# 2. Sinkronkan aset ke folder android/
npx cap sync android

# 3. Kompilasi APK Debug menggunakan Gradle wrapper
cd android
./gradlew assembleDebug
```

Berkas APK yang dihasilkan akan berada di:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📂 Struktur Direktori

```text
├── android/                 # Proyek native Android Capacitor
├── scripts/                 # Skrip migrasi dan uji beban seeding data
├── src/
│   ├── app.css              # Token CSS variables, utility glass, dan tema gelap/terang
│   ├── app.html             # Shell HTML dengan konfigurasi viewport & safe area
│   ├── lib/
│   │   ├── components/      # Komponen UI modular
│   │   │   ├── glass/       # Komponen tema Liquid Glass (AppHeader, GlassDock, GlassFab, dll.)
│   │   │   ├── security/    # Komponen kunci PIN dan verifikasi keamanan
│   │   │   └── voice/       # Modal dan indikator ujaran suara
│   │   ├── db/              # Skema Dexie, SQLite adapter, migrasi skema, dan repository
│   │   ├── domain/          # Logika murni: money, balance, budget, recurring, voiceParser
│   │   ├── gestures/        # Fungsi murni klasifikasi gestur sentuhan & rubber-banding
│   │   ├── i18n/            # Lokalisasi bahasa Indonesia (id.json)
│   │   ├── platform/        # Adapter platform (Web & Capacitor native)
│   │   ├── services/        # Use-case bisnis (transactionService, walletService, dll.)
│   │   └── stores/          # Svelte stores reaktif (uiStore, securityStore, voiceStore)
│   └── routes/              # Halaman dan rute SvelteKit SPA (+page.svelte)
└── tests/                   # Fixture pengujian suara, struk OCR, dan test helper
```

---

## 📜 Lisensi & Privasi

Aplikasi ini didistribusikan untuk penggunaan pribadi secara terbuka. Seluruh data keuangan Anda berada sepenuhnya di kendali Anda, tersimpan di perangkat lokal, dan tidak pernah diunggah ke cloud tanpa izin Anda.
