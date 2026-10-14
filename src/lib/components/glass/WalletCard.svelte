<script lang="ts">
	import { formatRupiah } from '$lib/domain/money';
	import type { Wallet, WalletType } from '$lib/domain/types';

	interface Props {
		wallet: Partial<Wallet> & { name: string; balance?: number; openingBalance?: number };
		variant?: 'hero' | 'compact' | 'preview';
		href?: string;
		onclick?: () => void;
	}

	let { wallet, variant = 'compact', href, onclick }: Props = $props();

	function getTypeName(type?: WalletType): string {
		switch (type) {
			case 'ewallet':
				return 'E-Wallet';
			case 'bank':
				return 'Rekening Bank';
			case 'cash':
				return 'Uang Tunai';
			default:
				return 'Dompet';
		}
	}

	// Dynamic gradient background generator
	let gradientBg = $derived.by(() => {
		const c = wallet.color || '#0058bc';
		return `linear-gradient(135deg, ${c} 0%, rgba(20, 20, 30, 0.95) 100%)`;
	});

	let balanceFormatted = $derived(formatRupiah(wallet.balance ?? wallet.openingBalance ?? 0));
	let openingFormatted = $derived(
		wallet.openingBalance !== undefined ? formatRupiah(wallet.openingBalance) : null
	);
</script>

{#snippet cardContent()}
	<div
		class="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl transition-all duration-200 {variant ===
		'hero'
			? 'p-6'
			: ''} {onclick || href ? 'hover:scale-[1.01] active:scale-[0.99]' : ''}"
		style="
			background: {gradientBg};
			border: 1px solid rgba(255, 255, 255, 0.2);
			box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.35);
		"
		data-testid="wallet-card"
		data-wallet-id={wallet.id}
	>
		<!-- Specular light edge catch -->
		<div
			class="pointer-events-none absolute inset-x-6 top-0 h-px"
			style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);"
		></div>

		<!-- Decorative Blur Orbs inside Card -->
		<div
			class="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-40 blur-2xl"
			style="background: {wallet.color || '#0058bc'};"
		></div>

		<!-- Top Row: Icon + Type Badge + Archived indicator -->
		<div class="relative z-10 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md"
				>
					<span class="material-symbols-outlined text-2xl text-white">
						{wallet.icon || 'account_balance_wallet'}
					</span>
				</div>
				<div>
					<span
						class="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/90 uppercase backdrop-blur-sm"
					>
						{getTypeName(wallet.type)}
					</span>
					{#if wallet.includeInTotal === false}
						<span
							class="ml-1 inline-block rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
						>
							Non-Total
						</span>
					{/if}
				</div>
			</div>

			{#if wallet.archivedAt}
				<span
					class="rounded-full bg-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-200"
				>
					Diarsipkan
				</span>
			{/if}
		</div>

		<!-- Middle: Name & Balance -->
		<div class="relative z-10 mt-5">
			<p class="text-xs font-medium text-white/75">{wallet.name || 'Nama Dompet'}</p>
			<div class="mt-0.5 flex items-baseline justify-between gap-2">
				<h4 class="text-2xl font-black tracking-tight text-white tabular-nums">
					{balanceFormatted}
				</h4>
			</div>
		</div>

		<!-- Bottom: Opening balance hint if relevant -->
		{#if openingFormatted && variant !== 'compact'}
			<div
				class="relative z-10 mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/60"
			>
				<span>Saldo Awal</span>
				<span class="font-medium text-white/80 tabular-nums">{openingFormatted}</span>
			</div>
		{/if}
	</div>
{/snippet}

{#if href}
	<a {href} class="block select-none">
		{@render cardContent()}
	</a>
{:else if onclick}
	<button type="button" {onclick} class="block w-full text-left select-none">
		{@render cardContent()}
	</button>
{:else}
	{@render cardContent()}
{/if}
