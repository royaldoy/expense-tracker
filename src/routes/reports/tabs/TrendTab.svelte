<script lang="ts">
	import { SplineAreaChart } from '$lib/components/charts';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import type { DailyCashflowPoint } from '$lib/domain/aggregation';
	import { formatRupiah } from '$lib/domain/money';

	interface Props {
		dailySeries: DailyCashflowPoint[];
	}

	let { dailySeries = [] }: Props = $props();

	let metric = $state<'cumulative' | 'expense'>('cumulative');

	const metricOptions = [
		{ value: 'cumulative', label: 'Kumulatif Bersih' },
		{ value: 'expense', label: 'Pengeluaran Harian' }
	];

	let chartPoints = $derived(
		dailySeries.map((d) => ({
			date: d.date,
			value: metric === 'cumulative' ? d.cumulativeNet : d.expense,
			label: d.date.slice(8) // DD
		}))
	);

	let maxExpensePoint = $derived.by(() => {
		if (dailySeries.length === 0) return null;
		let maxPt = dailySeries[0];
		for (const pt of dailySeries) {
			if (pt.expense > maxPt.expense) {
				maxPt = pt;
			}
		}
		return maxPt.expense > 0 ? maxPt : null;
	});

	let maxIncomePoint = $derived.by(() => {
		if (dailySeries.length === 0) return null;
		let maxPt = dailySeries[0];
		for (const pt of dailySeries) {
			if (pt.income > maxPt.income) {
				maxPt = pt;
			}
		}
		return maxPt.income > 0 ? maxPt : null;
	});
</script>

<div class="flex flex-col gap-4">
	<!-- Metric Switcher -->
	<GlassSegmented
		options={metricOptions}
		value={metric}
		onchange={(val) => (metric = val as 'cumulative' | 'expense')}
	/>

	<!-- Trend Chart Card -->
	<GlassCard class="p-5">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				{metric === 'cumulative' ? 'Kurva Akumulasi Kas Bersih' : 'Kurva Beban Harian'}
			</h3>
			<span class="text-[11px] font-semibold text-primary">
				{dailySeries.length} Hari
			</span>
		</div>

		<SplineAreaChart
			data={chartPoints}
			height={160}
			color={metric === 'cumulative'
				? 'var(--color-primary, #6366F1)'
				: 'var(--color-expense, #BC000A)'}
			gradientId="trend-chart-gradient"
		/>
	</GlassCard>

	<!-- Highlights Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<GlassCard variant="opaque" class="p-3.5">
			<span class="text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
				Puncak Pengeluaran
			</span>
			{#if maxExpensePoint}
				<p class="mt-1 text-xs font-bold text-expense tabular-nums">
					{formatRupiah(maxExpensePoint.expense)}
				</p>
				<p class="mt-0.5 text-[10px] text-on-surface-variant">
					{maxExpensePoint.date}
				</p>
			{:else}
				<p class="mt-1 text-xs text-on-surface-variant">-</p>
			{/if}
		</GlassCard>

		<GlassCard variant="opaque" class="p-3.5">
			<span class="text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
				Pemasukan Terbesar
			</span>
			{#if maxIncomePoint}
				<p class="mt-1 text-xs font-bold text-income tabular-nums">
					{formatRupiah(maxIncomePoint.income)}
				</p>
				<p class="mt-0.5 text-[10px] text-on-surface-variant">
					{maxIncomePoint.date}
				</p>
			{:else}
				<p class="mt-1 text-xs text-on-surface-variant">-</p>
			{/if}
		</GlassCard>
	</div>
</div>
