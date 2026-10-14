<script lang="ts">
	import { DonutChart } from '$lib/components/charts';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import { aggregateCategoryBreakdown } from '$lib/domain/aggregation';
	import { formatRupiah } from '$lib/domain/money';
	import type { Category, Transaction } from '$lib/domain/types';

	interface Props {
		transactions: Transaction[];
		categories: Category[];
	}

	let { transactions, categories }: Props = $props();

	let kind = $state<'expense' | 'income'>('expense');
	let selectedCategoryId = $state<string | null>(null);

	const kindOptions = [
		{ value: 'expense', label: 'Pengeluaran' },
		{ value: 'income', label: 'Pemasukan' }
	];

	let report = $derived(aggregateCategoryBreakdown(transactions, categories, kind));

	let donutItems = $derived(
		report.items.map((item) => ({
			id: item.categoryId,
			name: item.name,
			amount: item.total,
			percentage: item.percentage,
			color: item.color,
			icon: item.icon
		}))
	);
</script>

<div class="flex flex-col gap-4">
	<!-- Switcher Pengeluaran vs Pemasukan -->
	<GlassSegmented
		options={kindOptions}
		value={kind}
		onchange={(val) => {
			kind = val as 'expense' | 'income';
			selectedCategoryId = null;
		}}
	/>

	{#if report.items.length === 0}
		<GlassCard class="p-8 text-center">
			<span class="material-symbols-outlined text-3xl text-on-surface-variant/50"> pie_chart </span>
			<p class="mt-2 text-xs font-medium text-on-surface-variant">
				Tidak ada {kind === 'expense' ? 'pengeluaran' : 'pemasukan'} pada periode ini.
			</p>
		</GlassCard>
	{:else}
		<!-- Donut Chart Card -->
		<GlassCard class="flex flex-col items-center justify-center p-6">
			<DonutChart
				items={donutItems}
				totalAmount={report.totalAmount}
				centerLabel={kind === 'expense' ? 'Total Keluar' : 'Total Masuk'}
				size={210}
				bind:selectedId={selectedCategoryId}
			/>
		</GlassCard>

		<!-- Daftar Kategori Terurut -->
		<section class="flex flex-col gap-2">
			<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				Rincian Kategori ({report.items.length})
			</h3>

			<GlassCard variant="opaque" class="divide-y divide-surface-container-highest">
				{#each report.items as item (item.categoryId)}
					{@const isSelected = selectedCategoryId === item.categoryId}
					<GlassCard
						onclick={() => (selectedCategoryId = isSelected ? null : item.categoryId)}
						class="flex flex-col gap-2 p-3.5 {isSelected
							? 'bg-surface-container'
							: 'hover:bg-surface-container-low/50'}"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-xs"
									style="background: {item.color};"
								>
									<span class="material-symbols-outlined text-base">{item.icon}</span>
								</div>
								<div>
									<p class="text-xs font-bold text-on-surface">{item.name}</p>
									<p class="text-[11px] text-on-surface-variant">
										{item.transactionCount} transaksi
									</p>
								</div>
							</div>

							<div class="text-right">
								<p class="text-xs font-bold text-on-surface tabular-nums">
									{formatRupiah(item.total)}
								</p>
								<p class="text-[11px] font-semibold text-primary tabular-nums">
									{item.percentage}%
								</p>
							</div>
						</div>

						<!-- Progress Bar Visual -->
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
							<div
								class="h-full rounded-full transition-all duration-300"
								style="width: {item.percentage}%; background: {item.color};"
							></div>
						</div>
					</GlassCard>
				{/each}
			</GlassCard>
		</section>
	{/if}
</div>
