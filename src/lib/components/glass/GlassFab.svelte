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
				// Scroll ke bawah (> 40px dari atas) -> sembunyikan FAB
				if (currentScrollY > lastScrollY && currentScrollY > 40) {
					isVisible = false;
				} else if (currentScrollY < lastScrollY) {
					// Scroll ke atas -> munculkan kembali FAB
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
	style="bottom: calc(94px + env(safe-area-inset-bottom, 0px));"
>
	<div class="relative flex w-full max-w-[364px] justify-end">
		<button
			type="button"
			class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-xl select-none active:scale-90 {isVisible
				? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
				: 'pointer-events-none translate-y-20 scale-75 opacity-0'}"
			style="
				background: var(--glass-fab-bg, #0070eb);
				backdrop-filter: blur(var(--glass-dock-blur, 24px));
				-webkit-backdrop-filter: blur(var(--glass-dock-blur, 24px));
				border: 1px solid var(--glass-fab-border, rgba(255, 255, 255, 0.4));
				box-shadow: var(--glass-fab-shadow, 0 10px 24px -4px rgba(0, 112, 235, 0.45));
				transition:
					transform var(--motion-duration-normal, 250ms) var(--motion-ease-spring, cubic-bezier(0.34, 1.35, 0.64, 1)),
					opacity var(--motion-duration-fast, 150ms) ease;
			"
			onclick={handleClick}
			aria-label={t('nav.aksiCepat')}
			data-testid="glass-fab"
		>
			<!-- Specular sheen edge at top of circular button -->
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-t-full opacity-35"
				style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, transparent 100%);"
			></div>

			<span
				class="material-symbols-outlined text-[32px] leading-none font-semibold text-white select-none"
			>
				add
			</span>
		</button>
	</div>
</div>
