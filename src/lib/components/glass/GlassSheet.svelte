<script lang="ts">
	import type { Snippet } from 'svelte';
	import { triggerHapticImpact } from '$lib/stores/uiStore';

	interface Props {
		isOpen: boolean;
		title?: string;
		subtitle?: string;
		variant?: 'sheet' | 'dialog';
		onclose?: () => void;
		children?: Snippet;
	}

	let {
		isOpen = $bindable(false),
		title,
		subtitle,
		variant = 'sheet',
		onclose,
		children
	}: Props = $props();

	let hasPushedState = false;
	let stateToken = '';

	// State gesture tarik-untuk-tutup (pull-to-close)
	let dragY = $state(0);
	let isDragging = $state(false);
	let startY = 0;
	let startTime = 0;
	let sheetContainerEl: HTMLDivElement | null = $state(null);

	function handlePopState() {
		// Jika tombol back ditekan saat sheet terbuka, tutup sheet
		if (isOpen) {
			hasPushedState = false;
			isOpen = false;
			dragY = 0;
			isDragging = false;
			if (onclose) onclose();
		}
	}

	function close() {
		if (isOpen) {
			isOpen = false;
			dragY = 0;
			isDragging = false;
			// Penutupan lewat jalur history yang sama dengan tombol back
			if (hasPushedState && typeof window !== 'undefined') {
				hasPushedState = false;
				window.history.back();
			}
			if (onclose) onclose();
		}
	}

	function handlePointerDown(e: PointerEvent) {
		if (variant !== 'sheet') return;
		// Tarik-untuk-tutup hanya dari grabber/header atau saat isi sheet berada di scrollTop <= 0
		if (sheetContainerEl && sheetContainerEl.scrollTop > 0) return;

		isDragging = true;
		startY = e.clientY;
		startTime = Date.now();
		dragY = 0;

		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture?.(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dy = e.clientY - startY;
		// Hanya izinkan drag ke bawah (dy > 0), dengan resistansi jika ditarik ke atas
		dragY = dy > 0 ? dy : dy * 0.15;
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;

		const target = e.currentTarget as HTMLElement;
		target.releasePointerCapture?.(e.pointerId);

		const elapsed = Date.now() - startTime;
		const distance = e.clientY - startY;
		const velocity = distance / Math.max(1, elapsed); // px/ms

		// Ambang jarak (>90px) ATAU kecepatan lepas (>0.45 px/ms)
		if (distance > 90 || velocity > 0.45) {
			triggerHapticImpact('light');
			close();
		} else {
			// Membal kembali ke posisi semula (gerak pegas)
			dragY = 0;
		}
	}

	function handlePointerCancel() {
		isDragging = false;
		dragY = 0;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		if (isOpen) {
			// Cegah scroll pada body
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';

			// Push state ke riwayat peramban untuk mencegat tombol back
			if (!hasPushedState) {
				stateToken = 'glass_sheet_' + Math.random().toString(36).slice(2, 9);
				window.history.pushState({ glassSheetToken: stateToken }, '');
				hasPushedState = true;
			}

			window.addEventListener('popstate', handlePopState);

			return () => {
				document.body.style.overflow = originalOverflow;
				window.removeEventListener('popstate', handlePopState);
			};
		} else {
			hasPushedState = false;
			dragY = 0;
			isDragging = false;
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-60 flex {variant === 'dialog'
			? 'items-center justify-center p-4'
			: 'items-end justify-center'}"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop (Opacity meredup saat sheet ditarik ke bawah) -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/45 backdrop-blur-[4px] transition-opacity duration-200"
			style="opacity: {Math.max(0, 1 - dragY / 300)};"
			data-testid="glass-sheet-backdrop"
			onclick={close}
		></div>

		<!-- Sheet / Dialog Content Container -->
		<div
			bind:this={sheetContainerEl}
			class="relative z-10 w-full max-w-[420px] {variant === 'dialog'
				? 'rounded-3xl p-6 shadow-2xl transition-all duration-200'
				: 'pb-safe max-h-[calc(100vh-max(44px,env(safe-area-inset-top,0px))-16px)] overflow-y-auto rounded-t-[32px] px-6 pt-3 shadow-2xl'}"
			style="
				background: var(--glass-sheet-bg);
				backdrop-filter: blur(var(--glass-sheet-blur));
				-webkit-backdrop-filter: blur(var(--glass-sheet-blur));
				border: 1px solid var(--glass-sheet-border);
				box-shadow: var(--glass-sheet-shadow);
				transform: translateY({Math.max(0, dragY)}px);
				transition: {isDragging
				? 'none'
				: 'transform var(--motion-duration-moderate) var(--motion-ease-spring)'};
			"
			data-testid="glass-sheet"
		>
			{#if variant === 'sheet'}
				<!-- Grabber / Drag Handle Area untuk Gesture Tarik-untuk-Tutup -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="mx-auto flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
					onpointerdown={handlePointerDown}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerCancel}
					data-testid="glass-sheet-grabber"
				>
					<div
						class="h-1.5 w-12 rounded-full transition-all duration-150 {isDragging
							? 'w-16 bg-primary'
							: ''}"
						style="background: {isDragging
							? 'var(--color-primary)'
							: 'var(--color-outline-variant)'};"
					></div>
				</div>
			{/if}

			{#if title || subtitle}
				<div class="mb-4 flex items-start justify-between gap-4 pt-1">
					<div>
						{#if title}
							<h3 class="text-lg font-bold tracking-tight text-on-surface">
								{title}
							</h3>
						{/if}
						{#if subtitle}
							<p class="text-xs text-on-surface-variant">
								{subtitle}
							</p>
						{/if}
					</div>
					<button
						type="button"
						class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
						data-testid="glass-sheet-close"
						onclick={close}
						aria-label="Tutup"
					>
						<span class="material-symbols-outlined text-xl">close</span>
					</button>
				</div>
			{/if}

			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
