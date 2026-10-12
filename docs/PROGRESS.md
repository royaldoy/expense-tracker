# Progress Proyek Money Tracker

## Status Saat Ini

- **Fase 0: Inisialisasi Proyek & Tooling** - Selesai
- **Fase 1: Domain Core & Logika Uang** - Selesai
- **Fase 2: Database Lokal & Repository (Dexie)** - Selesai (Skema, Repositories, Atomic Balance Updates, RebuildBalances)

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

- [ ] **Fase 3: Services Lanjutan & Validasi (Valibot)**
  - [ ] Use-case services untuk kategori, dompet, dan anggaran
  - [ ] Skema validasi Valibot di batas sistem

- [ ] **Fase 4: Sistem UI Liquid Glass & Komponen Dasar**
  - [ ] Desain token warna, blur, dan radius di `src/app.css`
  - [ ] Komponen Liquid Glass (`GlassSheet`, tab bar, toolbar, card)
  - [ ] i18n (`src/lib/i18n/id.json`)

- [ ] **Fase 5: Fitur Halaman & Alur Pengguna**
  - [ ] Onboarding & setup dompet pertama
  - [ ] Beranda & ringkasan saldo
  - [ ] Tambah & riwayat transaksi
  - [ ] Transfer antar dompet & fee
  - [ ] Anggaran & laporan pengeluaran
  - [ ] Pengaturan & kelola kategori

- [ ] **Fase 6: Testing E2E Alur Utama**
  - [ ] Playwright E2E testing alur transaksi dan anggaran

- [ ] **Fase 7: Integrasi Platform & Android Capacitor**
  - [ ] Setup Capacitor
  - [ ] Platform adapter (Web & Capacitor)
  - [ ] Sinkronisasi build ke Android
