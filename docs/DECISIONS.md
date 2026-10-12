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
