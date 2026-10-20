<script lang="ts">
	import { onMount } from 'svelte';
	import { triggerHapticImpact } from '$lib/stores/uiStore';
	import t from '../../i18n';

	interface Props {
		onaction: () => void;
		isVisible?: boolean;
	}

	let { onaction, isVisible = $bindable(true) }: Props = $props();

	let lastScrollY = 0;
	let ticking = false;

	function handleScroll() {
		if (typeof window === 'undefined') return;
		if (!ticking) {
			window.requestAnimationFrame(() => {
				const currentScrollY = window.scrollY;
				// Scroll ke bawah (> 40px dari atas) -> sembunyikan pill
				if (currentScrollY > lastScrollY && currentScrollY > 40) {
					isVisible = false;
				} else if (currentScrollY < lastScrollY) {
					// Scroll ke atas -> munculkan kembali pill
					isVisible = true;
				}
				lastScrollY = Math.max(0, currentScrollY);
				ticking = false;
			});
			ticking = true;
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			lastScrollY = window.scrollY;
			window.addEventListener('scroll', handleScroll, { passive: true });
			return () => {
				window.removeEventListener('scroll', handleScroll);
			};
		}
	});

	function handleClick() {
		triggerHapticImpact('light');
		onaction();
	}
</script>

<div
	class="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
	style="bottom: calc(90px + env(safe-area-inset-bottom, 0px));"
>
	<button
		type="button"
		class="glass-float pointer-events-auto relative flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 select-none active:scale-95 {isVisible
			? 'translate-y-0 scale-100 opacity-100'
			: 'pointer-events-none translate-y-8 scale-90 opacity-0'}"
		style="
			transition:
				transform var(--motion-duration-normal, 250ms)
					var(--motion-ease-spring, cubic-bezier(0.34, 1.35, 0.64, 1)),
				opacity var(--motion-duration-fast, 150ms) ease;
		"
		onclick={handleClick}
		aria-label={t('nav.catat')}
		data-testid="glass-pill"
	>
		<!-- Specular light edge catch di tepi atas pill -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full opacity-70"
			style="background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%);"
		></div>

		<span class="material-symbols-outlined text-[20px] font-bold text-primary select-none">
			add
		</span>
		<span class="text-xs font-bold tracking-tight text-on-surface select-none">
			{t('nav.catat')}
		</span>
	</button>
</div>
