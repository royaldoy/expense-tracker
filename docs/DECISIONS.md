# Architecture Decision Records (ADR)

## ADR-001: Inisialisasi SvelteKit sebagai SPA Offline-First

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Aplikasi Money Tracker dirancang sebagai aplikasi offline-first yang akan dibungkus Capacitor menjadi APK Android. Tidak ada backend server untuk server-side rendering (SSR).
- **Keputusan:** Menggunakan SvelteKit dengan `@sveltejs/adapter-static` dikonfigurasi dalam mode SPA:
  - `adapter({ fallback: 'index.html' })` pada konfigurasi Vite/SvelteKit.
  - `ssr = false` dan `prerender = false` pada root `+layout.ts`.
- **Konsekuensi:** Seluruh perutean ditangani di sisi klien. Asset statis di-build ke direktori `build/` yang siap digunakan oleh web host statis maupun Capacitor.

## ADR-002: Konfigurasi Tailwind CSS v4 dengan Vite Plugin

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Membutuhkan styling cepat dan modern dengan sistem utility-first sesuai spesifikasi Svelte 5 dan panduan CLAUDE.md.
- **Keputusan:** Menggunakan Tailwind CSS v4 dengan plugin `@tailwindcss/vite` di `vite.config.ts` dan `@import "tailwindcss";` di `src/app.css`.
- **Konsekuensi:** Tidak memerlukan file `tailwind.config.js` terpisah; konfigurasi dan tema didefinisikan secara langsung di CSS modern.

## ADR-003: Setup Pengujian (Vitest & Playwright)

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Kualitas kode dan akurasi logika keuangan wajib diuji secara ketat sesuai CLAUDE.md (aturan data uang, unit test domain murni, dan E2E alur utama).
- **Keputusan:**
  - Vitest dikonfigurasi untuk pengujian unit dan logika domain (`pnpm test` menjalankan `vitest run`).
  - Playwright dikonfigurasi untuk pengujian E2E antarmuka (`pnpm test:e2e` menjalankan `playwright test`).
- **Konsekuensi:** Vitest berjalan cepat di lingkungan Node menggunakan konfigurasi Vite yang sama, sementara Playwright menguji skenario browser penuh.

## ADR-004: Penegakan Kualitas Kode (ESLint & Prettier)

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Standar kode konsisten, TypeScript strict tanpa `any`, dan formatting seragam.
- **Keputusan:** Menggunakan Flat Config ESLint (`eslint.config.js`) dengan plugin Svelte dan TypeScript-ESLint, dipadukan dengan Prettier (`prettier-plugin-svelte` dan `prettier-plugin-tailwindcss`). Script `pnpm lint` menjalankan pemeriksaan Prettier dan ESLint.
- **Konsekuensi:** Mencegah kesalahan sintaks dan menjaga konsistensi gaya kode sebelum commit.

## ADR-005: Desain Domain Murni (Pure TypeScript) dan Integritas Nominal Uang

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Menghindari floating-point rounding error dan memastikan lapisan domain decoupled dari framework (Svelte, Dexie, Capacitor).
- **Keputusan:**
  - Seluruh nilai moneter direpresentasikan sebagai integer Rupiah (tanpa desimal/sen).
  - Format baku Indonesia `Rp1.250.000` dan `-Rp50.000`.
  - Transfer direkam sebagai 1 entitas dengan atribut `toWalletId` dan `fee` (biaya admin dibebankan pada dompet asal).
  - Tidak ada impor library pihak ketiga pada modul `src/lib/domain/money.ts` dan `balance.ts`.
- **Konsekuensi:** Kalkulasi saldo deterministik dan mudah diuji secara modular dengan unit test Vitest.

## ADR-006: Skema IndexedDB Dexie Berversi & Index Gabungan

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Performa query riwayat transaksi harus tetap instan bahkan saat memuat ribuan record di perangkat Android offline.
- **Keputusan:**
  - Menggunakan Dexie v4 dengan versioning skema eksplisit.
  - Menetapkan compound index `[walletId+date]` dan index `date` pada tabel `transactions`.
  - Menerapkan soft-delete melalui field `deletedAt` di semua tabel.
- **Konsekuensi:** Memungkinkan filter rentang tanggal per dompet berjalan dengan binary search IndexedDB tanpa in-memory filtering yang lambat.

## ADR-007: Pembaruan Saldo Dompet Atomik dalam Transaksi Dexie & RebuildBalances

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Cache saldo pada `wallets.balance` rentan tidak sinkron bila mutasi transaksi gagal di tengah jalan atau aplikasi ditutup paksa.
- **Keputusan:**
  - Mutasi transaksi (`addTransaction`, `updateTransaction`, `deleteTransaction`, `transfer`) wajib dieksekusi di dalam transaksi DB read-write Dexie atomik: `db.transaction('rw', [db.wallets, db.transactions], ...)`.
  - Menyediakan mekanisme pemulihan `rebuildBalances()` yang menghitung ulang seluruh saldo dompet dari transaksi aktif dan memperbarui cache bila terjadi anomali data.
- **Konsekuensi:** Integritas saldo terjamin ACID di sisi klien.

## ADR-008: Sistem UI Liquid Glass, Pencegatan Tombol Back, dan Fallback Aksesibilitas

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Desain aplikasi mengusung gaya iOS Liquid Glass modern namun harus mematuhi karakteristik native Android (tombol back fisik/gesture) dan persyaratan aksesibilitas (kontras tinggi, performa tanpa GPU blur, safe-area).
- **Keputusan:**
  - Efek glass translusen hanya diterapkan pada lapisan navigasi (`GlassTabBar`, `QuickActionSheet`, `GlassSheet`, tombol); kartu konten transaksi dibuat hampir opak (opasitas 94%) untuk keterbacaan data finansial.
  - Komponen `GlassSheet` mencegat navigasi kembali via `window.history.pushState` dan listener `popstate`, memastikan tombol back menutup sheet sebelum meninggalkan halaman aktif.
  - Menyediakan CSS variables lengkap di `src/app.css` dengan fallback `@supports not (backdrop-filter: blur(1px))` dan opsi `data-reduce-transparency="true"` yang mengubah material menjadi warna solid opak.
  - Seluruh teks UI dilokalisasi melalui `src/lib/i18n/id.json`.
- **Konsekuensi:** Pengalaman pengguna terasa native di Android & web, aksesibilitas terjamin, dan tidak ada hardcoded string di antarmuka.

## ADR-009: Service-Oriented Architecture, Validasi Valibot, & Pengelolaan Dompet dan Kategori

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Komponen UI tidak boleh menyentuh database IndexedDB Dexie secara langsung (aturan arsitektur CLAUDE.md: UI -> stores -> services -> domain dan repository). Seluruh data input dari formulir harus divalidasi sebelum disimpan.
- **Keputusan:**
  - Membuat layer `src/lib/services/` (`walletService`, `categoryService`, `onboardingService`) sebagai satu-satunya perantara logika use-case antara rute UI dan repository database.
  - Menggunakan library `valibot` v1.5 untuk memvalidasi skema data (`WalletInputSchema`, `UpdateWalletInputSchema`, `CategoryInputSchema`, `UpdateCategoryInputSchema`) di batas sistem.
  - Mengimplementasikan rute `/onboarding` (setup dompet awal + seeding kategori standar), `/wallets` (daftar dompet + kartu hero total saldo gabungan), `/wallets/new` (pembuatan akun dengan live card preview), `/wallets/[id]` (detail dompet & riwayat transaksi), `/wallets/[id]/edit` (dialog konfirmasi arsip & hapus), dan `/settings/categories` (accordion subkategori + bottom sheet penambahan/pengubahan).
- **Konsekuensi:** Kode UI tetap tipis dan terisolasi dari penyimpanan data, validasi input konsisten, dan data keuangan terjaga integritasnya.

## ADR-010: Manajemen Transaksi, Transfer Antar Dompet, & Integritas Pelaporan Finansial

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Pencatatan transaksi harian (pengeluaran, pemasukan) dan pemindahan saldo (transfer) harus mematuhi aturan keuangan yang ketat: mutasi pokok transfer antar akun milik sendiri tidak boleh dilaporkan sebagai pengeluaran atau pemasukan pendapatan, sedangkan beban biaya admin transfer wajib dicatat sebagai pengeluaran. Seluruh perubahan saldo harus diverifikasi secara atomik dan diuji menggunakan Playwright E2E.
- **Keputusan:**
  - Menempatkan fungsi kalkulasi `calculateCashflow` di lapisan domain murni (`src/lib/domain/balance.ts`) dengan aturan: `income = sum(income.amount)`, `expense = sum(expense.amount) + sum(transfer.fee)`. Pokok transfer tidak menambah atau mengurangi pendapatan maupun beban.
  - Membangun `TransactionAppService` (`src/lib/services/transactionService.ts`) sebagai use-case layer yang membungkus transaksi DB atomik Dexie, validasi skema Valibot (`TransactionInputSchema`, `UpdateTransactionInputSchema`, `TransferInputSchema`), pengelompokan riwayat per tanggal, dan agregasi ringkasan arus kas.
  - Mengimplementasikan seluruh rute transaksi:
    - `/transactions` (dan alias `/transaksi`): daftar riwayat yang dikelompokkan berdasarkan tanggal, pencarian, dan laci filter bottom sheet (`GlassSheet`).
    - `/transactions/new` (dan alias `/transaksi/baru`): form pencatatan dengan keypad nominal Rupiah (`GlassKeypad`), pemilih dompet, pemilih kategori, dan tanggal.
    - `/transactions/[id]` (dan alias `/transaksi/[id]`): detail transaksi dan dialog konfirmasi soft-delete.
    - `/transactions/[id]/edit`: form pengeditan data transaksi dengan pemulihan nilai eksisting.
    - `/transfer`: pemindahan saldo antar dompet dengan keypad nominal, opsi biaya admin cepat (preset dan kustom), serta penukaran arah transfer satu tombol.
    - `/laporan`: ringkasan arus kas bersih, total pemasukan, dan total pengeluaran dinamis dari mutasi riil.
  - Menyusun pengujian Playwright E2E (`src/routes/transactions.e2e.ts`) yang memverifikasi: (1) penambahan pengeluaran menurunkan saldo dompet, (2) pengeditan nominal mempertahankan konsistensi saldo, (3) penghapusan transaksi memulihkan saldo secara utuh, dan (4) transfer memutasi kedua saldo dompet dengan tepat dan laporan keuangan hanya mencatat biaya admin sebagai beban.
- **Konsekuensi:** Integritas laporan keuangan 100% akurat tanpa ada distorsi dari pergerakan likuiditas internal, dan seluruh use-case transaksi terverifikasi hijau oleh suite pengujian otomatis.

## ADR-011: Agregasi Finansial Domain Murni, Visualisasi SVG Zero-Dependency, Siklus Tanggal Gajian, & Benchmark Seeding

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Perhitungan laporan keuangan (`/reports`) dan ringkasan dashboard (`/`) tidak boleh dijalankan di dalam komponen antarmuka Svelte (aturan arsitektur CLAUDE.md: tidak ada logika finansial di komponen). Periode laporan harus dinamis mengikuti pengaturan tanggal gajian (`startDay` 1-31). Visualisasi data memerlukan chart yang ringan, responsif, selaras dengan tema iOS Liquid Glass, tanpa menambah dependensi berat pihak ketiga (seperti Chart.js atau D3). Selain itu, sistem memerlukan pembuktian performa pengolahan data volume tinggi (1.000 transaksi acak) agar tetap instan (<50ms).
- **Keputusan:**
  - Mengisolasi seluruh kalkulasi finansial di `src/lib/domain/aggregation.ts` sebagai fungsi TypeScript murni:
    - `filterTransactionsByPeriod`: Pemfilteran rentang tanggal inklusif dan opsional per dompet.
    - `aggregateSummary`: Menghitung pendapatan, beban, arus kas bersih, tabungan (`savingsRate`), dan rata-rata pengeluaran harian dengan penegasan netralitas transfer.
    - `aggregateCategoryBreakdown`: Pengelompokan persentase per kategori secara descending.
    - `aggregateWalletBreakdown`: Audit aktivitas per dompet memastikan zero-sum transfer antar akun internal.
    - `generateDailyCashflowSeries`: Pembuatan deret tanggal harian berurutan tanpa jeda/gap hari kosong.
    - `calculateTrendDelta`: Komparasi persentase dan selisih absolut terhadap periode sebelumnya.
    - `getPreviousPeriod` & `getNextPeriod`: Navigasi siklus periode gajian melintasi bulan dan pergantian tahun.
  - Membangun chart SVG kustom zero-dependency di `src/lib/components/charts/`:
    - `DonutChart.svelte`: Diagram lingkaran proporsional menggunakan `stroke-dasharray` & `stroke-dashoffset` dengan interaktivitas segmen dan statistik di lubang tengah.
    - `CashflowBarChart.svelte`: Grafik batang ganda pemasukan vs pengeluaran per hari dengan rounded cap (`rx="2"`), gridline, dan tooltip interaktif.
    - `SplineAreaChart.svelte`: Kurva interpolasi Catmull-Rom/Bezier kubik dengan gradient fill Liquid Glass translusen untuk pergerakan akumulasi saldo dan tren beban harian.
  - Mengimplementasikan `settingRepository` dan `settingService` untuk persistensi pengaturan tanggal gajian pengguna pada tabel `settings` Dexie.
  - Mengembangkan antarmuka Dashboard (`/`) dengan kartu total saldo aktif, toggle sembunyikan nominal, kartu arus kas periode gajian berjalan, carousel dompet, dan 5 mutasi terkini.
  - Mengembangkan antarmuka Laporan (`/reports` dan alias `/laporan`) dengan navigasi 4 tab modular: **Ringkasan**, **Kategori**, **Dompet**, dan **Tren**.
  - Menyediakan generator data 1.000 transaksi acak (`src/lib/domain/seedData.ts`) dan service seeding atomik (`src/lib/services/seedService.ts`) serta script CLI benchmark (`scripts/seed.ts` via `pnpm seed`).
- **Konsekuensi:** Agregasi in-memory untuk 1.000 transaksi tuntas dalam ~0.86ms (jauh di bawah batas target 50ms). Tidak ada penambahan dependensi pihak ketiga, ukuran bundle produksi tetap sangat ringkas, dan semua uji coba (67 unit test Vitest dan 11 test Playwright E2E) lulus 100%.

## ADR-012: Keamanan PIN Web Crypto PBKDF2, Cadangan Atomik Berversi Valibot, & Pengaturan Sistem

- **Status:** Diterima
- **Tanggal:** 2026-10-12
- **Konteks:** Sesuai spesifikasi Fase 6, aplikasi memerlukan rute pengaturan lengkap (`/settings`) beserta 4 sub-halaman intinya. Persyaratan ketat meliputi:
  1. Keamanan PIN 6-digit tidak boleh menyimpan teks polos, harus tahan serangan side-channel timing attack, dan memiliki mitigasi brute-force (lockout).
  2. Cadangan data harus berversi (envelope format) dengan validasi skema ketat menggunakan Valibot v1.5 di memori sebelum menyentuh IndexedDB, serta menjamin _zero-data-loss rollback_ (berkas rusak tidak boleh merusak data lama). Saldo dompet harus dihitung ulang secara konsisten dari riwayat transaksi sebelum disimpan.
  3. Ekspor CSV harus kompatibel dengan Microsoft Excel dan spreadsheet internasional tanpa masalah encoding karakter Indonesia (standar RFC 4180 dan UTF-8 BOM).
  4. Pengaturan tanggal gajian harus terintegrasi langsung dengan kalkulasi periode laporan bulanan, dan privasi saldo (`hideBalance`) harus tersinkronisasi secara reaktif di seluruh aplikasi.
- **Keputusan:**
  - **Keamanan Kriptografi Native (`src/lib/services/pinSecurityService.ts`)**:
    - Menggunakan Web Crypto API native (`crypto.subtle.deriveBits`) dengan PBKDF2 (SHA-256, 100.000 iterasi, 16-byte random salt CSPRNG).
    - Perbandingan hash menggunakan fungsi `timingSafeEqual` waktu konstan untuk mencegah side-channel timing leaks.
    - Mitigasi brute-force: lockout otomatis 30 detik setelah 5 kali kesalahan berturut-turut.
    - Komponen `PinLockScreen.svelte` di root `+layout.svelte` menggunakan `GlassKeypad` mode PIN 6-digit, 6 dot indikator dengan animasi getar, dan atribut aksesibilitas `inert` pada konten utama aplikasi saat terkunci.
    - Kunci otomatis saat aplikasi berada di latar belakang (`visibilitychange`) dengan timeout yang dapat dikonfigurasi.
  - **Sistem Cadangan & Pemulihan Atomik (`src/lib/services/backupService.ts`)**:
    - Format envelope JSON: `{ meta: { version: 1, appName: "Money Tracker", appVersion: "0.0.1", exportedAt: "..." }, data: { wallets, categories, transactions, budgets, settings } }`.
    - Pipeline pemulihan memvalidasi struktur via Valibot v1.5 (`BackupEnvelopeSchema`) dan migrasi versi lama (`migrateBackupData`) seluruhnya di memori.
    - Integritas cache saldo dompet dipulihkan melalui fungsi domain murni `calculateWalletBalances(wallets, transactions)` sebelum penulisan database.
    - Eksekusi database menggunakan transaksi ACID Dexie tunggal `db.transaction('rw', [wallets, categories, transactions, budgets, settings], ...)`. Jika validasi atau berkas gagal, database lama 100% utuh tanpa perubahan.
    - Ekspor CSV transaksi RFC 4180 diawali dengan UTF-8 BOM (`﻿`), escaping tanda kutip ganda (`""`), dan resolusi nama entitas dompet serta kategori.
  - **Sub-Halaman Pengaturan (`/settings`)**:
    - `/settings` (Hub Pengaturan) dan redirect otomatis `/pengaturan` -> `/settings`.
    - `/settings/format` (Mata Uang & Format): Standar Rupiah (IDR), pratinjau langsung angka positif/negatif/fee/nol, dan konfigurasi tanggal gajian (1-31) dengan preset cepat.
    - `/settings/backup` (Cadangan & Data): Ekspor JSON, pemulihan berkas, unduh CSV, dan zona bahaya hapus semua data dengan modal konfirmasi ganda (`GlassSheet`).
    - `/settings/security` (Keamanan & Privasi): Manajemen PIN, auto-lock timeout, dan toggle sensor saldo beranda (`hideBalance`).
    - `/settings/about` (Tentang): Metadata aplikasi, komitmen 100% offline-first dan tanpa pelacak, serta statistik kapasitas IndexedDB.
- **Konsekuensi:** Seluruh 86 unit test Vitest dan 16 Playwright E2E test lulus 100%. Data pengguna terlindungi secara kriptografis tanpa ketergantungan pada backend eksternal, dan integritas basis data dijamin oleh transaksi atomik lokal.

## ADR-013: Arsitektur Platform Capacitor 7, SQLite Repository Decoupling, Migrasi Data Backup JSON, & Build Native Android

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Sesuai spesifikasi Fase 7:
  1. Aplikasi SvelteKit SPA offline-first perlu dibungkus menjadi APK Android native menggunakan Capacitor 7 dengan Application ID `com.yorlian.moneytracker` dan nama `Money Tracker`.
  2. Lapisan database membutuhkan implementasi repository berbasis SQLite native (`@capacitor-community/sqlite`) yang memenuhi interface kontrak `IWalletRepository`, `ITransactionRepository`, `ICategoryRepository`, `IBudgetRepository`, dan `ISettingRepository` tanpa mengubah kode pada lapisan UI (`src/lib/components/` dan `src/routes/`).
  3. Membutuhkan modul dan skrip CLI untuk memigrasikan berkas cadangan JSON berversi ke SQLite dengan validasi Valibot di memori dan rekalkulasi saldo otomatis.
  4. Memerlukan Platform Abstraction Layer terpadu di `src/lib/platform/` yang mengabstraksikan kapabilitas native (Filesystem, Share, Back Button, Status Bar, Local Notifications, dan Biometric Authentication) dengan fallback aman di lingkungan web browser.
  5. Memastikan `./gradlew assembleDebug` berhasil menghasilkan file APK debug Android (`app-debug.apk`) dan menyusun dokumentasi di `docs/BUILD_ANDROID.md`.
- **Keputusan:**
  - **Inisialisasi & Konfigurasi Capacitor 7**:
    - Konfigurasi `capacitor.config.ts` dengan App ID `com.yorlian.moneytracker`, App Name `Money Tracker`, `webDir: 'build'`, skema HTTPS, dan registrasi konfigurasi plugin SQLite & notifikasi lokal.
    - Izin native di `AndroidManifest.xml`: `VIBRATE`, `USE_BIOMETRIC`, `POST_NOTIFICATIONS`, dan `INTERNET`.
  - **Platform Abstraction Layer (`src/lib/platform/`)**:
    - Kontrak terpadu di `types.ts` (`IFilesystemAdapter`, `IShareAdapter`, `IBackButtonAdapter`, `IStatusBarAdapter`, `INotificationsAdapter`, `IBiometricsAdapter`, `IPlatform`).
    - Implementasi web fallback di `web.ts` (Blob download/Memory Map, Web Share/Clipboard, Popstate, Web Notifications, Web Biometrics dummy).
    - Implementasi native Capacitor di `capacitor.ts` memanfaatkan plugin resmi (`@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/local-notifications`, `@capgo/capacitor-native-biometric`).
    - Singleton selector di `index.ts`: memilih runtime otomatis melalui `Capacitor.isNativePlatform()`.
  - **Abstraksi Driver & Implementasi SQLite Repository (`src/lib/db/`)**:
    - Antarmuka `ISqliteDriver` dan implementasi `CapacitorSqliteDriver` untuk runtime native serta `InMemorySqliteDriver` untuk pengujian Vitest dan pengembangan web tanpa perangkat fisik.
    - DDL SQLite terindeks di `schema.ts` yang mematuhi aturan keuangan: integer Rupiah, timestamp integer, dan foreign keys.
    - Implementasi 5 repositori SQLite di `src/lib/db/repositories/sqlite/`: `SqliteWalletRepository`, `SqliteCategoryRepository`, `SqliteTransactionRepository`, `SqliteBudgetRepository`, dan `SqliteSettingRepository`.
    - Koordinator transaksi atomik di `SqliteTransactionService`: menjalankan penambahan transaksi, transfer dana, pembaruan saldo, dan `rebuildBalances()` dalam satu transaksi ACID SQLite.
  - **Engine Migrasi Backup JSON ke SQLite (`src/lib/db/sqlite/migration.ts` & CLI)**:
    - Parsing dan validasi skema Valibot di memori via `BackupEnvelopeSchema`.
    - Pengecekan integritas referensial dan rekalkulasi saldo dompet via fungsi domain murni `calculateWalletBalances`.
    - Eksekusi batch INSERT atomik dalam transaksi SQLite tunggal dengan rollback otomatis jika terjadi kegagalan.
    - Skrip CLI mandiri di `scripts/migrate-backup-to-sqlite.ts`.
  - **Batasan UI & Kompatibilitas**:
    - Nol modifikasi pada komponen UI di `src/lib/components/` dan `src/routes/`.
- **Konsekuensi:**
  - Seluruh 105 pengujian Vitest lulus 100% (termasuk unit test platform, SQLite repositori, SQLite transaction service, dan migrasi).
  - Skrip Gradle `./gradlew assembleDebug` dapat mengompilasi APK debug secara mandiri.

## ADR-014: Penyesuaian Saldo Dompet Tanpa Menimpa Balance Langsung & Proteksi Kategori Sistem

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan fitur "Sesuaikan Saldo" pada halaman detail dompet (`/wallets/[id]`), sesuai referensi aksi di `docs/design/screens/detail_dompet_gopay_utama`.
  Aturan finansial ketat aplikasi:
  1. Saldo dompet tidak boleh ditimpa langsung pada `wallets.balance`, karena `rebuildBalances()` akan menghapus atau mendistorsi selisih tersebut jika tidak didukung oleh riwayat transaksi.
  2. Selisih saldo harus dicatat sebagai transaksi nyata berjenis `income` (bila target > saldo tercatat) atau `expense` (bila target < saldo tercatat).
  3. Transaksi koreksi harus dikaitkan ke kategori sistem "Koreksi saldo" (`isSystem: true`) yang tidak dapat dihapus oleh pengguna dari antarmuka manajemen kategori.
  4. Antarmuka wajib menampilkan pratinjau realtime nominal selisih (+ / -) dan jenis mutasi sebelum disimpan. Jika selisih nol, transaksi tidak dibuat (no-op).
- **Keputusan:**
  - **Lapisan Domain Murni (`src/lib/domain/adjustment.ts`)**:
    - Membuat fungsi murni `calculateBalanceAdjustment(currentBalance, targetBalance)` yang mengembalikan `{ diff, type: 'income' | 'expense' | null, amount }`.
    - Menolak target saldo negatif dan membulatkan angka ke integer Rupiah.
    - Menulis unit test TDD lebih dulu di `src/lib/domain/adjustment.test.ts`.
  - **Proteksi Kategori Sistem (`src/lib/services/categoryService.ts`)**:
    - Menambahkan `isSystem?: boolean` pada antarmuka `Category`.
    - Menyediakan `getOrCreateSystemAdjustmentCategory(kind)` yang membuat kategori sistem `Koreksi saldo` secara idempoten jika belum tersedia.
    - Memblokir penghapusan pada `categoryService.deleteCategory` bila `category.isSystem === true`.
    - Menampilkan badge "Sistem" pada UI `/settings/categories` dan menyembunyikan tombol hapus untuk kategori sistem.
  - **Lapisan Service (`src/lib/services/walletService.ts`)**:
    - Membuat use case `adjustBalance({ walletId, targetBalance, note, date })` dengan validasi Valibot `AdjustBalanceInputSchema`.
    - Mengintegrasikan kalkulasi penyesuaian dengan `transactionService.addTransaction` sehingga mutasi transaksi dan pembaruan cache saldo dompet dieksekusi secara atomik dalam satu transaksi database.
  - **Komponen UI (`src/routes/wallets/[id]/+page.svelte`)**:
    - Menambahkan tombol aksi kapsul "Sesuaikan" berikon `tune` di samping tombol Transfer dan Catat Transaksi.
    - Membuka bottom sheet `GlassSheet` modal form yang memuat ringkasan saldo saat ini, input saldo sebenarnya, live preview selisih realtime (+ / -), dan input catatan opsional.
  - **Pengujian E2E Playwright (`src/routes/wallets.e2e.ts`)**:
    - Menguji alur penyesuaian saldo dari input form, verifikasi pembaruan saldo di kartu dompet, verifikasi catatan transaksi di riwayat, dan verifikasi idempoten `rebuildBalances()`.
- **Konsekuensi:**
  - Saldo dompet selalu 100% konsisten dengan riwayat transaksi dan tidak pernah rusak saat `rebuildBalances()` dijalankan.
  - Semua 113 unit test Vitest dan 17 test Playwright E2E lulus 100%.

## ADR-015: Fitur Anggaran Bulanan per Kategori (/budgets), Migrasi Skema Dexie, dan Integrasi Dashboard

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan pengelolaan anggaran bulanan per kategori di rute `/budgets` (dan alias `/anggaran`) dengan modal sheet formulir atur anggaran (`GlassSheet`), merujuk desain Stitch `daftar_anggaran_liquid_glass_finance` dan `atur_anggaran_baru_liquid_glass_finance`.
  Aturan penting:
  1. Kalkulasi murni berada di `src/lib/domain/budget.ts` (`terpakai`, `sisa`, `persentase`, dan status `aman` | `waspada` | `lewat`).
  2. Siklus periode anggaran mengikuti pengaturan tanggal gajian (`salaryDay`) pengguna, termasuk siklus melintasi akhir tahun (Desember ke Januari).
  3. Transaksi: Pokok `transfer` tidak dihitung sebagai pengeluaran anggaran; biaya admin transfer (`fee`) dihitung jika kategorinya cocok.
  4. Migrasi skema database Dexie untuk tabel `budgets` ke versi 2 dengan pengujian migrasi.
  5. Ringkasan anggaran di Beranda/Dashboard (`/`) wajib menggunakan fungsi domain yang sama (`calculateOverallBudget`), dilarang menghitung ulang di komponen.
- **Keputusan:**
  - **Lapisan Domain Murni (`src/lib/domain/budget.ts`)**:
    - Membuat fungsi murni `calculateBudgetUsage` dan `calculateOverallBudget`.
    - Integer Rupiah tanpa floating-point, status `lewat` jika terpakai > limit, status `waspada` jika persentase >= `alertAt` (termasuk batas tepat di ambang batas).
    - Unit test TDD lebih dulu di `src/lib/domain/budget.test.ts` (12 skenario pengujian komprehensif).
  - **Migrasi Skema Database (`src/lib/db/schema.ts` & `src/lib/db/schema.test.ts`)**:
    - Skema Dexie versi 1 sebagai basis data inti dan versi 2 menambahkan tabel `budgets` dengan compound index `[categoryId+period]`.
    - Unit test `schema.test.ts` memverifikasi upgrade versi 1 ke versi 2 tanpa merusak data lama.
  - **Lapisan Service & Validasi Valibot (`src/lib/services/budgetService.ts` & `schemas.ts`)**:
    - Skema validasi `BudgetInputSchema` dan `UpdateBudgetInputSchema`.
    - Use case `setBudget` (upsert berdasarkan kategori dan periode), `getBudgetReport`, dan soft delete.
  - **Antarmuka Liquid Glass & Integrasi**:
    - Halaman `/budgets` dengan navigasi bulan siklus gajian, hero card total anggaran dengan liquid progress bar glow, daftar kartu anggaran per kategori, dan modal form `GlassSheet` atur anggaran.
    - Seksi widget "Anggaran Periode Ini" di Dashboard (`/`) menggunakan fungsi domain `calculateOverallBudget`.
    - Tautan "Anggaran Bulanan" di Pengaturan (`/settings`).
  - **Pengujian E2E Playwright (`src/routes/budgets.e2e.ts`)**:
    - Memverifikasi setup anggaran kategori, pencatatan transaksi yang mengubah status keterpakaian ke "Waspada", sinkronisasi ringkasan di dashboard, dan pengubahan limit anggaran.
- **Konsekuensi:**
  - Perhitungan anggaran konsisten di seluruh aplikasi (Dashboard dan Halaman Anggaran).
  - Seluruh 131 unit test Vitest dan 18 test Playwright E2E lulus 100%.

## ADR-016: Fitur Transaksi Berulang (/recurring), Eksekusi Idempoten Tanpa Background Job, dan Mode autoPost

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan fitur transaksi berulang (recurring transactions) pada rute `/recurring` (dan alias `/transaksi-berulang`) serta modal sheet form (`GlassSheet`), merujuk desain Stitch `transaksi_berulang_liquid_glass_finance`.
  Aturan penting:
  1. Logika di `src/lib/domain/recurring.ts`: menghitung `nextRunAt` untuk frekuensi `daily`, `weekly`, `monthly`, dan `yearly`.
  2. Penanganan akhir bulan: tanggal 29–31 jatuh ke hari terakhir pada bulan pendek (28/29 Feb, 30 Apr/Jun/Sep/Nov) dan mempertahankan tanggal basis pada bulan panjang.
  3. Penanganan tahun kabisat: 29 Februari jatuh ke 28 Februari pada tahun non-kabisat dan kembali ke 29 Februari pada tahun kabisat berikutnya.
  4. Eksekusi jatuh tempo: saat aplikasi dibuka (`onMount` di `+layout.svelte`) via `recurringService.runDueRecurring()` tanpa mengandalkan background job OS.
  5. Menangkap seluruh jadwal yang terlewat (catch-up multi-bulan) dan wajib 100% IDEMPOTEN (membuka aplikasi dua kali atau berulang kali tidak menduplikasi transaksi).
  6. Mode `autoPost`: `true` langsung mencatat transaksi dan memotong saldo, `false` ditandai sebagai `pendingRules` untuk konfirmasi manual pengguna ("Catat Sekarang" / "Lewati").
  7. Menambahkan tabel `recurringRules` di SQLite DDL dan migrasi skema Dexie versi 3 dengan index compound `[recurringId+date]` pada transaksi.
- **Keputusan:**
  - **Lapisan Domain Murni (`src/lib/domain/recurring.ts`)**:
    - Membuat fungsi murni `calculateNextRunAt`, `getDueDates`, dan `advanceNextRunAt`.
    - Unit test TDD di `src/lib/domain/recurring.test.ts` (12 skenario pengujian: akhir bulan, kabisat, terlewat beberapa bulan).
  - **Migrasi Skema Database (`src/lib/db/schema.ts`, `schema.test.ts`, `sqlite/schema.ts`)**:
    - Skema Dexie versi 3 menambahkan compound index `[recurringId+date]` pada tabel `transactions` dan index `frequency` pada `recurringRules`.
    - Skema SQLite menambahkan tabel `recurring_rules` dan index `idx_transactions_recurringId`.
  - **Lapisan Repositori & Cadangan (`src/lib/db/repositories/` & `backupService.ts`)**:
    - Menambahkan `IRecurringRuleRepository` dengan implementasi `DexieRecurringRuleRepository` dan `SqliteRecurringRuleRepository`.
    - Menambahkan `RecurringRuleBackupSchema` serta mendukung ekspor dan impor cadangan JSON berversi.
  - **Lapisan Service (`src/lib/services/recurringService.ts` & `schemas.ts`)**:
    - Skema validasi Valibot `RecurringRuleInputSchema` dan `UpdateRecurringRuleInputSchema`.
    - Use case `runDueRecurring(asOfDate)` yang memeriksa keberadaan transaksi berdasarkan pasangan unik `(recurringId, date)` sebelum mencatat transaksi baru (menjamin idempotensi mutlak).
    - Use case `confirmPendingRecurring` dan `skipPendingRecurring` untuk penanganan `autoPost: false`.
  - **Eksekusi Lifecycle Aplikasi (`src/routes/+layout.svelte`)**:
    - Memanggil `recurringService.runDueRecurring()` secara non-blocking di latar belakang saat aplikasi dimuat.
  - **Antarmuka Pengguna Liquid Glass**:
    - Halaman `/recurring` dengan Segmented Control Pengeluaran/Pemasukan, hero card total komitmen bulanan, seksi tagihan jatuh tempo / perlu konfirmasi, daftar aturan berulang dengan switch `autoPost`, tombol edit, dan dialog hapus.
    - Modal bottom sheet formulir jadwal berulang dengan quick add nominal dan pemilihan frekuensi.
    - Tautan navigasi "Transaksi Berulang" di Pengaturan (`/settings`).
  - **Pengujian E2E Playwright (`src/routes/recurring.e2e.ts`)**:
    - Menguji pembuatan jadwal berulang, toggle switch `autoPost`, eksekusi jadwal hari ini, dan reload aplikasi berulang kali memverifikasi transaksi tidak pernah terduplikasi.
- **Konsekuensi:**
  - Seluruh 148 unit test Vitest dan 19 test Playwright E2E lulus 100% tanpa regresi.

## ADR-017: Pusat Notifikasi (/notifications), Pengaturan Notifikasi, dan Penjadwalan Ulang Notifikasi Lokal Idempoten

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan pusat notifikasi luring (`/notifications` dan alias `/notifikasi`) serta pengaturan preferensi notifikasi (`/settings/notifications`) merujuk desain Stitch `notifikasi_liquid_glass_finance`.
  Aturan penting:
  1. Tabel `notifications` sebagai inbox lokal: jenis (`type`), judul (`title`), isi (`message`), `readAt`, `refId`.
  2. Sumber notifikasi: tagihan berulang jatuh tempo (`recurring_due`), anggaran melewati `alertAt` (`budget_alert`), dan pengingat catat harian (`daily_reminder`).
  3. Kirim notifikasi fisik lewat interface platform (`platform.notifications` dari Fase 7) dan jadwalkan ulang setiap aplikasi dibuka atau pengaturan berubah.
  4. Badge jumlah belum dibaca di ikon lonceng pada top bar Beranda (`/`).
  5. Di web, hanya inbox yang berfungsi secara aman tanpa runtime exception saat izin notifikasi tidak tersedia.
  6. Service pembuat notifikasi (`notificationService.syncNotifications`) wajib 100% idempoten dan tidak menduplikasi notifikasi untuk kejadian yang sama.
- **Keputusan:**
  - **Lapisan Domain & Tipe (`src/lib/domain/types.ts`)**:
    - Menambahkan tipe `NotificationType`, entitas `Notification`, dan `NotificationSettings`.
  - **Migrasi Skema Database (`src/lib/db/schema.ts`, `schema.test.ts`, `sqlite/schema.ts`)**:
    - Dexie versi 4 menambahkan tabel `notifications` dengan index compound `[type+refId]`.
    - Skema SQLite menambahkan tabel `notifications` dan index pencarian.
    - Repositori `INotificationRepository` dengan implementasi `DexieNotificationRepository` dan `SqliteNotificationRepository`.
    - Pembaruan `backupService.ts` untuk menyertakan `notifications` dalam cadangan berversi JSON dan restore ACID.
  - **Lapisan Service & Logika Idempoten (`src/lib/services/notificationService.ts`)**:
    - Skema validasi Valibot `NotificationSettingsSchema` dan `UpdateNotificationSettingsSchema`.
    - Pembangkitan berbasis refId deterministik (`${rule.id}_${dueDate}` untuk tagihan, `${budget.id}_${period}` untuk anggaran, `daily_${date}` untuk pengingat harian) sehingga pemanggilan sinkronisasi berulang kali tidak pernah menduplikasi notifikasi di inbox.
    - Penjadwalan ulang notifikasi lokal platform via `platform.notifications.schedule()` dengan penanganan safe fallback di lingkungan web browser.
  - **Reaktif Store & Lifecycle (`src/lib/stores/notificationStore.ts` & `src/routes/+layout.svelte`)**:
    - Store `unreadNotificationsCount` untuk badge realtime.
    - Pemanggilan `notificationService.syncNotifications()` pada `onMount` layout.
  - **Antarmuka Pengguna Liquid Glass**:
    - Top bar Beranda (`src/routes/+page.svelte`) dengan tombol lonceng dan badge titik animasi ping saat ada notifikasi belum dibaca.
    - Halaman `/notifications` dengan filter chip (Semua / Belum Dibaca), aksi "Tandai Semua Dibaca", feed terkelompok ("Hari Ini" & "Sebelumnya"), kartu dengan aksi kontekstual langsung, dan empty state.
    - Halaman `/settings/notifications` dengan switch toggle preferensi dan input jam pengingat harian.
    - Tautan navigasi di Pengaturan (`/settings`).
  - **Pengujian Lengkap**:
    - 6 unit test service di `notificationService.test.ts` (CRUD, deduplikasi berulang, penonaktifan sumber, web safety).
    - Playwright E2E test di `notifications.e2e.ts` memverifikasi navigasi alias, pengaturan, kemunculan badge lonceng, dan aksi tandai dibaca.
- **Konsekuensi:**
  - 154 unit test Vitest dan 20 Playwright E2E test lulus 100% hijau.

## ADR-018: Pencarian Teks & Filter Sheet Multi-Kriteria Berindeks pada /transactions

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan pencarian teks komprehensif (catatan dan nama kategori) serta filter sheet multi-kriteria (`GlassSheet`) pada rute `/transactions`, merujuk desain Stitch `transaksi_liquid_glass_finance`.
  Aturan penting:
  1. Filter mencakup: rentang tanggal, banyak dompet sekaligus, banyak kategori sekaligus, rentang nominal (min-max Rupiah), dan tipe transaksi.
  2. Query wajib lewat repository menggunakan index yang ada (`transactions.date` dan `[walletId+date]`); tidak boleh difilter di komponen.
  3. Filter aktif tampil sebagai chip individual di bar filter yang dapat dihapus satu per satu dengan tombol silang `x`, dan tombol "Hapus Semua" jika > 1 filter.
  4. Pengukuran tolak ukur performa pada 5.000 transaksi acak dan pelaporan durasi eksekusinya.
- **Keputusan:**
  - **Lapisan Repositori (`src/lib/db/repositories/`)**:
    - Menambahkan tipe `TransactionFilterOptions` dan metode `queryTransactions(filter)` pada `ITransactionRepository`.
    - Implementasi Dexie (`DexieTransactionRepository`) memanfaatkan index `date`, compound index `[walletId+date]`, serta multi-key index `anyOf` pada `categoryId` dan `type` untuk menghindari full table scan.
    - Resolusi teks nama kategori mencari ID kategori yang cocok via `categoryRepository` lalu mencocokkan `tx.note` atau `tx.categoryId`.
    - Implementasi SQLite (`SqliteTransactionRepository`) menggunakan parameterized dynamic SQL dengan `LEFT JOIN categories` dan klausa `WHERE` terindeks.
  - **Lapisan Service (`src/lib/services/transactionService.ts`)**:
    - `getTransactions(filter)` mendelegasikan query langsung ke `transactionRepo.queryTransactions(filter)` lalu menghidrasi entitas relasi.
    - `getTransactionsGroupedByDate(filter)` mengelompokkan hasil query dan menghitung total pengeluaran dan pemasukan per tanggal.
  - **Antarmuka Pengguna Liquid Glass (`src/routes/transactions/+page.svelte`)**:
    - Search bar teks responsif yang mencari catatan dan kategori secara langsung.
    - Modal filter sheet `GlassSheet` dengan pemilih multi-dompet, multi-kategori, rentang tanggal (dengan preset "Bulan Ini", "30 Hari", "Semua"), rentang nominal Rupiah, serta tombol reset dan terapkan.
    - Bar chip filter aktif yang menampilkan filter aktif dan tombol hapus silang individual per chip serta tombol "Hapus Semua".
    - Kamus lokalisasi teks di `src/lib/i18n/id.json`.
  - **Pengujian & Benchmark**:
    - Unit test `transactionRepository.test.ts` memvalidasi seluruh kombinasi filter query berindeks.
    - Benchmark 5.000 transaksi di `transactionQuery.bench.test.ts` melaporkan durasi eksekusi query (rentang tanggal: ~10-23 ms, [walletId+date]: ~3-6 ms, filter kombinasi penuh: ~3-14 ms).
    - Playwright E2E test di `transactions.e2e.ts` memvalidasi alur pencarian teks, pembukaan filter sheet multi-kriteria, penampilan chip aktif, dan penghapusan chip satu per satu.
- **Konsekuensi:**
  - Seluruh 164 unit test Vitest dan 21 test Playwright E2E lulus 100% hijau.

## ADR-019: Ekspor Laporan Keuangan (CSV, Excel .xlsx, PDF), Pustaka Ringan Lazy-Loaded, dan Berbagi via Capacitor Share

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna memerlukan fitur ekspor laporan keuangan dari halaman `/reports` ke dalam format CSV, Excel (`.xlsx`), dan PDF untuk periode dan filter yang dipilih, dibagikan lewat `@capacitor/share`.
  Aturan penting:
  1. Isi ekspor mencakup: ringkasan periode, rincian per kategori, dan daftar transaksi.
  2. Angka wajib diambil langsung dari fungsi domain laporan Fase 5 (`aggregateSummary`, `aggregateCategoryBreakdown`, `filterTransactionsByPeriod`), bukan dihitung ulang secara manual.
  3. Menggunakan pustaka ringan yang di-lazy-load secara dinamis (`import(...)`) saat pengguna memilih format terkait.
  4. Pengujian: jumlah angka di file sama persis dengan jumlah di layar untuk data seed.
- **Keputusan:**
  - **Pemilihan Pustaka Ringan**:
    - **CSV**: Zero dependency (pure TypeScript RFC 4180 escaping dengan awalan UTF-8 BOM `﻿`).
    - **Excel (`.xlsx`)**: Menggunakan `write-excel-file/universal` (~35 KB gzip, zero external dependencies, modern TypeScript-first, multi-sheet workbook, format angka mata uang). Menolak `exceljs` (~1.5 MB) dan `xlsx` (SheetJS karena masalah lisensi dan riwayat kerentanan keamanan).
    - **PDF**: Menggunakan `jspdf` (~80 KB gzip) dan `jspdf-autotable` (~15 KB gzip) untuk multi-page table, repeating header, margin, dan pagination otomatis ("Halaman X dari Y"). Menolak `pdfmake` (~2 MB dengan font VFS) dan `pdf-lib` (tanpa auto table layout).
  - **Lapisan Service (`src/lib/services/reportExportService.ts`)**:
    - `prepareReportExportContent(data)`: Mempersiapkan data menggunakan fungsi domain murni Fase 5 di `aggregation.ts` (`aggregateSummary`, `aggregateCategoryBreakdown`, `filterTransactionsByPeriod`).
    - `generateReportCsv(data)`: Menghasilkan teks CSV ber-BOM dengan 4 seksi (Metadata, Ringkasan Arus Kas, Rincian Kategori Pengeluaran & Pemasukan, dan Riwayat Transaksi).
    - `generateReportXlsx(data)`: Menghasilkan Excel multi-sheet (`Ringkasan`, `Kategori`, `Transaksi`) secara lazy-loaded.
    - `generateReportPdf(data)`: Menghasilkan PDF A4 siap cetak dengan palet Liquid Glass secara lazy-loaded.
    - `exportAndShareReport(format, data)`: Mengorkestrasi penyimpanan berkas ke cache perangkat dan membagikan via `@capacitor/share` pada platform native, atau pemicu unduh/Web Share pada web browser.
  - **Antarmuka Pengguna Liquid Glass (`src/routes/reports/+page.svelte`)**:
    - Tombol aksi "Ekspor" (`ios_share`) pada header halaman laporan.
    - Modal bottom sheet `GlassSheet` untuk memilih filter dompet (Semua Dompet / Dompet Tertentu) dan format ekspor (CSV, Excel, PDF).
    - Indikator status loading saat proses lazy-loading & penulisan berkas berlangsung, serta toast status berhasil/gagal.
  - **Pengujian & Verifikasi**:
    - 6 unit test di `src/lib/services/reportExportService.test.ts` memverifikasi angka pada file CSV, Excel, dan PDF 100% cocok dengan hasil fungsi domain laporan untuk data seed.
    - Playwright E2E test di `src/routes/reports/reports.e2e.ts` memverifikasi pembukaan modal ekspor, unduhan berkas CSV, dan pencocokan nominal file dengan angka di layar.
- **Konsekuensi:**
  - Pustaka berat tidak membebani initial bundle aplikasi karena dipecah ke chunk dinamis terpisah.
  - Seluruh 170 unit test Vitest dan 22 Playwright E2E test lulus 100% hijau.

## ADR-020: Pemilihan Pendekatan Ekstraksi Struk (On-Device OCR ML Kit + Rule-Based Parsing)

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pada Fase 8 (Fitur Lanjutan), aplikasi membutuhkan fitur ekstraksi struk belanja (kamera & galeri) untuk otomatisasi pencatatan transaksi, merujuk rangkaian desain Stitch: `scan_struk_ai_kamera_pemindai`, `pratinjau_struk_zoom_view`, `review_ekstraksi_struk`, dan `koreksi_item_struk`.
  Diperlukan perbandingan dan keputusan arsitektural antara tiga pendekatan ekstraksi struk untuk aplikasi Android Capacitor offline-first data keuangan pribadi:
  1. **Opsi (1)**: OCR di perangkat (Google ML Kit Text Recognition v2 via Capacitor plugin) lalu parsing aturan (regex & heuristik spasial).
  2. **Opsi (2)**: OCR di perangkat lalu dirapikan model bahasa lokal (On-device Small Language Model / SLM via MediaPipe/llama.cpp).
  3. **Opsi (3)**: Kirim foto ke API model bahasa (Cloud Vision LLM) lewat server perantara (backend proxy).
- **Perbandingan Evaluasi Enam Dimensi:**
  1. **Akurasi Struk Indonesia (Indomaret, Alfamart, SPBU, Restoran)**:
     - _Opsi (1)_: Akurasi teks OCR 90–95%, deteksi total & tanggal 85–92%, item list 70–80% (struk rapi) / 55–65% (struk kusut). Kelemahan ini dimitigasi secara elegan oleh desain alur tinjauan `review_ekstraksi_struk` dan `koreksi_item_struk`.
     - _Opsi (2)_: Akurasi ekstraksi angka uang tidak dapat diandalkan (SLM kecil 4-bit rentan halusinasi angka), serta pemahaman singkatan kasir lokal terbatas.
     - _Opsi (3)_: Akurasi tertinggi (95–98%), sangat cerdas mengenali singkatan lokal ("MYK GRG"), pajak PB1, dan diskon.
  2. **Kebutuhan Internet**:
     - _Opsi (1)_: 100% Offline. Bekerja tanpa kuota / sinyal internet (di basement mall/supermarket).
     - _Opsi (2)_: Offline saat inferensi, namun wajib mengunduh model bobot 1.5–2.5 GB di awal.
     - _Opsi (3)_: Wajib 100% Online dengan koneksi stabil. Fitur mati total saat offline.
  3. **Privasi Data Keuangan**:
     - _Opsi (1)_: Maksimal (100% On-Device). Foto dan data struk tidak pernah meninggalkan perangkat.
     - _Opsi (2)_: Maksimal (100% On-Device).
     - _Opsi (3)_: Berisiko tinggi. Foto struk berisi data pribadi (lokasi, waktu, 4 digit kartu, barang belanjaan) dikirim ke server pihak ketiga, bertentangan dengan komitmen zero-knowledge aplikasi.
  4. **Biaya Operasional (Cost)**:
     - _Opsi (1)_: Rp0 (Gratis selamanya). Tanpa API key, tanpa sewa server.
     - _Opsi (2)_: Rp0 inferensi, namun membutuhkan biaya hosting CDN untuk unduhan model GB-an.
     - _Opsi (3)_: Sangat mahal dan berulang (recurring cost). Biaya token vision ($0.002–$0.008/gambar) + biaya sewa VPS proxy (~Rp1–5 juta/bulan untuk 1.000 pengguna aktif).
  5. **Ukuran APK & Beban Perangkat**:
     - _Opsi (1)_: Ringan (~10–15 MB tambahan untuk model ML Kit Latin). RAM <50 MB, inferensi instan (<1 detik).
     - _Opsi (2)_: Sangat bengkak (>1.5 GB). Kebutuhan RAM >2 GB, memicu crash Out-Of-Memory (OOM) dan lag 15–30 detik pada perangkat Android entry/mid-range di Indonesia.
     - _Opsi (3)_: Nol tambahan (~0 MB).
  6. **Pekerjaan Tambahan (Maintenance & Backend)**:
     - _Opsi (1)_: Rendah–Sedang. Plugin Capacitor ML Kit Text Recognition + parser TypeScript murni di domain. Nol pemeliharaan server.
     - _Opsi (2)_: Sangat tinggi. Integrasi C++/JNI, akselerasi GPU/NPU shader, dan mitigasi crash OOM.
     - _Opsi (3)_: Sangat tinggi. Wajib membangun backend proxy server, autentikasi, rate-limiting, anti-abuse, proteksi DDoS, dan manajemen billing API.
- **Keputusan:**
  Memilih **Opsi (1): OCR di perangkat (Google ML Kit) dipadukan dengan Rule-Based Parsing berbasis TypeScript murni di domain**.
  Menolak Opsi (2) dan Opsi (3) karena:
  1. Menjaga komitmen fundamental aplikasi: **100% Offline-First & Privasi Finansial Penuh**.
  2. Bebas biaya operasional selamanya (**Rp0 Sustainability**).
  3. Menjamin stabilitas perangkat mobile tanpa risiko OOM / APK bengkak gigabyte.
  4. Sinergi sempurna dengan antarmuka **Human-in-the-Loop** yang telah dirancang (`review_ekstraksi_struk` dan `koreksi_item_struk`), di mana pengguna memverifikasi data sebelum dicatat ke database.
- **Konsekuensi:**
  - Pipeline pemindaian struk bekerja secara offline, cepat (<1 detik), privat, dan gratis.
  - Implementasi di masa mendatang berfokus pada modul domain `receiptParser.ts` (spatial line clustering & kamus pola ritel Indonesia) dan integrasi plugin ML Kit Capacitor.

## ADR-021: Pemilihan Plugin Kamera Native (@capacitor/camera@7.0.5) dan OCR Google ML Kit (@pantrist/capacitor-plugin-ml-kit-text-recognition@7.0.0)

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Melanjutkan keputusan arsitektural ADR-020, aplikasi membutuhkan integrasi native pada Android Capacitor untuk:
  1. Mengambil foto struk belanja resolusi tinggi melalui kamera perangkat fisik atau memilih berkas gambar dari galeri foto.
  2. Menjalankan Optical Character Recognition (OCR) di perangkat berbasis Google ML Kit Text Recognition v2 yang mengembalikan teks mentah, blok teks, dan baris teks beserta koordinat batas spasial (`boundingBox: { left, top, right, bottom }`) per baris.
  3. Menjamin keselarasan versi dengan ekosistem Capacitor 7 yang digunakan proyek ini tanpa menimbulkan konflik `compileSdk` atau `peerDependencies`.
- **Keputusan:**
  1. **Pemilihan `@capacitor/camera@7.0.5`**:
     - _Kesesuaian Versi_: Proyek Money Tracker menggunakan basis Capacitor 7 (`@capacitor/core: ^7.0.0`, `@capacitor/android: ^7.0.0`). Versi `@capacitor/camera@7.0.5` adalah rilis stabil terakhir untuk ekosistem Capacitor 7 (`peerDependencies: { "@capacitor/core": ">=7.0.0" }`). Versi `@capacitor/camera` v8.x membutuhkan `@capacitor/core: >=8.0.0` dan Android compileSdk 36 yang tidak kompatibel dengan konfigurasi native proyek saat ini.
     - _Fitur & Alur_: Mendukung pengambilan foto kamera native (`CameraSource.Camera`) dan impor dari galeri (`CameraSource.Photos`), koreksi orientasi otomatis (`correctOrientation: true`), dan penangkapan resolusi tinggi yang kemudian dikompresi ke JPEG (sisi terpanjang maksimum 1600 px) sebelum disimpan ke basis data.
  2. **Pemilihan `@pantrist/capacitor-plugin-ml-kit-text-recognition@7.0.0`**:
     - _Kesesuaian Versi_: Plugin `@pantrist/...@7.0.0` adalah plugin OCR ML Kit di ekosistem Capacitor yang kompatibel penuh dengan Capacitor 7 (`peerDependencies: { "@capacitor/core": ">=7.0.0" }`, compileSdk 34). Alternatif lain seperti `@capacitor-mlkit/text-recognition` (Capawesome) hanya tersedia untuk Capacitor 8 (`>=8.0.0`, compileSdk 36).
     - _Dukungan Bounding Box per Baris_: Plugin mengembalikan struktur hierarkis `blocks -> lines -> elements`, di mana setiap baris (`Line`) membawa koordinat spasial `boundingBox: { left, top, right, bottom }` dan `cornerPoints`, yang merupakan prasyarat mutlak untuk algoritma _spatial line clustering_ pada struk belanja kasir.
  3. **Mekanisme Pengunduhan Model ML Kit oleh Google Play Services**:
     - Plugin menggunakan dependensi `com.google.android.gms:play-services-mlkit-text-recognition:19.0.1`.
     - Model inferensi teks Latin dikelola dan diunduh secara terpusat oleh **Google Play Services** di perangkat, bukan dibundel statis di dalam biner APK aplikasi.
     - _Keuntungan_: Ukuran APK tetap sangat ramping (hanya menambah ~200–300 KB library wrapper daripada membengkak 12–15 MB).
     - _Mitigasi Kesiapan Model_: Ditambahkan metadata `<meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="ocr" />` di `android/app/src/main/AndroidManifest.xml` agar Google Play Services otomatis mengunduh model OCR saat aplikasi pertama kali dipasang dari Play Store.
     - _Penanganan Kesalahan_: Pada lapisan adapter `src/lib/platform/capacitor.ts`, jika Play Services belum selesai mengunduh model atau perangkat baru di-reset tanpa internet, kesalahan ditangkap dan pesan ramah pengguna ditampilkan: _"Model OCR Google Play Services sedang diunduh di latar belakang. Pastikan perangkat memiliki koneksi internet dan coba beberapa saat lagi."_
- **Konsekuensi:**
  - Build Android `./gradlew assembleDebug` sukses bersih tanpa konflik dependensi dengan ukuran APK 31 MB.
  - Teks mentah dan koordinat spasial per baris tersedia secara deterministik untuk kebutuhan pembuatan fixture di `tests/fixtures/receipts/` dan pengujian TDD parser struk.

## ADR-022: Standarisasi AppHeader, Mitigasi Safe-Area Status Bar Android, Simplifikasi Beranda, dan Segmented Control Beranimasi

- **Status:** Diterima
- **Tanggal:** 2026-10-13
- **Konteks:**
  Pengguna menetapkan keputusan desain baru yang menyederhanakan hierarki visual dan menstandardisasi komponen antarmuka, menggantikan spesifikasi rancangan mockup Stitch sebelumnya jika terdapat perbedaan:
  1. Header halaman aplikasi memiliki variasi struktur yang tidak seragam (ada yang menggunakan avatar, subjudul deskriptif panjang, dan tombol aksi berlebihan). Diperlukan standarisasi komponen `AppHeader` dengan aturan ketat.
  2. Pada platform Android (Capacitor 7 / target SDK 35), elemen header menabrak status bar sistem karena perilaku edge-to-edge default Android 15, ketidaktersediaan nilai `env(safe-area-inset-top)` pada Chromium WebView tanpa display cutout fisik, serta beberapa halaman yang membypass utility safe-area dengan hardcoded padding `pt-6`/`pt-8`.
  3. Beranda (`/`): Kartu saldo memuat tombol redundan `Keluar`/`Masuk`/`Transfer` yang sebenarnya sudah terakomodasi di tombol aksi cepat (+) tab bar bawah. Daftar dompet juga memanjang vertikal/carousel lebar yang memakan ruang vertikal.
  4. Komponen `GlassSegmented`: Tab aktif sebelumnya hanya berganti warna latar tombol statis tanpa indikator fisik beranimasi, kontras kurang tajam, dan bobot teks aktif sama dengan inaktif.
- **Keputusan:**
  1. **Standarisasi Komponen `AppHeader` (`src/lib/components/glass/AppHeader.svelte`)**:
     - Aturan: Satu judul besar (`text-2xl font-bold tracking-tight text-on-surface`), **tanpa subjudul**, dan **maksimal dua tombol ikon** di sebelah kanan.
     - Penerapan:
       - **Beranda (`/`)**: Judul berupa sapaan dinamis berdasarkan waktu, tombol lonceng notifikasi (dengan badge unread), dan tombol pengaturan.
       - **Transaksi (`/transactions`)**: Judul "Transaksi", tombol cari, tombol filter drawer (dengan indikator titik aktif), **tanpa tombol tambah**.
       - **Dompet (`/wallets`)**: Judul "Dompet", tombol tambah dompet (`/wallets/new`).
       - **Laporan (`/reports`)**: Judul "Laporan", tombol bagikan/ekspor (`ios_share`). Periode laporan ditempatkan sebagai pill independen di bawah judul.
  2. **Mitigasi Safe-Area Inset Status Bar Android (Capacitor 7)**:
     - Di `src/app.css`, memperbarui `.pt-safe` menjadi `padding-top: max(36px, calc(env(safe-area-inset-top, 0px) + 8px));` untuk menjamin jarak aman status bar minimal 36px di Android/Web dan otomatis bertambah bila ada notch/punch-hole.
     - Di `capacitor.config.ts`, menambahkan `android: { adjustMarginsForEdgeToEdge: 'auto' }`.
     - Menstandarisasi seluruh halaman (`/wallets`, `/wallets/new`, `/wallets/[id]`, `/wallets/[id]/edit`, `/settings/categories`, `/onboarding`) agar konsisten menggunakan `pt-safe px-4`.
     - Pada `GlassSheet.svelte`, membatasi tinggi maksimum sheet menjadi `max-h-[calc(100vh-max(44px,env(safe-area-inset-top,0px))-16px)]` agar tidak pernah menabrak status bar saat konten sheet panjang.
  3. **Penyegaran Beranda (`/`)**:
     - Menghapus 3 tombol aksi (Keluar, Masuk, Transfer) dari kartu saldo agar kartu berfokus murni pada informasi saldo dan arus kas.
     - Mengganti daftar dompet menjadi strip horizontal satu baris yang memuat maksimal 4 dompet (`wallets.slice(0, 4)`) dengan tautan "Lihat semua" menuju `/wallets`.
  4. **Pembaruan `GlassSegmented` (Sliding Pill Thumb Beranimasi)**:
     - Menggunakan sliding thumb `div` absolut dengan transisi halus `transform: translateX(...)` berdurasi 200ms ease-out.
     - Kontras tinggi dengan latar `--color-surface-container-lowest` dan bayangan lembut.
     - Teks aktif tebal (`font-bold text-on-surface`) dan teks inaktif berbobot sedang (`font-medium text-on-surface-variant`).
     - Diterapkan pada filter Transaksi, filter Dompet, dan tab navigasi Laporan.
  5. **Showcase di `/dev/gallery`**:
     - Ditambahkan demonstrasi `AppHeader` dan `GlassSegmented` baru, serta dokumentasi kepatuhan terhadap token desain di `docs/design/tokens.md`.
- **Konsekuensi:**
  - Desain antarmuka terasa lebih bersih, konsisten, dan mematuhi ergonomi modern iOS Liquid Glass di atas Android Capacitor.
  - Tampilan di perangkat Android tidak lagi tertimpa status bar sistem.
