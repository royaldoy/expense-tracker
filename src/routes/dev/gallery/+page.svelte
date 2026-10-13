<script lang="ts">
	import AppHeader from '$lib/components/glass/AppHeader.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import GlassSkeleton from '$lib/components/glass/GlassSkeleton.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import {
		animationMode,
		hapticsEnabled,
		setAnimationModePreference,
		setHapticsPreference,
		triggerHapticImpact,
		triggerHapticNotification,
		triggerHapticSelection,
		type AnimationMode
	} from '$lib/stores/uiStore';
	import { animateCount } from '$lib/utils/motion';

	let isDarkMode = $state(false);
	let reduceTransparency = $state(false);

	let isSheetOpen = $state(false);
	let isDialogSheetOpen = $state(false);

	let demoCountDisplay = $state(1250000);
	let demoCountCancel: (() => void) | null = null;
	let demoSkeletonLoading = $state(false);
	let hapticToast = $state('');

	const motionModeOptions = [
		{ value: 'full', label: 'Penuh' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'off', label: 'Mati' }
	];

	function triggerDemoCount(target: number) {
		if (demoCountCancel) demoCountCancel();
		demoCountCancel = animateCount(demoCountDisplay, target, {
			durationMs: 500,
			onUpdate: (v) => {
				demoCountDisplay = v;
			}
		});
	}

	function triggerDemoSkeleton() {
		demoSkeletonLoading = true;
		setTimeout(() => {
			demoSkeletonLoading = false;
		}, 1200);
	}

	async function testHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'selection') {
		if (type === 'light' || type === 'medium' || type === 'heavy') {
			await triggerHapticImpact(type);
		} else if (type === 'success') {
			await triggerHapticNotification('success');
		} else {
			await triggerHapticSelection();
		}
		hapticToast = `Getaran ${type} dipicu!`;
		setTimeout(() => {
			hapticToast = '';
		}, 1500);
	}

	let segValue = $state('pemasukan');
	const segOptions = [
		{ value: 'pemasukan', label: 'Pemasukan', icon: 'south_west' },
		{ value: 'pengeluaran', label: 'Pengeluaran', icon: 'arrow_outward' },
		{ value: 'transfer', label: 'Transfer', icon: 'sync_alt' }
	];

	let seg2Value = $state('expense');
	const seg2Options = [
		{ value: 'expense', label: 'Pengeluaran', icon: 'arrow_outward' },
		{ value: 'income', label: 'Pemasukan', icon: 'south_west' }
	];

	let seg4Value = $state('summary');
	const seg4Options = [
		{ value: 'summary', label: 'Ringkasan', icon: 'pie_chart' },
		{ value: 'category', label: 'Kategori', icon: 'category' },
		{ value: 'wallet', label: 'Dompet', icon: 'account_balance_wallet' },
		{ value: 'trend', label: 'Tren', icon: 'trending_up' }
	];

	let rawKeypadValue = $state('75000');
	let rawPinValue = $state('1234');

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
</script>

<div class="pt-safe flex flex-col gap-6 px-4 py-6">
	<header class="flex items-center justify-between">
		<div>
			<a
				href="/"
				class="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
			>
				<span class="material-symbols-outlined text-sm">arrow_back</span>
				Kembali ke Beranda
			</a>
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Galeri Komponen Liquid Glass</h1>
			<p class="text-xs text-on-surface-variant">Showcase & Verifikasi Interaksi Komponen</p>
		</div>
	</header>

	<!-- Global Environment Controls -->
	<GlassCard class="flex flex-col gap-3 p-4">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Kontrol Lingkungan Tampilan
		</h2>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold select-none active:scale-95"
				style="background: var(--color-surface-container-high); border: 1px solid var(--color-outline-variant);"
				onclick={toggleTheme}
				data-testid="toggle-dark-mode"
			>
				<span class="material-symbols-outlined text-base">
					{isDarkMode ? 'light_mode' : 'dark_mode'}
				</span>
				Mode: {isDarkMode ? 'Dark' : 'Light'}
			</button>

			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold select-none active:scale-95"
				style="background: var(--color-surface-container-high); border: 1px solid var(--color-outline-variant);"
				onclick={toggleReduceTransparency}
				data-testid="toggle-reduce-transparency"
			>
				<span class="material-symbols-outlined text-base">
					{reduceTransparency ? 'blur_on' : 'blur_off'}
				</span>
				Transparansi: {reduceTransparency ? 'Dikurangi (Opak)' : 'Normal (Glass)'}
			</button>
		</div>
	</GlassCard>

	<!-- 0. AppHeader Showcase (Aturan Baru: Satu Judul Besar, Tanpa Subjudul, Maks 2 Ikon) -->
	<section class="flex flex-col gap-3">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			0. AppHeader (Standar Baru - Maksimal 2 Ikon, Tanpa Subjudul)
		</h2>

		<!-- Varian Beranda -->
		<GlassCard class="flex flex-col gap-2 p-3">
			<span class="text-[10px] font-bold text-outline uppercase"
				>Varian Beranda (Sapaan, Lonceng, Pengaturan)</span
			>
			<AppHeader
				title="Selamat Pagi"
				actions={[
					{ icon: 'notifications', label: 'Notifikasi', badgeCount: 2, testId: 'demo-bell' },
					{ icon: 'settings', label: 'Pengaturan', testId: 'demo-settings' }
				]}
			/>
		</GlassCard>

		<!-- Varian Transaksi -->
		<GlassCard class="flex flex-col gap-2 p-3">
			<span class="text-[10px] font-bold text-outline uppercase"
				>Varian Transaksi (Judul, Cari, Filter - Tanpa Tombol Tambah)</span
			>
			<AppHeader
				title="Transaksi"
				actions={[
					{ icon: 'search', label: 'Cari' },
					{ icon: 'tune', label: 'Filter', activeIndicator: true }
				]}
			/>
		</GlassCard>

		<!-- Varian Dompet -->
		<GlassCard class="flex flex-col gap-2 p-3">
			<span class="text-[10px] font-bold text-outline uppercase">Varian Dompet (Judul, Tambah)</span
			>
			<AppHeader title="Dompet" actions={[{ icon: 'add', label: 'Tambah' }]} />
		</GlassCard>

		<!-- Varian Laporan -->
		<GlassCard class="flex flex-col gap-2 p-3">
			<span class="text-[10px] font-bold text-outline uppercase"
				>Varian Laporan (Judul, Share + Pill Periode)</span
			>
			<AppHeader title="Laporan" actions={[{ icon: 'ios_share', label: 'Share' }]} />
			<div class="flex items-center gap-1.5 pt-1">
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-primary"
					style="background: var(--glass-pill-bg); border: 1px solid var(--glass-pill-border);"
				>
					<span class="material-symbols-outlined text-sm">calendar_month</span>
					<span>Oktober 2026</span>
					<span class="material-symbols-outlined text-xs">keyboard_arrow_down</span>
				</button>
			</div>
		</GlassCard>
	</section>

	<!-- 1. GlassCard Showcase -->
	<section class="flex flex-col gap-2.5">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			1. GlassCard (Regular vs Almost-Opaque)
		</h2>

		<GlassCard class="p-4">
			<h3 class="text-sm font-bold text-on-surface">Varian Regular</h3>
			<p class="text-xs text-on-surface-variant">
				Efek translusen blur 24px dengan specular edge glow di garis atas.
			</p>
		</GlassCard>

		<GlassCard variant="opaque" class="p-4">
			<h3 class="text-sm font-bold text-on-surface">Varian Opaque (Hampir Opak)</h3>
			<p class="text-xs text-on-surface-variant">
				Opasitas 94% dengan blur 12px untuk legibilitas kartu konten finansial.
			</p>
		</GlassCard>
	</section>

	<!-- 2. GlassButton Showcase -->
	<section class="flex flex-col gap-2.5">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			2. GlassButton (Varian & Ukuran)
		</h2>

		<div class="flex flex-wrap gap-2">
			<GlassButton variant="primary" size="md">Primary</GlassButton>
			<GlassButton variant="secondary" size="md">Secondary</GlassButton>
			<GlassButton variant="danger" size="md">Danger</GlassButton>
			<GlassButton variant="ghost" size="md">Ghost</GlassButton>
		</div>

		<div class="flex items-center gap-2">
			<GlassButton variant="primary" size="sm">Small</GlassButton>
			<GlassButton variant="primary" size="md">Medium</GlassButton>
			<GlassButton variant="primary" size="lg">Large</GlassButton>
			<GlassButton variant="primary" size="md" disabled={true}>Disabled</GlassButton>
		</div>
	</section>

	<!-- 3. GlassSegmented Showcase (Sliding Pill Thumb Beranimasi & Kontras Tinggi) -->
	<section class="flex flex-col gap-3">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			3. GlassSegmented Control (Sliding Thumb Beranimasi)
		</h2>

		<!-- Varian 2 Opsi -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-semibold text-outline">2 Opsi (Transaksi Baru)</span>
			<GlassSegmented options={seg2Options} bind:value={seg2Value} />
		</div>

		<!-- Varian 3 Opsi -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-semibold text-outline">3 Opsi (Filter Transaksi)</span>
			<GlassSegmented options={segOptions} bind:value={segValue} />
		</div>

		<!-- Varian 4 Opsi -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-semibold text-outline">4 Opsi (Tab Laporan)</span>
			<GlassSegmented options={seg4Options} bind:value={seg4Value} />
		</div>

		<!-- Kepatuhan Terhadap docs/design/tokens.md -->
		<GlassCard class="flex flex-col gap-1.5 p-3 text-xs">
			<div class="flex items-center gap-1.5 text-primary">
				<span class="material-symbols-outlined text-base">verified</span>
				<span class="font-bold">Kepatuhan Token Desain (docs/design/tokens.md)</span>
			</div>
			<ul class="list-disc space-y-0.5 pl-4 text-[11px] text-on-surface-variant">
				<li>
					<strong>Material Pill</strong>: Blur 16px (<code class="text-primary"
						>--glass-pill-blur</code
					>), background <code class="text-primary">--glass-pill-bg</code>
				</li>
				<li>
					<strong>Thumb Kontras Tinggi</strong>:
					<code class="text-primary">--color-surface-container-lowest</code> (Putih #FFF di Light / Kontainer
					Gelap di Dark)
				</li>
				<li>
					<strong>Tipografi Aktif</strong>: Teks tebal
					<code class="text-primary">font-bold text-on-surface</code>
					vs inaktif <code class="text-primary">font-medium</code>
				</li>
				<li>
					<strong>Transisi Halus</strong>: <code class="text-primary">translateX(...)</code> 200ms ease-out
				</li>
			</ul>
		</GlassCard>
	</section>

	<!-- 4. GlassListRow Showcase -->
	<section class="flex flex-col gap-2.5">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			4. GlassListRow
		</h2>
		<GlassCard variant="opaque">
			<GlassListRow
				title="Pengeluaran Belanja"
				subtitle="Supermarket • GoPay"
				leadingIcon="shopping_cart"
				leadingIconBg="var(--color-expense)"
				trailingValue="-Rp120.000"
				trailingValueColor="expense"
				chevron={true}
				showDivider={true}
			/>
			<GlassListRow
				title="Gaji Diterima"
				subtitle="BCA • Pendapatan"
				leadingIcon="payments"
				leadingIconBg="var(--color-income)"
				trailingValue="+Rp8.000.000"
				trailingValueColor="income"
				chevron={true}
				showDivider={true}
			/>
			<GlassListRow
				title="Transfer Antar Akun"
				subtitle="BCA ➔ Tunai"
				leadingIcon="sync_alt"
				leadingIconBg="var(--color-transfer)"
				trailingValue="Rp500.000"
				trailingValueColor="default"
				chevron={false}
				showDivider={false}
			/>
		</GlassCard>
	</section>

	<!-- 5. GlassKeypad Showcase (Generik) -->
	<section class="flex flex-col gap-2.5">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			5. GlassKeypad (Nominal & PIN Generik)
		</h2>

		<!-- Keypad Mode Currency -->
		<GlassCard class="p-3">
			<div class="mb-2 text-center">
				<p class="text-xs text-on-surface-variant">Mode Currency (Nominal)</p>
				<p class="text-2xl font-bold text-on-surface tabular-nums">
					{formatRupiah(parseInt(rawKeypadValue, 10) || 0)}
				</p>
			</div>
			<GlassKeypad mode="currency" bind:value={rawKeypadValue} />
		</GlassCard>

		<!-- Keypad Mode PIN -->
		<GlassCard class="p-3">
			<div class="mb-2 text-center">
				<p class="text-xs text-on-surface-variant">Mode PIN (6 Digit)</p>
				<div class="mt-1 flex justify-center gap-2">
					{#each [0, 1, 2, 3, 4, 5] as i (i)}
						<div
							class="h-3.5 w-3.5 rounded-full border transition-colors {i < rawPinValue.length
								? 'border-primary bg-primary'
								: 'border-outline bg-transparent'}"
						></div>
					{/each}
				</div>
			</div>
			<GlassKeypad mode="pin" bind:value={rawPinValue} maxLength={6} />
		</GlassCard>
	</section>

	<!-- 6. GlassSheet & Back Button Interaction Test -->
	<section class="flex flex-col gap-2.5">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			6. GlassSheet & Pengujian Back-Button
		</h2>
		<p class="text-xs text-on-surface-variant">
			Saat sheet terbuka, menekan tombol back peramban / Android wajib menutup sheet lebih dulu
			tanpa meninggalkan halaman.
		</p>

		<div class="flex gap-2">
			<GlassButton
				variant="primary"
				size="md"
				class="flex-1"
				onclick={() => (isSheetOpen = true)}
				data-testid="btn-open-sheet"
			>
				Buka GlassSheet Demo
			</GlassButton>

			<GlassButton
				variant="danger"
				size="md"
				class="flex-1"
				onclick={() => (isDialogSheetOpen = true)}
				data-testid="btn-open-delete-sheet"
			>
				Buka Dialog Hapus
			</GlassButton>
		</div>
	</section>

	<!-- 7. Sistem Animasi Terpadu & Haptics -->
	<section class="flex flex-col gap-3" data-testid="section-motion-system">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			7. Sistem Animasi & Haptics (@capacitor/haptics)
		</h2>

		<!-- Mode Animasi Selector -->
		<GlassCard class="flex flex-col gap-2 p-3">
			<span class="text-xs font-bold text-on-surface">Mode Animasi Global</span>
			<GlassSegmented
				options={motionModeOptions}
				value={$animationMode}
				onchange={(val) => setAnimationModePreference(val as AnimationMode)}
			/>
		</GlassCard>

		<!-- Count-up Saldo Simulation -->
		<GlassCard class="flex flex-col gap-2.5 p-4">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">Count-up Angka Moneter</span>
				<span class="text-[11px] text-on-surface-variant">Maks 600ms</span>
			</div>
			<div
				class="text-2xl font-bold tracking-tight text-primary tabular-nums"
				data-testid="gallery-countup-display"
			>
				{formatRupiah(demoCountDisplay)}
			</div>
			<div class="flex gap-2">
				<GlassButton
					variant="secondary"
					size="sm"
					class="flex-1"
					onclick={() => triggerDemoCount(0)}
				>
					Reset ke Rp0
				</GlassButton>
				<GlassButton
					variant="primary"
					size="sm"
					class="flex-1"
					onclick={() => triggerDemoCount(1250000)}
				>
					Hitung Rp1.250.000
				</GlassButton>
				<GlassButton
					variant="secondary"
					size="sm"
					class="flex-1"
					onclick={() => triggerDemoCount(3500000)}
				>
					Hitung Rp3.500.000
				</GlassButton>
			</div>
		</GlassCard>

		<!-- Skeleton Loader Simulation (Delay 150ms) -->
		<GlassCard class="flex flex-col gap-2.5 p-4">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">Skeleton Shimmer (Delay 150ms)</span>
				<GlassButton variant="secondary" size="sm" onclick={triggerDemoSkeleton}>
					Simulasi Muat (1.2 detik)
				</GlassButton>
			</div>
			{#if demoSkeletonLoading}
				<div class="flex flex-col gap-2">
					<GlassSkeleton height="h-4" width="w-24" delayMs={150} />
					<GlassSkeleton height="h-8" delayMs={150} />
					<GlassSkeleton height="h-8" delayMs={150} />
				</div>
			{:else}
				<p class="text-xs text-on-surface-variant">
					Data telah termuat. Tekan tombol di atas untuk mensimulasikan pemuatan dengan shimmer
					skeleton.
				</p>
			{/if}
		</GlassCard>

		<!-- Haptics Trigger Deck -->
		<GlassCard class="flex flex-col gap-2.5 p-4">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">Pengujian Umpan Balik Haptic</span>
				<span class="text-secondary text-[11px] font-semibold"
					>{hapticToast || ($hapticsEnabled ? 'Getaran Aktif' : 'Getaran Mati')}</span
				>
			</div>
			<div class="grid grid-cols-3 gap-2">
				<GlassButton variant="secondary" size="sm" onclick={() => testHaptic('light')}>
					Impact Light
				</GlassButton>
				<GlassButton variant="secondary" size="sm" onclick={() => testHaptic('medium')}>
					Impact Medium
				</GlassButton>
				<GlassButton variant="secondary" size="sm" onclick={() => testHaptic('heavy')}>
					Impact Heavy
				</GlassButton>
				<GlassButton variant="secondary" size="sm" onclick={() => testHaptic('selection')}>
					Selection Tab
				</GlassButton>
				<GlassButton variant="primary" size="sm" onclick={() => testHaptic('success')}>
					Sukses Simpan
				</GlassButton>
				<GlassButton
					variant="danger"
					size="sm"
					onclick={() => setHapticsPreference(!$hapticsEnabled)}
				>
					Toggle Haptic
				</GlassButton>
			</div>
		</GlassCard>
	</section>
</div>

<!-- Demo GlassSheet Standar -->
<GlassSheet
	bind:isOpen={isSheetOpen}
	title="GlassSheet Bottom Sheet"
	subtitle="Pengujian history.pushState & popstate"
>
	<div class="py-3">
		<p class="text-sm text-on-surface-variant">
			Ini adalah lembar bawah GlassSheet dengan efek Liquid Glass. Silakan tekan tombol back browser
			untuk menguji penutupan otomatis.
		</p>
		<div class="mt-5 flex justify-end">
			<GlassButton
				variant="secondary"
				size="md"
				onclick={() => (isSheetOpen = false)}
				data-testid="btn-close-sheet"
			>
				Tutup Sheet
			</GlassButton>
		</div>
	</div>
</GlassSheet>

<!-- Demo GlassSheet Varian Dialog (Konfirmasi Hapus) -->
<GlassSheet bind:isOpen={isDialogSheetOpen} variant="dialog" title="Konfirmasi Hapus Data">
	<div class="py-2">
		<p class="text-sm text-on-surface-variant">
			Apakah Anda yakin ingin menghapus elemen ini secara permanen?
		</p>
		<div class="mt-6 flex gap-3">
			<GlassButton
				variant="secondary"
				size="md"
				class="flex-1"
				onclick={() => (isDialogSheetOpen = false)}
				data-testid="btn-cancel-delete"
			>
				Batal
			</GlassButton>
			<GlassButton
				variant="danger"
				size="md"
				class="flex-1"
				onclick={() => (isDialogSheetOpen = false)}
				data-testid="btn-confirm-delete"
			>
				Hapus
			</GlassButton>
		</div>
	</div>
</GlassSheet>
