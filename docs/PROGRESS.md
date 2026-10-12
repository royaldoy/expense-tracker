# Progress Proyek Money Tracker

## Status Saat Ini

- **Fase 0: Inisialisasi Proyek** - Selesai

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

- [ ] **Fase 1: Domain Core & Logika Uang**
  - [ ] Domain `money.ts` (integer Rupiah, format, parsing)
  - [ ] Domain balance, period, budget, recurring
  - [ ] Unit test komprehensif logika uang

- [ ] **Fase 2: Database Lokal & Repository (Dexie)**
  - [ ] Skema database IndexedDB & migrasi
  - [ ] Model ULID, soft-delete (`deletedAt`), timestamps
  - [ ] Repositories & `rebuildBalances()`
  - [ ] Repository test dengan `fake-indexeddb`

- [ ] **Fase 3: Services & Validasi (Valibot)**
  - [ ] Use-case services
  - [ ] Skema validasi Valibot

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
