<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import GlassTabBar from '$lib/components/glass/GlassTabBar.svelte';
	import QuickActionSheet from '$lib/components/glass/QuickActionSheet.svelte';
	import PinLockScreen from '$lib/components/security/PinLockScreen.svelte';
	import { refreshUnreadNotificationsCount } from '$lib/stores/notificationStore';
	import { isLocked, initSecurityStore } from '$lib/stores/securityStore';
	import { animationMode, initUiStore } from '$lib/stores/uiStore';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let quickActionOpen = $state(false);

	// Sembunyikan tab bar pada rute onboarding, saat aplikasi terkunci, atau alur fullscreen tertentu
	let hideTabBar = $derived(page.url.pathname.startsWith('/onboarding') || $isLocked);

	// View Transitions API (Hanya aktif bila pathname berubah dan mode animasi aktif)
	onNavigate((navigation) => {
		if (get(animationMode) === 'off') return;
		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
		)
			return;
		if (typeof document === 'undefined' || !document.startViewTransition) return;

		// Tombol back yang hanya menutup sheet atau perubahan parameter dalam satu rute tidak memicu transisi halaman
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(async () => {
		await Promise.all([initUiStore(), initSecurityStore(), refreshUnreadNotificationsCount()]);
		if (typeof window !== 'undefined') {
			const { transactionService } = await import('$lib/db/transactionService');
			(window as unknown as { rebuildBalances: () => Promise<unknown> }).rebuildBalances = () =>
				transactionService.rebuildBalances();

			const { recurringService } = await import('$lib/services/recurringService');
			(window as unknown as { runDueRecurring: () => Promise<unknown> }).runDueRecurring = () =>
				recurringService.runDueRecurring();

			const { notificationService } = await import('$lib/services/notificationService');
			(window as unknown as { syncNotifications: () => Promise<unknown> }).syncNotifications = () =>
				notificationService.syncNotifications();

			// Eksekusi jadwal berulang yang jatuh tempo secara idempoten di latar belakang saat aplikasi dibuka
			recurringService.runDueRecurring().catch((err) => {
				console.error('Gagal menjalankan jadwal berulang pada inisialisasi aplikasi:', err);
			});

			// Sinkronisasi pusat notifikasi dan penjadwalan lokal saat aplikasi dibuka
			notificationService.syncNotifications().catch((err) => {
				console.error('Gagal sinkronisasi notifikasi pada inisialisasi aplikasi:', err);
			});
		}
	});
</script>

<svelte:head>
	<title>Money Tracker</title>
</svelte:head>

<div class="relative min-h-screen bg-surface font-sans text-on-surface antialiased">
	<!-- Ambient Background Orbs -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
		<!-- Orb 1: Sky Blue (Top Right) -->
		<div
			class="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-[96px]"
			style="background: var(--color-ambient-orb-1);"
		></div>
		<!-- Orb 2: Emerald Green (Middle Left) -->
		<div
			class="absolute top-1/3 -left-28 h-80 w-80 rounded-full blur-[80px]"
			style="background: var(--color-ambient-orb-2);"
		></div>
		<!-- Orb 3: Royal Lavender (Bottom Right) -->
		<div
			class="absolute -right-20 bottom-12 h-72 w-72 rounded-full blur-[72px]"
			style="background: var(--color-ambient-orb-3);"
		></div>
	</div>

	<!-- Konten Utama Halaman (inert saat terkunci) -->
	<main
		class="relative mx-auto min-h-screen w-full max-w-[420px] {hideTabBar ? 'pb-safe' : 'pb-28'}"
		inert={$isLocked}
		aria-hidden={$isLocked}
	>
		{@render children()}
	</main>

	<!-- Floating Glass Tab Bar -->
	{#if !hideTabBar}
		<GlassTabBar onquickaction={() => (quickActionOpen = true)} />
	{/if}

	<!-- Quick Action Sheet -->
	<QuickActionSheet bind:isOpen={quickActionOpen} />

	<!-- Fullscreen Overlay PinLockScreen -->
	<PinLockScreen />
</div>
