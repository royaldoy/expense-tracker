# Progress Proyek Money Tracker

## Status Saat Ini

- **Fase 0: Inisialisasi Proyek & Tooling** - Selesai
- **Fase 1: Domain Core & Logika Uang** - Selesai
- **Fase 2: Database Lokal & Repository (Dexie)** - Selesai
- **Fase 3: Services Lanjutan & Validasi (Valibot)** - Selesai
- **Fase 4: Sistem UI Liquid Glass, Shell Aplikasi & Galeri Komponen** - Selesai (LANGKAH 1 & LANGKAH 2)
- **Fase 5: Fitur Halaman & Alur Pengguna P0 (Dashboard, Transaksi, Dompet, Kategori, & Laporan)** - Selesai
- **Fase 6: Pengaturan, Keamanan PIN PBKDF2, Backup/Restore Atomik, & Testing E2E** - Selesai
- **Fase 7: Integrasi Platform Android Capacitor, SQLite Repositories & Migrasi Data** - Selesai

## Ringkasan Proyek

Aplikasi pencatat keuangan pribadi multi-dompet (GoPay, ShopeePay, bank, tunai) berbasis SPA offline-first dengan Svelte 5 + SvelteKit adapter-static.

## Roadmap & Checklist Fase

- [x] **Fase 0: Inisialisasi Proyek & Tooling**
  - [x] SvelteKit + TypeScript konfigurasi SPA (`adapter-static`, `ssr=false`, fallback `index.html`)
  - [x] Tailwind CSS v4 (`@tailwindcss/vite`)
  - [x] Vitest untuk unit test
  - [x] Playwright untuk E2E test
  - [x] ESLint & Prettier
  - [x] Struktur folder `src/lib` sesuai arsitektur CLAUDE.md
  - [x] Dokumentasi keputusan (`docs/DECISIONS.md`) & progress (`docs/PROGRESS.md`)

- [x] **Fase 1: Domain Core & Logika Uang**
  - [x] Domain `types.ts` (entitas dasar, Wallet, Category, Transaction, Budget, RecurringRule, Attachment, Setting)
  - [x] Domain `money.ts` (integer Rupiah, `formatRupiah`, `parseRupiah` format Indonesia `Rp1.250.000` & `-Rp50.000`)
  - [x] Domain `balance.ts` (kalkulasi saldo dompet, transfer & fee, overdraft, saldo total)
  - [x] Domain `period.ts` (siklus tanggal gajian 1-31, bulan 28/29/30/31 hari, kabisat, lintas akhir tahun)
  - [x] TDD unit test Vitest lengkap untuk domain (angka negatif, transfer antar dompet, biaya admin, akhir tahun, dll.)

- [x] **Fase 2: Database Lokal & Repository (Dexie)**
  - [x] Skema database IndexedDB Dexie berversi (`src/lib/db/schema.ts`)
  - [x] Index wajib: `transactions.date` dan `transactions.[walletId+date]`
  - [x] Antarmuka repository & implementasi Dexie (`Wallet`, `Transaction`, `Category`, `Budget`)
  - [x] Service transaksi atomik (`addTransaction`, `updateTransaction`, `deleteTransaction`, `transfer`) dalam 1 transaksi DB
  - [x] Pembaruan cache saldo otomatis saat mutasi transaksi
  - [x] Fungsi sinkronisasi integritas saldo `rebuildBalances()`
  - [x] Pengujian database & service menggunakan `fake-indexeddb`

- [x] **Fase 3: Services Lanjutan & Validasi (Valibot)**
  - [x] Skema validasi Valibot di batas sistem (`src/lib/services/schemas.ts`)
  - [x] Presets kategori Indonesia hierarkis (`src/lib/domain/defaultCategories.ts`)
  - [x] Use-case `walletService` (get, create, update, archive, unarchive, soft delete, total balance)
  - [x] Use-case `categoryService` (get, hierarki subkategori, create, update, delete, init seeding)
  - [x] Use-case `onboardingService` (cek status & complete inisialisasi dompet + kategori)
  - [x] Unit test Vitest untuk services & validasi Valibot (`src/lib/services/services.test.ts`)

- [x] **Fase 4: Sistem UI Liquid Glass, Shell Aplikasi & Galeri Komponen**
  - [x] Analisis 25 screen mockup & spesifikasi desain Stitch
  - [x] Dokumentasi token konkret (`docs/design/tokens.md`) & pemetaan rute (`docs/design/INDEX.md`)
  - [x] Variabel CSS tema, dark mode turunan, fallback `backdrop-filter`, opsi kurangi transparansi, dan safe area di `src/app.css`
  - [x] Lokalisasi teks UI di `src/lib/i18n/id.json` & helper `src/lib/i18n/index.ts`
  - [x] Pustaka komponen Liquid Glass di `src/lib/components/glass/`:
    - [x] `GlassCard` (varian regular & opaque hampir opak)
    - [x] `GlassButton` (varian primary, secondary, danger, ghost)
    - [x] `GlassSheet` (pencegatan `history.pushState` agar back button menutup sheet lebih dulu)
    - [x] `GlassSegmented` (kontrol pill terpadu)
    - [x] `GlassListRow` (baris daftar dengan leading icon, title, subtitle, trailing, chevron)
    - [x] `GlassKeypad` (generik untuk nominal angka dan PIN keamanan)
    - [x] `GlassTabBar` (floating navigation bar dengan center FAB `+`)
    - [x] `QuickActionSheet` (speed dial 4 aksi finansial P0 tanpa AI OCR)
    - [x] `GlassEmptyState` (tampilan state kosong terpadu Liquid Glass)
    - [x] `WalletCard` (kartu dompet interaktif dengan dynamic gradient, specular sheen, & badge)
  - [x] Shell aplikasi di `src/routes/+layout.svelte` dengan ambient light orbs & floating tab bar
  - [x] Rute placeholder untuk seluruh 12 halaman P0
  - [x] Showcase pengembang `/dev/gallery` untuk memverifikasi seluruh komponen
  - [x] Pengujian Playwright E2E untuk verifikasi penutupan `GlassSheet` via tombol back

- [x] **Fase 5: Fitur Halaman & Alur Pengguna P0 (Dashboard, Transaksi, Dompet, Kategori, & Laporan)**
  - [x] Onboarding & setup dompet pertama (`/onboarding`)
  - [x] Manajemen Dompet & Ringkasan Total Saldo (`/wallets`, `/wallets/new`, `/wallets/[id]`, `/wallets/[id]/edit`)
  - [x] Penyesuaian Saldo Dompet ("Sesuaikan Saldo") di `/wallets/[id]` via modal `GlassSheet`, kalkulasi selisih realtime, mutasi otomatis income/expense dengan kategori sistem "Koreksi saldo" (terproteksi), dan verifikasi idempoten `rebuildBalances()`
  - [x] Pengaturan & Kelola Kategori (`/settings/categories` dengan bottom sheet tambah/edit)
  - [x] Tambah & riwayat transaksi (`/transactions`, `/transactions/new`, `/transactions/[id]`, `/transactions/[id]/edit` dan alias `/transaksi`) dengan pencarian teks (catatan & kategori), filter sheet multi-kriteria (`GlassSheet`: rentang tanggal, banyak dompet, banyak kategori, rentang nominal, tipe), query berindeks repository (`transactions.date` & `[walletId+date]`), tolak ukur benchmark 5.000 transaksi, dan chip filter aktif yang dapat dihapus individual
  - [x] Transfer antar dompet & fee (`/transfer`)
  - [x] Beranda / Dashboard (`/`) dengan kartu saldo aktif, toggle sembunyikan nominal, kartu arus kas periode aktif, carousel dompet, dan 5 transaksi terbaru
  - [x] Laporan Keuangan multi-tab (`/reports` dan alias `/laporan`):
    - [x] Tab Ringkasan (arus kas bersih, rasio tabungan, rata-rata harian, delta tren, dan grafik batang arus kas)
    - [x] Tab Kategori (DonutChart pengeluaran/pemasukan dengan segmen interaktif dan rincian persentase)
    - [x] Tab Dompet (aktivitas transaksi per akun, pergerakan dana masuk/keluar, audit transfer zero-sum, dan net change)
    - [x] Tab Tren (SplineAreaChart kurva akumulasi saldo berjalan dan beban harian)
    - [x] Navigasi siklus periode gajian melintasi bulan dinamis berdasarkan tanggal gajian pengguna
  - [x] Logika agregasi finansial sebagai fungsi murni tanpa dependensi di `src/lib/domain/aggregation.ts`
  - [x] Komponen visualisasi SVG zero-dependency Liquid Glass (`DonutChart`, `CashflowBarChart`, `SplineAreaChart`)
  - [x] Utilitas generator 1.000 transaksi acak (`seedData.ts`), service seeding atomik (`seedService.ts`), dan script benchmark (`pnpm seed` eksekusi <1ms, target <50ms)
  - [x] Pengujian otomatis lengkap: 67 unit test Vitest dan 11 test Playwright E2E (`transactions.e2e.ts`, `reports.e2e.ts`, `wallets.e2e.ts`, `gallery.e2e.ts`)

- [x] **Fase 6: Pengaturan, Keamanan PIN PBKDF2, Backup/Restore Atomik, & Testing E2E**
  - [x] Hub Pengaturan (`/settings`) dan redirect `/pengaturan` -> `/settings`
  - [x] Mata Uang & Format (`/settings/format`): standar IDR, format preview angka, dan siklus tanggal gajian (1-31)
  - [x] Backup & Data (`/settings/backup`): ekspor JSON berversi, pemulihan atomik ACID dengan validasi Valibot di memori, kalkulasi ulang saldo, penolakan file korup tanpa merusak data lama, dan ekspor CSV RFC 4180 dengan UTF-8 BOM
  - [x] Keamanan PIN Web Crypto PBKDF2 (`/settings/security`): derivasi SHA-256 100.000 iterasi, salt CSPRNG 16-byte, perbandingan waktu konstan `timingSafeEqual`, lockout 30 detik setelah 5 kegagalan, dan auto-lock saat background
  - [x] Overlay Kunci `PinLockScreen.svelte` di root layout dengan `GlassKeypad` mode PIN 6-digit, 6 dot indikator, animasi getar, dan pencegahan aksesibilitas `inert`
  - [x] Sensor Saldo Beranda (`hideBalance`): sinkronisasi reaktif di `uiStore` dan persisten di DB
  - [x] Tentang Aplikasi (`/settings/about`): metadata v0.0.1, komitmen offline-first, dan metrik tabel IndexedDB
  - [x] Pengujian komprehensif: 86 unit test Vitest dan 16 test Playwright E2E hijau 100%

- [x] **Fase 7: Integrasi Platform Android Capacitor, SQLite Repositories & Migrasi Data**
  - [x] Konfigurasi Capacitor 7 Android (`appId: com.yorlian.moneytracker`, `appName: Money Tracker`)
  - [x] Platform Abstraction Layer (`src/lib/platform/`) untuk Filesystem, Native Share, Hardware Back Button, Status Bar, Local Notifications, dan Biometrics
  - [x] Implementasi Repository SQLite Capacitor (`IWalletRepository`, `ITransactionRepository`, `ICategoryRepository`, `IBudgetRepository`, `ISettingRepository`)
  - [x] Service transaksi atomik SQLite & koordinasi saldo `rebuildBalances()`
  - [x] Skrip migrasi data cadangan JSON ke basis data SQLite (`migrateBackupJsonToSqlite`)
  - [x] Nol perubahan pada komponen UI (`src/lib/components/` & `src/routes/`)
  - [x] Verifikasi build Gradle `./gradlew assembleDebug` menghasilkan APK Android
  - [x] Dokumentasi komprehensif panduan build di `docs/BUILD_ANDROID.md` & ADR-013 di `docs/DECISIONS.md`

- [ ] **Fase 8: Fitur Lanjutan**
  - [x] Anggaran bulanan (`/budgets`, `/anggaran`, form sheet atur anggaran, domain budget, migrasi skema v2 Dexie, sinkronisasi widget Dashboard)
  - [x] Transaksi berulang (`/recurring`, `/transaksi-berulang`, domain recurring, eksekusi idempoten saat app open, mode autoPost, modal sheet, migrasi Dexie v3 & SQLite)
  - [x] Notifikasi lokal & pengingat (pusat notifikasi `/notifications` & alias `/notifikasi`, inbox lokal tabel `notifications`, penjadwalan ulang idempoten, pengaturan preferensi di `/settings/notifications`, dan badge lonceng di beranda)
  - [x] Ekspor laporan keuangan (CSV, Excel `.xlsx`, PDF) dengan pustaka ringan lazy-loaded (`write-excel-file`, `jspdf`, `jspdf-autotable`), modal sheet filter dompet di `/reports`, integrasi `@capacitor/share`, dan angka konsisten langsung dari fungsi domain Fase 5
  - [x] Audit komprehensif sistem (keamanan PIN di backup/restore, migrasi bertahap Dexie & SQLite DDL schema_version, uji beban saldo deterministik, ADR-020 & ADR-021)
  - [ ] Pipeline AI camera scan struk & ekstraksi OCR (generator fixture `/dev/ocr` selesai; menunggu data struk fisik asli)
