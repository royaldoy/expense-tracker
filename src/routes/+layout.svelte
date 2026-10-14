<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import GlassDock from '$lib/components/glass/GlassDock.svelte';
	import GlassFab from '$lib/components/glass/GlassFab.svelte';
	import QuickActionSheet from '$lib/components/glass/QuickActionSheet.svelte';
	import PinLockScreen from '$lib/components/security/PinLockScreen.svelte';
	import { refreshUnreadNotificationsCount } from '$lib/stores/notificationStore';
	import { isLocked, initSecurityStore } from '$lib/stores/securityStore';
	import { animationMode, initUiStore } from '$lib/stores/uiStore';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let quickActionOpen = $state(false);
	let isKeyboardOpen = $state(false);

	/**
	 * Rute layar penuh: form transaksi, form dompet, scan struk, OCR dev, dan onboarding
	 */
	function isFullscreenRoute(pathname: string): boolean {
		if (pathname.startsWith('/onboarding')) return true;
		if (pathname.startsWith('/transfer')) return true;
		if (pathname.startsWith('/scan')) return true;
		if (pathname === '/dev/ocr') return true;

		// Form transaksi baru dan edit
		if (pathname === '/transactions/new' || pathname === '/transaksi/baru') return true;
		if (/^\/(transactions|transaksi)\/[^/]+\/edit\/?$/.test(pathname)) return true;

		// Form dompet baru dan edit
		if (pathname === '/wallets/new' || pathname === '/dompet/baru') return true;
		if (/^\/(wallets|dompet)\/[^/]+\/edit\/?$/.test(pathname)) return true;

		return false;
	}

	let isFullscreen = $derived(isFullscreenRoute(page.url.pathname) || $isLocked);
	let showNavigation = $derived(!isFullscreen && !isKeyboardOpen);

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

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Deteksi Virtual Keyboard via visualViewport & fokus input
		const vv = window.visualViewport;

		function checkKeyboard() {
			if (vv) {
				const heightDiff = window.innerHeight - vv.height;
				if (heightDiff > 120) {
					isKeyboardOpen = true;
					return;
				}
			}
			const activeEl = document.activeElement;
			const isInputActive =
				activeEl instanceof HTMLInputElement ||
				activeEl instanceof HTMLTextAreaElement ||
				activeEl?.hasAttribute('contenteditable');

			if (!isInputActive) {
				isKeyboardOpen = false;
			}
		}

		function handleFocusIn(e: FocusEvent) {
			const target = e.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				(target instanceof HTMLElement && target.hasAttribute('contenteditable'))
			) {
				isKeyboardOpen = true;
			}
		}

		function handleFocusOut() {
			setTimeout(() => {
				checkKeyboard();
			}, 120);
		}

		if (vv) {
			vv.addEventListener('resize', checkKeyboard);
		}
		window.addEventListener('focusin', handleFocusIn);
		window.addEventListener('focusout', handleFocusOut);

		return () => {
			if (vv) vv.removeEventListener('resize', checkKeyboard);
			window.removeEventListener('focusin', handleFocusIn);
			window.removeEventListener('focusout', handleFocusOut);
		};
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
		class="relative mx-auto min-h-screen w-full max-w-[420px] {showNavigation
			? 'pb-32'
			: 'pb-safe'}"
		inert={$isLocked}
		aria-hidden={$isLocked}
	>
		{@render children()}
	</main>

	<!-- Floating Glass FAB & Glass Dock -->
	{#if showNavigation}
		<GlassFab onaction={() => (quickActionOpen = true)} />
		<GlassDock />
	{/if}

	<!-- Quick Action Sheet -->
	<QuickActionSheet bind:isOpen={quickActionOpen} />

	<!-- Fullscreen Overlay PinLockScreen -->
	<PinLockScreen />
</div>
