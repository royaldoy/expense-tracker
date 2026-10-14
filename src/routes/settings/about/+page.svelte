<script lang="ts">
	import { onMount } from 'svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { settingService, type StorageMetrics } from '$lib/services/settingService';

	let metrics = $state<StorageMetrics | null>(null);
	let isLoadingMetrics = $state(true);

	function formatBytes(bytes?: number): string {
		if (bytes === undefined || bytes === null || isNaN(bytes)) return '-';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	onMount(async () => {
		try {
			metrics = await settingService.getStorageMetrics();
		} catch {
			// fallback
		} finally {
			isLoadingMetrics = false;
		}
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top App Bar -->
	<header class="flex items-center gap-3 pt-2">
		<a
			href="/settings"
			class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
			aria-label="Kembali ke Pengaturan"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</a>
		<div>
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Tentang Aplikasi</h1>
			<p class="text-xs text-on-surface-variant">Informasi Sistem, Privasi & Arsitektur</p>
		</div>
	</header>

	<!-- Header Banner Aplikasi -->
	<GlassCard variant="regular" class="flex flex-col items-center p-6 text-center">
		<div
			class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md"
			style="background: linear-gradient(135deg, var(--color-primary), #5856D6);"
		>
			<span class="material-symbols-outlined text-3xl">account_balance_wallet</span>
		</div>
		<h2 class="mt-3 text-lg font-bold text-on-surface">Money Tracker</h2>
		<p class="text-xs font-semibold text-primary">Versi 0.0.1 (Fase 6)</p>
		<p class="mt-2 max-w-[280px] text-xs leading-relaxed text-on-surface-variant">
			Aplikasi pencatat keuangan pribadi multi-dompet berorientasi privasi penuh, dirancang dengan
			gaya iOS Liquid Glass.
		</p>
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			<span
				class="rounded-lg px-2.5 py-1 text-[11px] font-bold text-primary"
				style="background: var(--glass-pill-bg);"
			>
				Offline-First
			</span>
			<span
				class="rounded-lg px-2.5 py-1 text-[11px] font-bold text-income"
				style="background: var(--color-income-container);"
			>
				100% Data Lokal
			</span>
			<span
				class="rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-bold text-on-surface-variant"
			>
				Bebas Iklan
			</span>
		</div>
	</GlassCard>

	<!-- Bagian 1: Komitmen Privasi & Keamanan Data -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Komitmen Privasi & Keamanan
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<div class="flex items-start gap-3.5 p-4">
				<span class="material-symbols-outlined mt-0.5 text-xl text-income">verified_user</span>
				<div>
					<p class="text-sm font-semibold text-on-surface">Tanpa Server & Tanpa Pelacak</p>
					<p class="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
						Seluruh transaksi, saldo dompet, dan mutasi keuangan Anda 100% disimpan di dalam basis
						data lokal peramban (IndexedDB). Tidak ada data yang dikirim ke server luar atau pihak
						ketiga.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3.5 p-4">
				<span class="material-symbols-outlined mt-0.5 text-xl text-primary">lock</span>
				<div>
					<p class="text-sm font-semibold text-on-surface">Kriptografi Standar Industri</p>
					<p class="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
						PIN keamanan Anda dilindungi dengan algoritma Web Crypto PBKDF2 (SHA-256, 100.000
						iterasi, garam 16-byte). Tidak ada PIN dalam bentuk teks polos yang tersimpan.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3.5 p-4">
				<span class="material-symbols-outlined mt-0.5 text-xl text-expense">wifi_off</span>
				<div>
					<p class="text-sm font-semibold text-on-surface">Dapat Digunakan Sepenuhnya Offline</p>
					<p class="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
						Bekerja tanpa memerlukan koneksi internet aktif. Semua operasi pencatatan, kalkulasi
						laporan, dan pencadangan berjalan secara instan langsung di perangkat Anda.
					</p>
				</div>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 2: Metrik Penyimpanan Lokal (IndexedDB) -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Statistik Penyimpanan Lokal
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="grid grid-cols-2 gap-2.5">
				<div class="rounded-xl bg-surface-container-low p-3">
					<p class="text-[11px] font-semibold text-on-surface-variant">Dompet Aktif</p>
					<p
						class="mt-1 text-base font-bold text-on-surface tabular-nums"
						data-testid="metric-wallets"
					>
						{isLoadingMetrics ? '...' : (metrics?.walletsCount ?? 0)}
					</p>
				</div>
				<div class="rounded-xl bg-surface-container-low p-3">
					<p class="text-[11px] font-semibold text-on-surface-variant">Kategori Keuangan</p>
					<p
						class="mt-1 text-base font-bold text-on-surface tabular-nums"
						data-testid="metric-categories"
					>
						{isLoadingMetrics ? '...' : (metrics?.categoriesCount ?? 0)}
					</p>
				</div>
				<div class="rounded-xl bg-surface-container-low p-3">
					<p class="text-[11px] font-semibold text-on-surface-variant">Transaksi Tercatat</p>
					<p
						class="mt-1 text-base font-bold text-on-surface tabular-nums"
						data-testid="metric-transactions"
					>
						{isLoadingMetrics ? '...' : (metrics?.transactionsCount ?? 0)}
					</p>
				</div>
				<div class="rounded-xl bg-surface-container-low p-3">
					<p class="text-[11px] font-semibold text-on-surface-variant">Target Anggaran</p>
					<p
						class="mt-1 text-base font-bold text-on-surface tabular-nums"
						data-testid="metric-budgets"
					>
						{isLoadingMetrics ? '...' : (metrics?.budgetsCount ?? 0)}
					</p>
				</div>
			</div>

			<div class="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-3 text-xs">
				<div class="flex items-center justify-between">
					<span class="font-medium text-on-surface-variant">Estimasi Ukuran Data:</span>
					<span class="font-bold text-on-surface tabular-nums">
						{formatBytes(metrics?.usageBytes)}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="font-medium text-on-surface-variant">Kapasitas Peramban:</span>
					<span class="font-bold text-on-surface tabular-nums">
						{formatBytes(metrics?.quotaBytes)}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="font-medium text-on-surface-variant">Persistensi Storage:</span>
					<span class="font-semibold text-on-surface">
						{metrics?.isPersisted ? 'Permanen (Persisted)' : 'Standar Peramban'}
					</span>
				</div>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 3: Arsitektur & Tumpukan Teknologi -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Teknologi & Arsitektur
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<div class="flex items-center justify-between p-3.5">
				<div>
					<p class="text-xs font-bold text-on-surface">Svelte 5 & SvelteKit</p>
					<p class="text-[11px] text-on-surface-variant">
						Runes reactivity, Single Page Application
					</p>
				</div>
				<span class="text-xs font-semibold text-primary">SPA Static</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<div>
					<p class="text-xs font-bold text-on-surface">Dexie.js (IndexedDB)</p>
					<p class="text-[11px] text-on-surface-variant">ACID Transactions & Balances Rebuilding</p>
				</div>
				<span class="text-xs font-semibold text-primary">v4</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<div>
					<p class="text-xs font-bold text-on-surface">Valibot</p>
					<p class="text-[11px] text-on-surface-variant">Validasi skema input & migrasi cadangan</p>
				</div>
				<span class="text-xs font-semibold text-primary">v1.5</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<div>
					<p class="text-xs font-bold text-on-surface">Tailwind CSS & Liquid Glass</p>
					<p class="text-[11px] text-on-surface-variant">
						Stitch iOS Liquid Glass token architecture
					</p>
				</div>
				<span class="text-xs font-semibold text-primary">v4</span>
			</div>
		</GlassCard>
	</section>
</div>
