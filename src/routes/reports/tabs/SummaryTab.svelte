<script lang="ts">
	import { CashflowBarChart } from '$lib/components/charts';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import type {
		CashflowReportSummary,
		DailyCashflowPoint,
		TrendDelta
	} from '$lib/domain/aggregation';
	import { calculateTrendDelta } from '$lib/domain/aggregation';
	import { formatRupiah } from '$lib/domain/money';

	interface Props {
		summary: CashflowReportSummary;
		previousSummary?: CashflowReportSummary | null;
		dailySeries?: DailyCashflowPoint[];
	}

	let { summary, previousSummary = null, dailySeries = [] }: Props = $props();

	let expenseDelta = $derived<TrendDelta | null>(
		previousSummary ? calculateTrendDelta(summary.expense, previousSummary.expense) : null
	);

	let incomeDelta = $derived<TrendDelta | null>(
		previousSummary ? calculateTrendDelta(summary.income, previousSummary.income) : null
	);

	let barChartData = $derived(
		dailySeries.map((d) => ({
			date: d.date.slice(8), // Ambil DD
			income: d.income,
			expense: d.expense
		}))
	);
</script>

<div class="flex flex-col gap-4">
	<!-- Hero Net Cashflow Card -->
	<GlassCard class="p-5">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
				Arus Kas Bersih (Net)
			</span>
			<span
				class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
				style="background: {summary.net >= 0
					? 'var(--color-income-container)'
					: 'var(--color-expense-container)'}; color: {summary.net >= 0
					? 'var(--color-on-income-container)'
					: 'var(--color-on-expense-container)'};"
			>
				{summary.net >= 0 ? 'Surplus' : 'Defisit'}
			</span>
		</div>

		<h2
			class="mt-1.5 text-3xl font-bold tracking-tight tabular-nums {summary.net >= 0
				? 'text-income'
				: 'text-expense'}"
			data-testid="report-net-cashflow"
		>
			{summary.net >= 0 ? '+' : ''}{formatRupiah(summary.net)}
		</h2>

		<!-- Mini Stats Grid: Total Masuk & Total Keluar -->
		<div class="mt-4 grid grid-cols-2 gap-2 text-xs">
			<div class="rounded-xl p-3" style="background: var(--color-surface-container-low);">
				<div class="flex items-center justify-between">
					<p class="text-on-surface-variant">Total Masuk</p>
					{#if incomeDelta && incomeDelta.previous > 0}
						<span
							class="text-[10px] font-semibold {incomeDelta.deltaPercentage >= 0
								? 'text-income'
								: 'text-expense'}"
						>
							{incomeDelta.deltaPercentage >= 0 ? '+' : ''}{incomeDelta.deltaPercentage}%
						</span>
					{/if}
				</div>
				<p
					class="mt-1 text-sm font-bold text-income tabular-nums"
					data-testid="report-total-income"
				>
					{formatRupiah(summary.income)}
				</p>
			</div>

			<div class="rounded-xl p-3" style="background: var(--color-surface-container-low);">
				<div class="flex items-center justify-between">
					<p class="text-on-surface-variant">Total Keluar</p>
					{#if expenseDelta && expenseDelta.previous > 0}
						<span
							class="text-[10px] font-semibold {expenseDelta.deltaPercentage <= 0
								? 'text-income'
								: 'text-expense'}"
						>
							{expenseDelta.deltaPercentage >= 0 ? '+' : ''}{expenseDelta.deltaPercentage}%
						</span>
					{/if}
				</div>
				<p
					class="mt-1 text-sm font-bold text-expense tabular-nums"
					data-testid="report-total-expense"
				>
					{formatRupiah(summary.expense)}
				</p>
			</div>
		</div>

		<!-- Financial Health Stats -->
		<div
			class="mt-3 grid grid-cols-2 gap-2 border-t border-surface-container-highest/60 pt-3 text-xs"
		>
			<div>
				<p class="text-[11px] text-on-surface-variant">Rasio Tabungan</p>
				<p class="text-sm font-bold text-on-surface tabular-nums">
					{summary.savingsRate}%
				</p>
			</div>
			<div>
				<p class="text-[11px] text-on-surface-variant">Rata-rata Keluar / Hari</p>
				<p class="text-sm font-bold text-on-surface tabular-nums">
					{formatRupiah(summary.dailyAverageExpense)}
				</p>
			</div>
		</div>

		{#if summary.transferCount > 0}
			<div
				class="mt-3 flex items-center justify-between rounded-lg bg-surface-container-highest/40 p-2.5 text-[11px] text-on-surface-variant"
			>
				<span>Transfer: {summary.transferCount} kali ({formatRupiah(summary.transferVolume)})</span>
				{#if summary.totalFees > 0}
					<span class="font-semibold text-expense">Fee: {formatRupiah(summary.totalFees)}</span>
				{/if}
			</div>
		{/if}
	</GlassCard>

	<!-- Cashflow Visualization Card -->
	<GlassCard class="p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				Aktivitas Arus Kas Harian
			</h3>
			<div class="flex items-center gap-3 text-[10px] font-medium">
				<span class="flex items-center gap-1 text-income">
					<span class="h-2 w-2 rounded-full" style="background: var(--color-income);"></span>
					Masuk
				</span>
				<span class="flex items-center gap-1 text-expense">
					<span class="h-2 w-2 rounded-full" style="background: var(--color-expense);"></span>
					Keluar
				</span>
			</div>
		</div>

		<CashflowBarChart data={barChartData} height={140} />
	</GlassCard>
</div>
