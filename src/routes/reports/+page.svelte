<script lang="ts">
	import { onMount } from 'svelte';
	import AppHeader from '$lib/components/glass/AppHeader.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import {
		aggregateSummary,
		filterTransactionsByPeriod,
		generateDailyCashflowSeries,
		getPreviousPeriod
	} from '$lib/domain/aggregation';
	import { formatPeriod, type Period } from '$lib/domain/period';
	import type { Category, Transaction, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import {
		categoryService,
		exportAndShareReport,
		type ReportExportFormat,
		settingService,
		transactionService,
		walletService
	} from '$lib/services';

	// Sub-tab view components
	import CategoryTab from './tabs/CategoryTab.svelte';
	import SummaryTab from './tabs/SummaryTab.svelte';
	import TrendTab from './tabs/TrendTab.svelte';
	import WalletTab from './tabs/WalletTab.svelte';

	let activeTab = $state('summary');
	let loading = $state(true);

	let allTransactions = $state<Transaction[]>([]);
	let categories = $state<Category[]>([]);
	let wallets = $state<Wallet[]>([]);
	let currentPeriod = $state<Period | null>(null);

	// State Modal Ekspor
	let isExportSheetOpen = $state(false);
	let exportFormat = $state<ReportExportFormat>('csv');
	let selectedExportWalletId = $state<string | null>(null);
	let isExporting = $state(false);
	let exportStatusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const reportTabs = [
		{ value: 'summary', label: 'Ringkasan' },
		{ value: 'category', label: 'Kategori' },
		{ value: 'wallet', label: 'Dompet' },
		{ value: 'trend', label: 'Tren' }
	];

	// Filter transaksi sesuai periode aktif
	let periodTransactions = $derived(
		currentPeriod ? filterTransactionsByPeriod(allTransactions, currentPeriod) : []
	);

	// Ringkasan periode aktif
	let currentSummary = $derived(
		currentPeriod
			? aggregateSummary(periodTransactions, currentPeriod)
			: {
					income: 0,
					expense: 0,
					net: 0,
					transferCount: 0,
					transferVolume: 0,
					totalFees: 0,
					savingsRate: 0,
					dailyAverageExpense: 0
				}
	);

	// Ringkasan periode sebelumnya untuk komparasi tren
	let previousPeriod = $derived(currentPeriod ? getPreviousPeriod(currentPeriod) : null);

	let previousSummary = $derived.by(() => {
		if (!previousPeriod) return null;
		const prevTxs = filterTransactionsByPeriod(allTransactions, previousPeriod);
		return aggregateSummary(prevTxs, previousPeriod);
	});

	// Deret tanggal harian
	let dailySeries = $derived(
		currentPeriod ? generateDailyCashflowSeries(periodTransactions, currentPeriod) : []
	);

	async function loadInitialData() {
		loading = true;
		try {
			const [loadedPeriod, loadedTxs, loadedCats, loadedWallets] = await Promise.all([
				settingService.getCurrentReportPeriod(),
				transactionService.getTransactions(),
				categoryService.getCategories(),
				walletService.getWallets({ includeArchived: false })
			]);

			currentPeriod = loadedPeriod;
			allTransactions = loadedTxs;
			categories = loadedCats;
			wallets = loadedWallets;
		} catch (error) {
			console.error('Gagal memuat data laporan:', error);
		} finally {
			loading = false;
		}
	}

	async function handleExportAndShare() {
		if (!currentPeriod) return;
		isExporting = true;
		exportStatusMessage = null;

		try {
			const targetWallet = selectedExportWalletId
				? wallets.find((w) => w.id === selectedExportWalletId)
				: undefined;

			await exportAndShareReport(exportFormat, {
				period: currentPeriod,
				wallet: targetWallet,
				wallets,
				categories,
				transactions: allTransactions
			});

			isExportSheetOpen = false;
			exportStatusMessage = {
				type: 'success',
				text: t('reports.successToast')
			};
			setTimeout(() => {
				exportStatusMessage = null;
			}, 3500);
		} catch (err) {
			console.error('Gagal mengekspor laporan:', err);
			exportStatusMessage = {
				type: 'error',
				text: `${t('reports.errorToast')}: ${err instanceof Error ? err.message : String(err)}`
			};
		} finally {
			isExporting = false;
		}
	}

	onMount(() => {
		loadInitialData();
	});
</script>

<div class="pt-safe flex flex-col gap-4 px-4 pb-28">
	<!-- AppHeader Sesuai Aturan: Satu Judul Besar, Tanpa Subjudul, Maks 2 Ikon (Share) -->
	<AppHeader
		title={t('routes.laporan')}
		actions={[
			{
				icon: 'ios_share',
				label: 'Ekspor Laporan',
				onclick: () => (isExportSheetOpen = true),
				testId: 'report-export-button'
			}
		]}
	/>

	<!-- Periode Laporan Menjadi Pill di Bawah Judul -->
	{#if currentPeriod}
		<div class="flex items-center gap-1.5 pt-0.5">
			<GlassButton
				variant="secondary"
				size="sm"
				class="min-h-[30px] rounded-full px-3.5 py-1 text-xs text-primary"
				onclick={() => {}}
				data-testid="report-period-pill"
			>
				<span class="material-symbols-outlined text-sm">calendar_month</span>
				<span>{formatPeriod(currentPeriod)}</span>
				<span class="material-symbols-outlined text-xs">keyboard_arrow_down</span>
			</GlassButton>
		</div>
	{/if}

	<!-- Alert Feedback Status Ekspor -->
	{#if exportStatusMessage}
		<div
			class="flex items-center gap-2 rounded-xl p-3 text-xs font-medium transition-all {exportStatusMessage.type ===
			'success'
				? 'border border-income/20 bg-income/10 text-income'
				: 'border border-expense/20 bg-expense/10 text-expense'}"
			role="alert"
			data-testid="export-status-alert"
		>
			<span class="material-symbols-outlined text-base">
				{exportStatusMessage.type === 'success' ? 'check_circle' : 'error'}
			</span>
			<span>{exportStatusMessage.text}</span>
		</div>
	{/if}

	<!-- Tab Switcher 4 Pilihan: Ringkasan, Kategori, Dompet, Tren -->
	<GlassSegmented options={reportTabs} bind:value={activeTab} />

	<!-- Tab Content Rendering -->
	{#if loading}
		<GlassCard class="p-8 text-center text-xs text-on-surface-variant">
			Memuat laporan keuangan...
		</GlassCard>
	{:else if activeTab === 'summary'}
		<SummaryTab summary={currentSummary} {previousSummary} {dailySeries} />
	{:else if activeTab === 'category'}
		<CategoryTab transactions={periodTransactions} {categories} />
	{:else if activeTab === 'wallet'}
		<WalletTab transactions={periodTransactions} {wallets} />
	{:else if activeTab === 'trend'}
		<TrendTab {dailySeries} />
	{/if}

	<!-- Bottom Sheet Ekspor Laporan Keuangan -->
	<GlassSheet
		bind:isOpen={isExportSheetOpen}
		title={t('reports.exportTitle')}
		subtitle={t('reports.exportSubtitle')}
	>
		<div class="flex flex-col gap-4 p-4" data-testid="export-report-sheet">
			<!-- Informasi Periode Aktif -->
			<div
				class="flex items-center justify-between rounded-xl p-3"
				style="background: var(--color-surface-container-low);"
			>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-primary">calendar_month</span>
					<span class="text-xs font-semibold text-on-surface">{t('reports.periodLabel')}</span>
				</div>
				<span class="text-xs font-bold text-primary">
					{currentPeriod ? formatPeriod(currentPeriod) : '-'}
				</span>
			</div>

			<!-- Filter Dompet -->
			<div class="flex flex-col gap-2">
				<span class="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
					{t('reports.filterWalletLabel')}
				</span>
				<div class="flex flex-wrap gap-1.5">
					<GlassButton
						variant={selectedExportWalletId === null ? 'primary' : 'secondary'}
						size="sm"
						class="min-h-[30px] rounded-full px-3 py-1 text-xs"
						onclick={() => (selectedExportWalletId = null)}
						data-testid="export-wallet-all"
					>
						{t('reports.allWallets')}
					</GlassButton>
					{#each wallets as w (w.id)}
						<GlassButton
							variant={selectedExportWalletId === w.id ? 'primary' : 'secondary'}
							size="sm"
							class="min-h-[30px] rounded-full px-3 py-1 text-xs"
							onclick={() => (selectedExportWalletId = w.id)}
							data-testid="export-wallet-{w.id}"
						>
							<span class="h-2 w-2 rounded-full" style="background: {w.color};"></span>
							{w.name}
						</GlassButton>
					{/each}
				</div>
			</div>

			<!-- Pilihan Format Ekspor -->
			<div class="flex flex-col gap-2">
				<span class="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
					{t('reports.formatLabel')}
				</span>
				<div class="grid grid-cols-3 gap-2">
					<!-- Format CSV -->
					<GlassCard
						onclick={() => (exportFormat = 'csv')}
						class="flex flex-col items-center justify-center gap-1 p-3 text-center {exportFormat ===
						'csv'
							? 'bg-primary/10 text-primary ring-2 ring-primary'
							: ''}"
						data-testid="export-format-csv"
					>
						<span class="material-symbols-outlined text-2xl">table_chart</span>
						<span class="text-xs font-bold">{t('reports.formatCsv')}</span>
						<span class="text-[9px] leading-tight text-on-surface-variant">Tabel Data</span>
					</GlassCard>

					<!-- Format Excel -->
					<GlassCard
						onclick={() => (exportFormat = 'xlsx')}
						class="flex flex-col items-center justify-center gap-1 p-3 text-center {exportFormat ===
						'xlsx'
							? 'bg-primary/10 text-primary ring-2 ring-primary'
							: ''}"
						data-testid="export-format-xlsx"
					>
						<span class="material-symbols-outlined text-2xl">grid_on</span>
						<span class="text-xs font-bold">{t('reports.formatXlsx')}</span>
						<span class="text-[9px] leading-tight text-on-surface-variant">Multi-Sheet</span>
					</GlassCard>

					<!-- Format PDF -->
					<GlassCard
						onclick={() => (exportFormat = 'pdf')}
						class="flex flex-col items-center justify-center gap-1 p-3 text-center {exportFormat ===
						'pdf'
							? 'bg-primary/10 text-primary ring-2 ring-primary'
							: ''}"
						data-testid="export-format-pdf"
					>
						<span class="material-symbols-outlined text-2xl">picture_as_pdf</span>
						<span class="text-xs font-bold">{t('reports.formatPdf')}</span>
						<span class="text-[9px] leading-tight text-on-surface-variant">Dokumen</span>
					</GlassCard>
				</div>
			</div>

			<!-- Tombol Eksekusi Ekspor -->
			<div class="mt-2 flex flex-col gap-2">
				<GlassButton
					variant="primary"
					onclick={handleExportAndShare}
					disabled={isExporting}
					data-testid="export-submit-button"
				>
					{#if isExporting}
						<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
						{t('reports.generating')}
					{:else}
						<span class="material-symbols-outlined text-sm">ios_share</span>
						{t('reports.actionShare')}
					{/if}
				</GlassButton>
			</div>
		</div>
	</GlassSheet>
</div>
