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
