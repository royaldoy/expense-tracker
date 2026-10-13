<script lang="ts">
	import { page } from '$app/state';
	import { triggerHapticImpact, triggerHapticSelection } from '$lib/stores/uiStore';
	import t from '../../i18n';

	interface Props {
		onquickaction?: () => void;
	}

	let { onquickaction }: Props = $props();

	const tabs = [
		{ href: '/', icon: 'home', label: t('nav.beranda'), index: 0 },
		{ href: '/transactions', icon: 'receipt_long', label: t('nav.transaksi'), index: 1 }
	];

	const rightTabs = [
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

	function handleFabClick() {
		triggerHapticImpact('light');
		if (onquickaction) onquickaction();
	}
</script>

<div class="pb-safe pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
	<nav
		class="glass-tab-bar-nav pointer-events-auto relative flex h-16 w-full max-w-[390px] items-center justify-between rounded-full px-3 shadow-lg"
		style="
			background: var(--glass-tabbar-bg);
			backdrop-filter: blur(var(--glass-tabbar-blur));
			-webkit-backdrop-filter: blur(var(--glass-tabbar-blur));
			border: 1px solid var(--glass-tabbar-border);
			box-shadow: var(--glass-tabbar-shadow);
		"
		aria-label="Navigasi Utama"
	>
		<!-- Specular light edge catch di tepi atas -->
		<div
			class="pointer-events-none absolute inset-x-8 top-0 h-px"
			style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);"
		></div>

		<!-- Left Tabs Cluster dengan Sliding Pill Indicator -->
		<div class="relative flex flex-1 items-center justify-around py-1">
			{#if activeTabIndex === 0 || activeTabIndex === 1}
				<div
					class="pointer-events-none absolute top-1 bottom-1 w-1/2 rounded-full transition-transform duration-250 ease-out"
					style="
						left: 0;
						transform: translateX({activeTabIndex === 0 ? '0%' : '100%'});
						background: var(--color-surface-container-lowest);
						opacity: 0.85;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
						border: 1px solid var(--color-outline-variant);
					"
				></div>
			{/if}

			{#each tabs as tab (tab.href)}
				{@const active = activeTabIndex === tab.index}
				<a
					href={tab.href}
					onclick={() => handleTabClick(tab.index)}
					class="relative z-10 flex flex-1 flex-col items-center justify-center py-1 transition-transform select-none active:scale-95 {active
						? 'font-bold text-primary'
						: 'font-medium text-on-surface-variant hover:text-on-surface'}"
					aria-current={active ? 'page' : undefined}
				>
					<span
						class="material-symbols-outlined text-2xl transition-transform duration-150 {active
							? 'scale-105'
							: ''}"
						style={active ? 'font-variation-settings: "FILL" 1;' : ''}
					>
						{tab.icon}
					</span>
					<span class="text-[10px] leading-tight">{tab.label}</span>
				</a>
			{/each}
		</div>

		<!-- Center Quick Action FAB (+) -->
		<div class="relative -top-3 z-20 flex shrink-0 items-center justify-center">
			<button
				type="button"
				class="flex h-13 w-13 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-90"
				style="
					background: var(--color-primary-container);
					box-shadow: 0 8px 24px -4px rgba(0, 112, 235, 0.45);
				"
				onclick={handleFabClick}
				aria-label={t('nav.aksiCepat')}
			>
				<span class="material-symbols-outlined text-3xl">add</span>
			</button>
		</div>

		<!-- Right Tabs Cluster dengan Sliding Pill Indicator -->
		<div class="relative flex flex-1 items-center justify-around py-1">
			{#if activeTabIndex === 2 || activeTabIndex === 3}
				<div
					class="pointer-events-none absolute top-1 bottom-1 w-1/2 rounded-full transition-transform duration-250 ease-out"
					style="
						left: 0;
						transform: translateX({activeTabIndex === 2 ? '0%' : '100%'});
						background: var(--color-surface-container-lowest);
						opacity: 0.85;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
						border: 1px solid var(--color-outline-variant);
					"
				></div>
			{/if}

			{#each rightTabs as tab (tab.href)}
				{@const active = activeTabIndex === tab.index}
				<a
					href={tab.href}
					onclick={() => handleTabClick(tab.index)}
					class="relative z-10 flex flex-1 flex-col items-center justify-center py-1 transition-transform select-none active:scale-95 {active
						? 'font-bold text-primary'
						: 'font-medium text-on-surface-variant hover:text-on-surface'}"
					aria-current={active ? 'page' : undefined}
				>
					<span
						class="material-symbols-outlined text-2xl transition-transform duration-150 {active
							? 'scale-105'
							: ''}"
						style={active ? 'font-variation-settings: "FILL" 1;' : ''}
					>
						{tab.icon}
					</span>
					<span class="text-[10px] leading-tight">{tab.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
