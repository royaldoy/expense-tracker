# Money Tracker

## Ringkasan

Aplikasi pencatat keuangan pribadi multi-dompet (GoPay, ShopeePay, bank, tunai).
SPA offline-first, data lokal, dibungkus Capacitor menjadi APK Android.
Bahasa UI: Indonesia. Mata uang: IDR.

## Stack

Svelte 5 (runes) + SvelteKit adapter-static (SPA, ssr=false), TypeScript strict,
Tailwind v4, Dexie, Valibot, date-fns, Vitest, Playwright, Capacitor.

## Perintah

- pnpm dev : dev server
- pnpm build : build statis ke build/
- pnpm check : svelte-check + tsc
- pnpm lint : eslint + prettier
- pnpm test : vitest
- pnpm test:e2e : playwright
- npx cap sync android : sinkron build ke android/ (mulai Fase 7)

## Arsitektur

Arah ketergantungan: UI -> stores -> services -> domain dan repository.

- src/routes : halaman, tipis
- src/lib/components : komponen UI; glass/ berisi komponen Liquid Glass
- src/lib/domain : TypeScript murni (money, balance, period, budget, recurring).
  DILARANG import svelte, dexie, atau capacitor
- src/lib/db : schema, migrasi, repositories
- src/lib/services : use-case, satu fungsi = satu aksi pengguna
- src/lib/platform : adapter web dan capacitor di balik satu interface
- src/lib/i18n : id.json

## Aturan data uang (wajib)

1. Uang = integer Rupiah, tidak ada float. Format dan parse hanya lewat domain/money.ts
2. Transfer = satu record (toWalletId, fee). Tidak dihitung sebagai pemasukan atau
   pengeluaran di laporan; fee dihitung sebagai pengeluaran
3. Saldo dihitung dari transaksi. Cache wallets.balance diperbarui dalam transaksi DB
   yang sama dengan penulisan transaksi. rebuildBalances() harus selalu ada
4. ID ULID. Semua tabel punya createdAt, updatedAt, deletedAt (soft delete)
5. Ubah skema = naikkan versi + tulis migrasi + tulis test. Backup JSON berversi

## Aturan kode

- TypeScript strict, tanpa any
- Komponen tidak menyentuh DB; panggil service
- Validasi input dengan Valibot di batas sistem (form, import, restore)
- Teks UI dari i18n/id.json, bukan hardcode
- Tanggal lewat date-fns dan zona waktu perangkat

## UI

- Gaya iOS Liquid Glass. Glass hanya untuk lapisan navigasi (tab bar, toolbar,
  tombol, sheet); kartu konten dibuat hampir opak
- Token warna, blur, radius ada di src/app.css; jangan hardcode warna
- Rujukan desain: docs/design/screens/ dan docs/design/tokens.md
- Bottom sheet wajib lewat GlassSheet agar tombol back Android menutup sheet lebih dulu
- Target viewport 390x844, hormati safe area
- Sediakan fallback tanpa backdrop-filter dan opsi "Kurangi transparansi"

## Testing

- Setiap fungsi domain punya unit test; untuk logika uang, tulis test lebih dulu
- Repository diuji dengan fake-indexeddb
- Alur utama diuji dengan Playwright
- Fitur belum selesai sebelum check, lint, dan test hijau

## Cara kerja

- Satu fase atau fitur per sesi; minta rencana dulu bila perubahan lebih dari 3 file
- Commit kecil dengan conventional commits (feat:, fix:, test:, refactor:, docs:)
- Catat keputusan di docs/DECISIONS.md dan status di docs/PROGRESS.md
- Jangan tambah dependency baru tanpa menjelaskan alasannya

## Dilarang

- float untuk uang
- akses DB dari komponen
- ubah skema tanpa migrasi
- menyimpan keystore, .env, atau data pribadi di repo
- menghapus atau melemahkan test supaya build hijau
