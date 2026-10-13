<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import t from '$lib/i18n';
	import { categoryService, seedService, settingService } from '$lib/services';
	import { isPinSet, lockApp, refreshPinStatus } from '$lib/stores/securityStore';
	import { hideBalance, toggleHideBalance } from '$lib/stores/uiStore';
	import { isDevToolsEnabled } from '$lib/config/dev';

	let isDarkMode = $state(false);
	let reduceTransparency = $state(false);
	let startDay = $state(1);
	let categoryCount = $state(0);
	let isSeeding = $state(false);
	let seedMessage = $state<string | null>(null);
	const isDevTools = isDevToolsEnabled();

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		if (typeof document !== 'undefined') {
			if (isDarkMode) {
				document.documentElement.setAttribute('data-theme', 'dark');
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.removeAttribute('data-theme');
				document.documentElement.classList.remove('dark');
			}
		}
	}

	function toggleReduceTransparency() {
		reduceTransparency = !reduceTransparency;
		if (typeof document !== 'undefined') {
			if (reduceTransparency) {
				document.documentElement.setAttribute('data-reduce-transparency', 'true');
			} else {
				document.documentElement.removeAttribute('data-reduce-transparency');
			}
		}
	}

	async function handleRunSeed() {
		isSeeding = true;
		seedMessage = null;
		try {
			const res = await seedService.seedTransactions(1000);
			seedMessage = `Berhasil membuat ${res.count} transaksi dalam ${res.elapsedMs}ms!`;
		} catch (error) {
			seedMessage = `Gagal seeding: ${String(error)}`;
		} finally {
			isSeeding = false;
		}
	}

	onMount(async () => {
		const [day, cats] = await Promise.all([
			settingService.getSalaryDay(),
			categoryService.getCategories(),
			refreshPinStatus()
		]);
		startDay = day;
		categoryCount = cats.length;

		if (typeof document !== 'undefined') {
			isDarkMode =
				document.documentElement.getAttribute('data-theme') === 'dark' ||
				document.documentElement.classList.contains('dark');
			reduceTransparency =
				document.documentElement.getAttribute('data-reduce-transparency') === 'true';
		}
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top App Bar -->
	<header class="flex items-center justify-between pt-2">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-on-surface">
				{t('routes.pengaturan')}
			</h1>
			<p class="text-xs text-on-surface-variant">Preferensi Sistem & Keamanan Data</p>
		</div>
		<a
			href="/"
			class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
			aria-label="Kembali ke Beranda"
		>
			<span class="material-symbols-outlined text-xl">close</span>
		</a>
	</header>

	<!-- Kartu Profil & Status Offline-First -->
	<GlassCard variant="regular" class="p-4">
		<div class="flex items-center gap-3">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
				style="background: linear-gradient(135deg, var(--color-primary), #5856D6);"
			>
				<span class="material-symbols-outlined text-2xl">shield</span>
			</div>
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-bold text-on-surface">Money Tracker Lokal</h2>
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-primary"
						style="background: var(--glass-pill-bg);"
					>
						Offline-First
					</span>
				</div>
				<p class="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
					<span class="h-2 w-2 rounded-full bg-income"></span>
					Tersimpan di IndexedDB Offline (100% Privat)
				</p>
			</div>
		</div>
	</GlassCard>

	<!-- Grup 1: Finansial & Data -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Finansial & Data
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<a href="/budgets" class="block">
				<GlassListRow
					title="Anggaran Bulanan"
					subtitle="Batas limit pengeluaran & ambang peringatan"
					leadingIcon="pie_chart"
					leadingIconBg="#0058BC"
					chevron={true}
				/>
			</a>
			<a href="/recurring" class="block">
				<GlassListRow
					title="Transaksi Berulang"
					subtitle="Tagihan rutin, langganan & komitmen"
					leadingIcon="event_repeat"
					leadingIconBg="#5856D6"
					chevron={true}
				/>
			</a>
			<a href="/settings/categories" class="block">
				<GlassListRow
					title="Kelola Kategori"
					subtitle="Kategori pemasukan & pengeluaran hierarkis"
					leadingIcon="category"
					leadingIconBg="var(--color-primary)"
					trailingValue="{categoryCount} Kategori"
					chevron={true}
				/>
			</a>
			<a href="/settings/format" class="block">
				<GlassListRow
					title="Mata Uang & Format"
					subtitle="Siklus gajian tanggal {startDay}, format Rupiah"
					leadingIcon="payments"
					leadingIconBg="#FF9500"
					trailingValue="IDR (Rp)"
					chevron={true}
				/>
			</a>
			<a href="/settings/backup" class="block">
				<GlassListRow
					title="Cadangan & Data (Backup)"
					subtitle="Ekspor & pulihkan JSON berversi, unduh CSV"
					leadingIcon="cloud_sync"
					leadingIconBg="#006E28"
					trailingValue="JSON & CSV"
					chevron={true}
				/>
			</a>
			<a href="/settings/notifications" class="block">
				<GlassListRow
					title="Notifikasi & Pengingat"
					subtitle="Tagihan jatuh tempo, anggaran & pengingat harian"
					leadingIcon="notifications"
					leadingIconBg="#FF2D55"
					chevron={true}
				/>
			</a>
		</GlassCard>
	</section>

	<!-- Grup 2: Keamanan & Privasi -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Keamanan & Privasi
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<a href="/settings/security" class="block">
				<GlassListRow
					title="Kunci PIN & Aplikasi"
					subtitle="Enkripsi PBKDF2 Web Crypto SHA-256"
					leadingIcon="lock"
					leadingIconBg="#5856D6"
					trailingValue={$isPinSet ? 'Aktif' : 'Nonaktif'}
					trailingValueColor={$isPinSet ? 'income' : 'default'}
					chevron={true}
				/>
			</a>

			<!-- Toggle Sensor Saldo Beranda -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #34C759;"
					>
						<span class="material-symbols-outlined text-xl">
							{$hideBalance ? 'visibility_off' : 'visibility'}
						</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Sensor Saldo di Beranda</p>
						<p class="text-xs text-on-surface-variant">Samarkan nominal menjadi ••••••••</p>
					</div>
				</div>
				<button
					type="button"
					class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden"
					style="background: {$hideBalance
						? 'var(--color-primary)'
						: 'var(--color-outline-variant)'};"
					onclick={toggleHideBalance}
					role="switch"
					aria-checked={$hideBalance}
					aria-label="Sensor Saldo di Beranda"
					data-testid="toggle-hide-balance"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
						style="transform: {$hideBalance
							? 'translateX(20px)'
							: 'translateX(2px)'}; margin-top: 2px;"
					></span>
				</button>
			</div>

			{#if $isPinSet}
				<div class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
							style="background: #FF3B30;"
						>
							<span class="material-symbols-outlined text-xl">screen_lock_portrait</span>
						</div>
						<div>
							<p class="text-sm font-semibold text-on-surface">Kunci Sekarang</p>
							<p class="text-xs text-on-surface-variant">Uji langsung layar kunci PIN</p>
						</div>
					</div>
					<GlassButton variant="secondary" size="sm" onclick={lockApp}>Kunci</GlassButton>
				</div>
			{/if}
		</GlassCard>
	</section>

	<!-- Grup 3: Tampilan & Preferensi -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Tampilan & Efek
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<!-- Toggle Mode Gelap -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #5856D6;"
					>
						<span class="material-symbols-outlined text-xl">dark_mode</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Mode Gelap</p>
						<p class="text-xs text-on-surface-variant">Gunakan tema kontras gelap</p>
					</div>
				</div>
				<button
					type="button"
					class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden"
					style="background: {isDarkMode
						? 'var(--color-primary)'
						: 'var(--color-outline-variant)'};"
					onclick={toggleTheme}
					role="switch"
					aria-checked={isDarkMode}
					aria-label="Mode Gelap"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
						style="transform: {isDarkMode
							? 'translateX(20px)'
							: 'translateX(2px)'}; margin-top: 2px;"
					></span>
				</button>
			</div>

			<!-- Toggle Kurangi Transparansi -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #0070EB;"
					>
						<span class="material-symbols-outlined text-xl">contrast</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Kurangi Transparansi</p>
						<p class="text-xs text-on-surface-variant">Nonaktifkan efek blur latar</p>
					</div>
				</div>
				<button
					type="button"
					class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden"
					style="background: {reduceTransparency
						? 'var(--color-primary)'
						: 'var(--color-outline-variant)'};"
					onclick={toggleReduceTransparency}
					role="switch"
					aria-checked={reduceTransparency}
					aria-label="Kurangi Transparansi"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
						style="transform: {reduceTransparency
							? 'translateX(20px)'
							: 'translateX(2px)'}; margin-top: 2px;"
					></span>
				</button>
			</div>
		</GlassCard>
	</section>

	<!-- Grup 4: Performa & Benchmark Demo -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Pengujian & Benchmark
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #FF9500;"
					>
						<span class="material-symbols-outlined text-xl">bolt</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Demo Seeding Transaksi</p>
						<p class="text-xs text-on-surface-variant">Buat 1.000 data acak untuk uji beban</p>
					</div>
				</div>
				<GlassButton variant="secondary" size="sm" onclick={handleRunSeed} disabled={isSeeding}>
					{isSeeding ? 'Memproses...' : 'Seed Data'}
				</GlassButton>
			</div>

			{#if seedMessage}
				<div class="rounded-xl bg-surface-container-low p-2.5 text-xs text-primary">
					{seedMessage}
				</div>
			{/if}
		</GlassCard>
	</section>

	<!-- Grup 5: Informasi Aplikasi -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Bantuan & Info
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<a href="/settings/about" class="block">
				<GlassListRow
					title="Tentang Aplikasi"
					subtitle="Versi, arsitektur offline, dan statistik database"
					leadingIcon="info"
					leadingIconBg="var(--color-outline)"
					trailingValue="v0.0.1"
					chevron={true}
				/>
			</a>
			<a href="/dev/gallery" class="block">
				<GlassListRow
					title="Galeri Komponen Liquid Glass"
					subtitle="Showcase komponen UI iOS Stitch"
					leadingIcon="widgets"
					leadingIconBg="var(--color-primary)"
				/>
			</a>
			{#if isDevTools}
				<a href="/dev/ocr" class="block" data-testid="dev-ocr-button">
					<GlassListRow
						title="Uji Kamera OCR"
						subtitle="Inspeksi ML Kit & generator fixture struk"
						leadingIcon="document_scanner"
						leadingIconBg="#5856D6"
						chevron={true}
					/>
				</a>
			{/if}
		</GlassCard>
	</section>
</div>
