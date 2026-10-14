<script lang="ts">
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { aggregateWalletBreakdown } from '$lib/domain/aggregation';
	import { formatRupiah } from '$lib/domain/money';
	import type { Transaction, Wallet } from '$lib/domain/types';

	interface Props {
		transactions: Transaction[];
		wallets: Wallet[];
	}

	let { transactions, wallets }: Props = $props();

	let items = $derived(aggregateWalletBreakdown(transactions, wallets));
</script>

<div class="flex flex-col gap-3">
	{#if items.length === 0}
		<GlassCard class="p-8 text-center text-xs text-on-surface-variant">
			Belum ada data dompet.
		</GlassCard>
	{:else}
		{#each items as item (item.walletId)}
			<GlassCard variant="opaque" class="p-4">
				<!-- Header Dompet -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
							style="background: {item.color};"
						>
							<span class="material-symbols-outlined text-lg">{item.icon}</span>
						</div>
						<div>
							<h4 class="text-xs font-bold text-on-surface">{item.name}</h4>
							<p class="text-[11px] text-on-surface-variant">
								{item.transactionCount} transaksi di periode ini
							</p>
						</div>
					</div>

					<div class="text-right">
						<span class="text-[10px] font-semibold text-on-surface-variant uppercase">
							Net Perubahan
						</span>
						<p
							class="text-xs font-bold tabular-nums {item.netChange >= 0
								? 'text-income'
								: 'text-expense'}"
						>
							{item.netChange >= 0 ? '+' : ''}{formatRupiah(item.netChange)}
						</p>
					</div>
				</div>

				<!-- Detail Arus Masuk, Keluar, dan Transfer -->
				<div
					class="mt-3.5 grid grid-cols-2 gap-2 rounded-xl p-2.5 text-[11px]"
					style="background: var(--color-surface-container-low);"
				>
					<div>
						<span class="text-on-surface-variant">Masuk Langsung:</span>
						<p class="font-bold text-income tabular-nums">
							+{formatRupiah(item.income)}
						</p>
					</div>
					<div>
						<span class="text-on-surface-variant">Keluar Langsung:</span>
						<p class="font-bold text-expense tabular-nums">
							-{formatRupiah(item.expense)}
						</p>
					</div>
					<div>
						<span class="text-on-surface-variant">Transfer Masuk:</span>
						<p class="font-bold text-primary tabular-nums">
							+{formatRupiah(item.transferIn)}
						</p>
					</div>
					<div>
						<span class="text-on-surface-variant">Transfer Keluar:</span>
						<p class="font-bold text-on-surface-variant tabular-nums">
							-{formatRupiah(item.transferOut)}
						</p>
					</div>
				</div>
			</GlassCard>
		{/each}
	{/if}
</div>
