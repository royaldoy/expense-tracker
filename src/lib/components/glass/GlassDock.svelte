<script lang="ts">
	import { page } from '$app/state';
	import { triggerHapticSelection } from '$lib/stores/uiStore';
	import t from '../../i18n';

	const tabs = [
		{ href: '/', icon: 'home', label: t('nav.beranda'), index: 0 },
		{ href: '/transactions', icon: 'receipt_long', label: t('nav.transaksi'), index: 1 },
		{ href: '/wallets', icon: 'account_balance_wallet', label: t('nav.dompet'), index: 2 },
		{ href: '/laporan', icon: 'pie_chart', label: t('nav.laporan'), index: 3 }
	];

	let activeTabIndex = $derived.by(() => {
		const currentPath = page.url.pathname;
		if (currentPath === '/') return 0;
		if (currentPath.startsWith('/transactions') || currentPath.startsWith('/transaksi')) return 1;
		if (currentPath.startsWith('/wallets') || currentPath.startsWith('/dompet')) return 2;
		if (currentPath.startsWith('/laporan') || currentPath.startsWith('/reports')) return 3;
		return -1;
	});

	function handleTabClick(index: number) {
		if (activeTabIndex !== index) {
			triggerHapticSelection();
		}
	}
</script>

<div
	class="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
	style="bottom: calc(16px + env(safe-area-inset-bottom, 0px));"
>
	<div class="relative w-full max-w-[364px]">
		<!-- Ambient static radial gradient di belakang dock (tanpa filter blur besar demi performa) -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute -bottom-2 left-1/2 -z-10 h-14 w-64 -translate-x-1/2 rounded-full opacity-60"
			style="background: radial-gradient(ellipse at center, rgba(0, 112, 235, 0.18) 0%, transparent 70%);"
		></div>

		<!-- svelte-ignore a11y_no_redundant_roles -->
		<nav
			class="glass-dock-nav glass-float pointer-events-auto relative flex h-16 w-full items-center rounded-[32px] p-1.5 select-none"
			role="navigation"
			aria-label="Navigasi Utama"
			data-testid="glass-dock"
		>
			<!-- Specular light edge catch di tepi atas -->
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-8 top-0 h-px"
				style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%);"
			></div>

			<!-- Specular rim highlight di tepi bawah -->
			<div
				aria-hidden="true"
				class="pointer-events-none absolute bottom-0 left-1/2 h-[1.5px] w-36 -translate-x-1/2 rounded-full opacity-70"
				style="background: linear-gradient(90deg, transparent 0%, rgba(0, 112, 235, 0.6) 50%, transparent 100%);"
			></div>

			<!-- CSS Track dengan padding: Indikator & Tab berada di container yang sama persis -->
			<div class="relative flex h-full w-full items-center">
				<!-- Indikator Aktif: lebar calc(100% / 4), transform: translateX(calc(var(--i) * 100%)) -->
				{#if activeTabIndex >= 0}
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-y-0 rounded-[26px] border"
						style="
							width: calc(100% / 4);
							left: 0;
							--i: {activeTabIndex};
							transform: translateX(calc(var(--i) * 100%));
							transition: transform var(--motion-duration-normal, 250ms)
								var(--motion-ease-spring, cubic-bezier(0.34, 1.35, 0.64, 1));
							background: var(--glass-dock-indicator-bg);
							border-color: var(--glass-dock-indicator-border);
							box-shadow: var(--glass-dock-indicator-shadow);
						"
						data-testid="dock-active-indicator"
					></div>
				{/if}

				<!-- 4 Tab Navigasi: masing-masing selebar calc(100% / 4) -->
				{#each tabs as tab (tab.href)}
					{@const active = activeTabIndex === tab.index}
					<a
						href={tab.href}
						onclick={() => handleTabClick(tab.index)}
						style="width: calc(100% / 4);"
						class="relative z-10 flex h-full flex-col items-center justify-center rounded-2xl py-1 transition-transform duration-150 select-none active:scale-95 {active
							? 'font-bold text-primary'
							: 'font-medium text-on-surface-variant hover:text-on-surface'}"
						aria-current={active ? 'page' : undefined}
						data-testid="dock-tab-{tab.index}"
					>
						<span
							class="material-symbols-outlined text-[22px] transition-transform duration-150 {active
								? 'scale-105'
								: ''}"
							style="font-variation-settings: 'FILL' {active ? 1 : 0};"
						>
							{tab.icon}
						</span>
						<span class="text-[10px] leading-tight tracking-tight">{tab.label}</span>
					</a>
				{/each}
			</div>
		</nav>
	</div>
</div>
