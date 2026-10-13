# Design Tokens - Money Tracker (Liquid Glass Finance)

Dokumen ini berisi nilai konkret token desain aplikasi Money Tracker yang diekstraksi dari spesifikasi Stitch (`docs/design/screens/liquid_glass_finance/DESIGN.md`) dan layar acuan. Seluruh nilai berupa angka konkret (hex, px, rem, persentase) tanpa deskripsi ambigu. Token mode gelap yang diturunkan dari mode terang ditandai secara eksplisit dengan **(turunan)**.

---

## 1. Palet Warna (Color Palette)

### A. Mode Terang (Light Mode - Nilai Baku Desain)

| Token CSS                           | Hex / Nilai Konkret       | Peruntukan & Elemen                           |
| :---------------------------------- | :------------------------ | :-------------------------------------------- |
| `--color-surface`                   | `#FCF8FB`                 | Latar belakang kanvas aplikasi                |
| `--color-surface-container-lowest`  | `#FFFFFF`                 | Latar kartu putih paling terang, popup, modal |
| `--color-surface-container-low`     | `#F6F3F5`                 | Latar kontainer bertingkat rendah             |
| `--color-surface-container`         | `#F0EDEF`                 | Kontainer sekunder, baris input nonaktif      |
| `--color-surface-container-high`    | `#EAE7EA`                 | Kontainer elevated, pill kontrol              |
| `--color-surface-container-highest` | `#E4E2E4`                 | Border halus, garis pembatas horizontal       |
| `--color-surface-dim`               | `#DCD9DC`                 | Latar elemen dimmed di mode terang            |
| `--color-surface-bright`            | `#FCF8FB`                 | Latar elemen terang                           |
| `--color-inverse-surface`           | `#303032`                 | Kontras terbalik (toast, tooltip)             |
| `--color-inverse-on-surface`        | `#F2F0F2`                 | Teks di atas inverse-surface                  |
| `--color-on-surface`                | `#1B1B1D`                 | Teks utama kontras tinggi                     |
| `--color-on-surface-variant`        | `#414755`                 | Teks sekunder, deskripsi, subhead             |
| `--color-outline`                   | `#717786`                 | Outline komponen kontrol                      |
| `--color-outline-variant`           | `#C1C6D7`                 | Hairline border, divider tipis                |
| `--color-primary`                   | `#0058BC`                 | Aksen biru iOS utama, tab aktif               |
| `--color-on-primary`                | `#FFFFFF`                 | Teks/ikon di atas warna primary               |
| `--color-primary-container`         | `#0070EB`                 | Tombol aksi cepat (+), FAB                    |
| `--color-on-primary-container`      | `#FFFFFF`                 | Teks/ikon di atas primary container           |
| `--color-income`                    | `#006E28`                 | Hijau emerald: pemasukan, saldo bertambah     |
| `--color-on-income`                 | `#FFFFFF`                 | Teks/ikon di atas warna income                |
| `--color-income-container`          | `#E8F8EC`                 | Latar badge & pill pemasukan                  |
| `--color-on-income-container`       | `#006E28`                 | Teks di atas income container                 |
| `--color-expense`                   | `#BC000A`                 | Merah coral: pengeluaran, peringatan          |
| `--color-on-expense`                | `#FFFFFF`                 | Teks/ikon di atas warna expense               |
| `--color-expense-container`         | `#FEECEB`                 | Latar badge & pill pengeluaran                |
| `--color-on-expense-container`      | `#BC000A`                 | Teks di atas expense container                |
| `--color-transfer`                  | `#5856D6`                 | Ungu royal: transfer antar dompet             |
| `--color-on-transfer`               | `#FFFFFF`                 | Teks/ikon di atas transfer                    |
| `--color-warning`                   | `#FF9500`                 | Oranye: indikator waspada anggaran            |
| `--color-ambient-orb-1`             | `rgba(0, 122, 255, 0.12)` | Orb dekorasi latar (Sky Blue)                 |
| `--color-ambient-orb-2`             | `rgba(52, 199, 89, 0.10)` | Orb dekorasi latar (Emerald)                  |
| `--color-ambient-orb-3`             | `rgba(88, 86, 214, 0.08)` | Orb dekorasi latar (Lavender)                 |

### B. Mode Gelap (Dark Mode - Nilai Turunan Spesifikasi)

| Token CSS                           | Hex / Nilai Konkret        | Status Spesifikasi | Peruntukan & Elemen                 |
| :---------------------------------- | :------------------------- | :----------------: | :---------------------------------- |
| `--color-surface`                   | `#121214`                  |   **(turunan)**    | Latar belakang kanvas gelap         |
| `--color-surface-container-lowest`  | `#0A0A0C`                  |   **(turunan)**    | Kontainer paling gelap              |
| `--color-surface-container-low`     | `#18181B`                  |   **(turunan)**    | Latar kontainer dasar gelap         |
| `--color-surface-container`         | `#202024`                  |   **(turunan)**    | Latar kartu konten di mode gelap    |
| `--color-surface-container-high`    | `#28282D`                  |   **(turunan)**    | Kontainer elevated di mode gelap    |
| `--color-surface-container-highest` | `#323237`                  |   **(turunan)**    | Border & divider di mode gelap      |
| `--color-surface-dim`               | `#141416`                  |   **(turunan)**    | Latar elemen dimmed di mode gelap   |
| `--color-surface-bright`            | `#38383E`                  |   **(turunan)**    | Latar elemen terang di mode gelap   |
| `--color-inverse-surface`           | `#E4E2E4`                  |   **(turunan)**    | Kontras terbalik di mode gelap      |
| `--color-inverse-on-surface`        | `#1B1B1D`                  |   **(turunan)**    | Teks di atas inverse-surface        |
| `--color-on-surface`                | `#F2F2F7`                  |   **(turunan)**    | Teks utama putih kontras tinggi     |
| `--color-on-surface-variant`        | `#A1A1AA`                  |   **(turunan)**    | Teks sekunder abu-abu terang        |
| `--color-outline`                   | `#52525B`                  |   **(turunan)**    | Garis outline kontrol di mode gelap |
| `--color-outline-variant`           | `#3F4450`                  |   **(turunan)**    | Hairline divider di mode gelap      |
| `--color-primary`                   | `#0A84FF`                  |   **(turunan)**    | iOS Blue cerah mode gelap           |
| `--color-on-primary`                | `#FFFFFF`                  |   **(turunan)**    | Teks di atas warna primary          |
| `--color-primary-container`         | `#00479E`                  |   **(turunan)**    | Kontainer tombol aksi di mode gelap |
| `--color-on-primary-container`      | `#D8E2FF`                  |   **(turunan)**    | Teks di atas primary container      |
| `--color-income`                    | `#30D158`                  |   **(turunan)**    | Hijau cerah mode gelap              |
| `--color-on-income`                 | `#FFFFFF`                  |   **(turunan)**    | Teks di atas income                 |
| `--color-income-container`          | `#00531C`                  |   **(turunan)**    | Latar badge pemasukan gelap         |
| `--color-on-income-container`       | `#72FE88`                  |   **(turunan)**    | Teks badge pemasukan gelap          |
| `--color-expense`                   | `#FF453A`                  |   **(turunan)**    | Merah coral cerah mode gelap        |
| `--color-on-expense`                | `#FFFFFF`                  |   **(turunan)**    | Teks di atas expense                |
| `--color-expense-container`         | `#930005`                  |   **(turunan)**    | Latar badge pengeluaran gelap       |
| `--color-on-expense-container`      | `#FFDAD5`                  |   **(turunan)**    | Teks badge pengeluaran gelap        |
| `--color-transfer`                  | `#5E5CE6`                  |   **(turunan)**    | Ungu cerah mode gelap               |
| `--color-on-transfer`               | `#FFFFFF`                  |   **(turunan)**    | Teks di atas transfer               |
| `--color-warning`                   | `#FF9F0A`                  |   **(turunan)**    | Oranye cerah mode gelap             |
| `--color-ambient-orb-1`             | `rgba(10, 132, 255, 0.15)` |   **(turunan)**    | Orb dekorasi latar Sky Blue gelap   |
| `--color-ambient-orb-2`             | `rgba(48, 209, 88, 0.12)`  |   **(turunan)**    | Orb dekorasi latar Emerald gelap    |
| `--color-ambient-orb-3`             | `rgba(94, 92, 230, 0.10)`  |   **(turunan)**    | Orb dekorasi latar Lavender gelap   |

---

## 2. Tingkatan Efek Glass & Opasitas (Material Tiers)

Aturan CLAUDE.md: _Glass hanya untuk navigasi (tab bar, toolbar, tombol, sheet); kartu konten dibuat hampir opak._

### A. Konfigurasi Standar (Dengan Dukungan `backdrop-filter`)

| Material Tier                              | Mode Terang (Light)         | Mode Gelap (Dark - Turunan) | Backdrop Blur | Border & Specular Rim                                                                                                                                                                   | Box Shadow                                                                                      |
| :----------------------------------------- | :-------------------------- | :-------------------------- | :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **Floating Tab Bar & Sheets**              | `rgba(255, 255, 255, 0.85)` | `rgba(28, 28, 30, 0.85)`    |    `32px`     | `1px solid rgba(255, 255, 255, 0.80)`, `inset 0 1px 1px rgba(255, 255, 255, 0.90)` (Light)<br>`1px solid rgba(255, 255, 255, 0.12)`, `inset 0 1px 1px rgba(255, 255, 255, 0.18)` (Dark) | `0 16px 40px -8px rgba(0, 0, 0, 0.12)` (Light)<br>`0 16px 40px -8px rgba(0, 0, 0, 0.45)` (Dark) |
| **Nav Header & Toolbar**                   | `rgba(252, 248, 251, 0.82)` | `rgba(18, 18, 20, 0.82)`    |    `20px`     | `1px solid rgba(255, 255, 255, 0.50)` (Light)<br>`1px solid rgba(255, 255, 255, 0.10)` (Dark)                                                                                           | `0 1px 8px rgba(0, 0, 0, 0.04)`                                                                 |
| **Kartu Navigasi / Summary**               | `rgba(255, 255, 255, 0.72)` | `rgba(32, 32, 36, 0.72)`    |    `24px`     | `1px solid rgba(255, 255, 255, 0.70)`, `inset 0 1px 1px rgba(255, 255, 255, 0.80)` (Light)<br>`1px solid rgba(255, 255, 255, 0.10)` (Dark)                                              | `0 12px 32px -4px rgba(27, 39, 87, 0.06)`                                                       |
| **Kartu Konten / Transaksi (Hampir Opak)** | `rgba(255, 255, 255, 0.92)` | `rgba(32, 32, 36, 0.92)`    |    `12px`     | `1px solid rgba(228, 226, 228, 0.80)` (Light)<br>`1px solid rgba(50, 50, 55, 0.80)` (Dark)                                                                                              | `0 4px 16px -2px rgba(27, 39, 87, 0.04)`                                                        |
| **Pill / Button / Segmented**              | `rgba(255, 255, 255, 0.60)` | `rgba(40, 40, 45, 0.60)`    |    `16px`     | `1px solid rgba(255, 255, 255, 0.65)` (Light)<br>`1px solid rgba(255, 255, 255, 0.12)` (Dark)                                                                                           | `0 2px 8px rgba(0, 0, 0, 0.06)`                                                                 |
| **Keypad / Input Fields**                  | `rgba(255, 255, 255, 0.55)` | `rgba(35, 35, 40, 0.55)`    |    `16px`     | `1px solid rgba(255, 255, 255, 0.50)` (Light)<br>`1px solid rgba(255, 255, 255, 0.10)` (Dark)                                                                                           | `inset 0 1px 2px rgba(0, 0, 0, 0.03)`                                                           |

### B. Fallback Tanpa Backdrop Filter / "Kurangi Transparansi" (`data-reduce-transparency="true"`)

Pada lingkungan tanpa dukungan `backdrop-filter` atau saat opsi aksesibilitas "Kurangi Transparansi" aktif:

- Seluruh nilai blur di-reset menjadi `0px`.
- Seluruh lapisan beralih ke warna opak 100%:
  - Light mode: `#FFFFFF` (kartu & sheet), `#F0EDEF` (input & keypad).
  - Dark mode: `#202024` (kartu & sheet), `#28282D` (input & keypad).
- Border beralih ke warna solid `--color-outline-variant`.

---

## 3. Radius Sudut (Corner Radiuses)

Geometri kurvatur kontinu iOS (squircle):

| Token CSS       |   Nilai Konkret   | Peruntukan Komponen                                         |
| :-------------- | :---------------: | :---------------------------------------------------------- |
| `--radius-sm`   | `8px` (`0.5rem`)  | Icon badge, status tag, pill filter mini                    |
| `--radius-md`   |  `16px` (`1rem`)  | Input fields, keypad button, item baris daftar              |
| `--radius-lg`   | `24px` (`1.5rem`) | Kartu konten transaksi, kartu ringkasan, dialog konfirmasi  |
| `--radius-xl`   |  `32px` (`2rem`)  | Kartu hero dompet utama, lengkungan atas `GlassSheet`       |
| `--radius-full` |     `9999px`      | Segmented control, floating tab bar capsule, tombol FAB (+) |

---

## 4. Jarak & Layout (Spacing & Layout Grid)

Sistem grid 8pt (sub-grid 4pt), viewport target `390px` x `844px`:

| Token / Atribut          |              Nilai Konkret               | Keterangan & Penggunaan                         |
| :----------------------- | :--------------------------------------: | :---------------------------------------------- |
| `safe-area-top`          |  `max(16px, env(safe-area-inset-top))`   | Padding atas kanvas untuk status bar / notch    |
| `safe-area-bottom`       | `max(16px, env(safe-area-inset-bottom))` | Jarak bawah kanvas untuk home indicator         |
| `screen-padding-x`       |             `16px` (`1rem`)              | Gutter horizontal layar mobile                  |
| `space-xs`               |            `4px` (`0.25rem`)             | Micro-gap antar label dan ikon kecil            |
| `space-sm`               |             `8px` (`0.5rem`)             | Jarak antar item dalam daftar rapat             |
| `space-md`               |             `16px` (`1rem`)              | Padding internal kartu, margin elemen form      |
| `space-lg`               |            `24px` (`1.5rem`)             | Jarak vertikal antar section konten             |
| `space-xl`               |             `32px` (`2rem`)              | Jarak vertikal hero balance                     |
| `tabbar-height`          |                  `64px`                  | Tinggi floating tab bar capsule                 |
| `tabbar-floating-offset` |                  `16px`                  | Jarak tab bar melayang di atas safe-area bottom |
| `tabbar-width`           |           `calc(100% - 32px)`            | Lebar maksimum kapsul tab bar (`max-w-[390px]`) |

---

## 5. Tipografi Konkret (Typography)

- **Keluarga Font**: `Plus Jakarta Sans`, `-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`, `system-ui`, `sans-serif`.
- **Angka Finansial**: Wajib `font-variant-numeric: tabular-nums` dan `font-feature-settings: 'tnum' 1;`.

| Skala Tipografi | Ukuran Font (`font-size`) | Tinggi Baris (`line-height`) | Ketebalan (`font-weight`) |     Letter Spacing      |
| :-------------- | :-----------------------: | :--------------------------: | :-----------------------: | :---------------------: |
| `large-title`   |          `34px`           |            `41px`            |       `700` (Bold)        |        `-0.4px`         |
| `title-1`       |          `28px`           |            `34px`            |       `700` (Bold)        |        `-0.3px`         |
| `title-2`       |          `22px`           |            `28px`            |       `700` (Bold)        |        `-0.2px`         |
| `title-3`       |          `20px`           |            `25px`            |     `600` (SemiBold)      |        `-0.1px`         |
| `headline`      |          `17px`           |            `22px`            |     `600` (SemiBold)      |        `-0.4px`         |
| `body`          |          `17px`           |            `22px`            |      `400` (Regular)      |        `-0.4px`         |
| `callout`       |          `16px`           |            `21px`            |      `500` (Medium)       |        `-0.3px`         |
| `subhead`       |          `15px`           |            `20px`            |      `500` (Medium)       |        `-0.2px`         |
| `footnote`      |          `13px`           |            `18px`            |      `400` (Regular)      |        `-0.1px`         |
| `caption-1`     |          `12px`           |            `16px`            |      `500` (Medium)       |          `0px`          |
| `caption-2`     |          `11px`           |            `13px`            |     `600` (SemiBold)      |          `0px`          |
| `currency-hero` |          `36px`           |            `44px`            |       `700` (Bold)        | `-0.5px` (tabular-nums) |
| `currency-card` |          `24px`           |            `30px`            |       `700` (Bold)        | `-0.3px` (tabular-nums) |
| `keypad-key`    |          `24px`           |            `24px`            |     `600` (SemiBold)      |  `0px` (tabular-nums)   |

---

## 6. Token Gerak & Animasi (Motion Tokens)

Aturan performa CLAUDE.md: _Hanya animasikan `transform` dan `opacity` (GPU-accelerated compositing). Dilarang menganimasikan `blur` atau `backdrop-filter` karena menyebabkan frame drop di mobile GPU._

### A. Durasi Animasi (`--motion-duration-*`)

| Token CSS                    | Nilai Konkret | Peruntukan & Penggunaan                                          |
| :--------------------------- | :-----------: | :--------------------------------------------------------------- |
| `--motion-duration-instant`  |    `100ms`    | Respon feedback instan, toggle mikro                             |
| `--motion-duration-fast`     |    `150ms`    | Efek tekan (active:scale), page transition fade-out, haptic tap  |
| `--motion-duration-normal`   |    `250ms`    | Indikator tab bar bergeser, page transition fade-in, segmented   |
| `--motion-duration-moderate` |    `350ms`    | Gerak pegas lembar bawah `GlassSheet`, modal dialog              |
| `--motion-duration-slow`     |    `500ms`    | Kemunculan grafik SVG (clip-path / stroke), count-up angka saldo |

### B. Kurva Kecepatan & Easing (`--motion-ease-*`)

| Token CSS                     |        Kurva Bezier Konkret         | Karakteristik Gerak                                   |
| :---------------------------- | :---------------------------------: | :---------------------------------------------------- |
| `--motion-ease-standard`      |    `cubic-bezier(0.2, 0, 0, 1)`     | Halus universal untuk transisi tata letak dan scale   |
| `--motion-ease-decelerate`    |    `cubic-bezier(0, 0, 0.2, 1)`     | Masuk layar (entrance), cepat lalu melambat anggun    |
| `--motion-ease-accelerate`    |    `cubic-bezier(0.4, 0, 1, 1)`     | Keluar layar (exit), perlahan lalu melesat keluar     |
| `--motion-ease-spring`        | `cubic-bezier(0.34, 1.35, 0.64, 1)` | Gerak pegas elastis dengan sedikit pantulan (bounce)  |
| `--motion-ease-spring-gentle` |  `cubic-bezier(0.25, 1.1, 0.5, 1)`  | Pegas lembut tanpa pantulan berlebih untuk pill & tab |

### C. Mode Pengaturan Animasi (`data-motion`)

- **Penuh (`data-motion="full"`)**: Seluruh durasi dan kurva pegas aktif 100%.
- **Minimal (`data-motion="minimal"`)**: Durasi dipotong ~50%, kurva pegas digantikan kurva linear/standard, animasi staggered list dan count-up dinonaktifkan.
- **Mati (`data-motion="off"` / `@media (prefers-reduced-motion)`)**: Durasi `0.01ms`, seluruh elemen berubah seketika tanpa transisi.
