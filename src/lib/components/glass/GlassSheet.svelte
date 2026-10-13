<script lang="ts">
	import type { Snippet } from 'svelte';

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

	function handlePopState() {
		// Jika tombol back ditekan saat sheet terbuka, tutup sheet
		if (isOpen) {
			hasPushedState = false;
			isOpen = false;
			if (onclose) onclose();
		}
	}

	function close() {
		if (isOpen) {
			isOpen = false;
			if (hasPushedState && typeof window !== 'undefined') {
				hasPushedState = false;
				window.history.back();
			}
			if (onclose) onclose();
		}
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
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/45 backdrop-blur-[4px] transition-opacity duration-200"
			data-testid="glass-sheet-backdrop"
			onclick={close}
		></div>

		<!-- Sheet / Dialog Content Container -->
		<div
			class="relative z-10 w-full max-w-[420px] transition-transform duration-200 ease-out {variant ===
			'dialog'
				? 'rounded-3xl p-6 shadow-2xl'
				: 'pb-safe max-h-[calc(100vh-max(44px,env(safe-area-inset-top,0px))-16px)] overflow-y-auto rounded-t-[32px] px-6 pt-3 shadow-2xl'}"
			style="
				background: var(--glass-sheet-bg);
				backdrop-filter: blur(var(--glass-sheet-blur));
				-webkit-backdrop-filter: blur(var(--glass-sheet-blur));
				border: 1px solid var(--glass-sheet-border);
				box-shadow: var(--glass-sheet-shadow);
			"
			data-testid="glass-sheet"
		>
			{#if variant === 'sheet'}
				<!-- Sheet Drag Handle Indicator -->
				<div
					class="mx-auto my-2 h-1 w-12 rounded-full"
					style="background: var(--color-outline-variant);"
				></div>
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
