<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { subDays } from 'date-fns';
	import AppHeader, { type HeaderAction } from '$lib/components/glass/AppHeader.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import type { Category, TransactionType, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { categoryService } from '$lib/services/categoryService';
	import {
		transactionService,
		type TransactionFilter,
		type TransactionGroupedByDate
	} from '$lib/services/transactionService';
	import { walletService } from '$lib/services/walletService';

	// State pencarian & tipe transaksi
	let activeType = $state<string>('all');
	let searchQuery = $state('');
	let showSearch = $state(false);

	// State modal filter sheet
	let isFilterOpen = $state(false);

	// Filter aktif (diterapkan ke query)
	let filterWalletIds = $state<string[]>([]);
	let filterCategoryIds = $state<string[]>([]);
	let filterStartDate = $state('');
	let filterEndDate = $state('');
	let filterMinAmount = $state<number | ''>('');
	let filterMaxAmount = $state<number | ''>('');

	// Draft filter (di dalam sheet sebelum diterapkan)
	let draftWalletIds = $state<string[]>([]);
	let draftCategoryIds = $state<string[]>([]);
	let draftStartDate = $state('');
	let draftEndDate = $state('');
	let draftMinAmount = $state<number | ''>('');
	let draftMaxAmount = $state<number | ''>('');

	let groups = $state<TransactionGroupedByDate[]>([]);
	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let isLoading = $state(true);

	const typeFilterOptions = [
		{ value: 'all', label: 'Semua' },
		{ value: 'expense', label: 'Keluar' },
		{ value: 'income', label: 'Masuk' },
		{ value: 'transfer', label: 'Transfer' }
	];

	// Peta cepat nama dompet dan kategori untuk label chip
	let walletMap = $derived(new Map<string, Wallet>(wallets.map((w) => [w.id, w])));
	let categoryMap = $derived(new Map<string, Category>(categories.map((c) => [c.id, c])));

	let hasActiveFilters = $derived(
		Boolean(
			searchQuery.trim() ||
			activeType !== 'all' ||
			filterWalletIds.length > 0 ||
			filterCategoryIds.length > 0 ||
			filterStartDate ||
			filterEndDate ||
			filterMinAmount !== '' ||
			filterMaxAmount !== ''
		)
	);

	let activeFilterCount = $derived(
		(searchQuery.trim() ? 1 : 0) +
			(activeType !== 'all' ? 1 : 0) +
			(filterWalletIds.length > 0 ? 1 : 0) +
			(filterCategoryIds.length > 0 ? 1 : 0) +
			(filterStartDate || filterEndDate ? 1 : 0) +
			(filterMinAmount !== '' || filterMaxAmount !== '' ? 1 : 0)
	);

	async function loadInitialData() {
		isLoading = true;
		try {
			const [wList, cList] = await Promise.all([
				walletService.getWallets({ includeArchived: true }),
				categoryService.getCategories()
			]);
			wallets = wList;
			categories = cList;
			await fetchTransactions();
		} finally {
			isLoading = false;
		}
	}

	async function fetchTransactions() {
		const filter: TransactionFilter = {};

		if (activeType !== 'all') {
			filter.types = [activeType as TransactionType];
		}
		if (filterWalletIds.length > 0) {
			filter.walletIds = filterWalletIds;
		}
		if (filterCategoryIds.length > 0) {
			filter.categoryIds = filterCategoryIds;
		}
		if (filterStartDate) {
			filter.startDate = filterStartDate;
		}
		if (filterEndDate) {
			filter.endDate = filterEndDate;
		}
		if (filterMinAmount !== '') {
			filter.minAmount = Number(filterMinAmount);
		}
		if (filterMaxAmount !== '') {
			filter.maxAmount = Number(filterMaxAmount);
		}
		if (searchQuery.trim()) {
			filter.search = searchQuery.trim();
		}

		groups = await transactionService.getTransactionsGroupedByDate(filter);
	}

	onMount(() => {
		loadInitialData();
	});

	$effect(() => {
		if (activeType !== undefined) {
			fetchTransactions();
		}
	});

	function openFilterSheet() {
		// Salin filter aktif ke draft
		draftWalletIds = [...filterWalletIds];
		draftCategoryIds = [...filterCategoryIds];
		draftStartDate = filterStartDate;
		draftEndDate = filterEndDate;
		draftMinAmount = filterMinAmount;
		draftMaxAmount = filterMaxAmount;
		isFilterOpen = true;
	}

	function handleApplyFilter() {
		filterWalletIds = [...draftWalletIds];
		filterCategoryIds = [...draftCategoryIds];
		filterStartDate = draftStartDate;
		filterEndDate = draftEndDate;
		filterMinAmount = draftMinAmount;
		filterMaxAmount = draftMaxAmount;
		isFilterOpen = false;
		fetchTransactions();
	}

	function handleResetFilter() {
		draftWalletIds = [];
		draftCategoryIds = [];
		draftStartDate = '';
		draftEndDate = '';
		draftMinAmount = '';
		draftMaxAmount = '';
		filterWalletIds = [];
		filterCategoryIds = [];
		filterStartDate = '';
		filterEndDate = '';
		filterMinAmount = '';
		filterMaxAmount = '';
		isFilterOpen = false;
		fetchTransactions();
	}

	function toggleDraftWallet(id: string) {
		if (draftWalletIds.includes(id)) {
			draftWalletIds = draftWalletIds.filter((w) => w !== id);
		} else {
			draftWalletIds = [...draftWalletIds, id];
		}
	}

	function toggleDraftCategory(id: string) {
		if (draftCategoryIds.includes(id)) {
			draftCategoryIds = draftCategoryIds.filter((c) => c !== id);
		} else {
			draftCategoryIds = [...draftCategoryIds, id];
		}
	}

	// Penghapusan filter aktif satu per satu dari chip bar
	function removeSearchChip() {
		searchQuery = '';
		fetchTransactions();
	}

	function removeTypeChip() {
		activeType = 'all';
	}

	function removeWalletChip() {
		filterWalletIds = [];
		fetchTransactions();
	}

	function removeCategoryChip() {
		filterCategoryIds = [];
		fetchTransactions();
	}

	function removeDateChip() {
		filterStartDate = '';
		filterEndDate = '';
		fetchTransactions();
	}

	function removeAmountChip() {
		filterMinAmount = '';
		filterMaxAmount = '';
		fetchTransactions();
	}

	function clearAllActiveFilters() {
		searchQuery = '';
		activeType = 'all';
		filterWalletIds = [];
		filterCategoryIds = [];
		filterStartDate = '';
		filterEndDate = '';
		filterMinAmount = '';
		filterMaxAmount = '';
		fetchTransactions();
	}

	function applyDatePreset(preset: 'thisMonth' | 'last30Days' | 'allTime') {
		const now = new Date();
		if (preset === 'thisMonth') {
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');
			draftStartDate = `${y}-${m}-01`;
			const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
			draftEndDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
		} else if (preset === 'last30Days') {
			const past = subDays(now, 30);
			draftStartDate = past.toISOString().slice(0, 10);
			draftEndDate = now.toISOString().slice(0, 10);
		} else if (preset === 'allTime') {
			draftStartDate = '';
			draftEndDate = '';
		}
	}

	function formatDateHeader(dateStr: string): string {
		try {
			const today = new Date().toISOString().split('T')[0];
			const d = new Date(dateStr);
			const formatted = new Intl.DateTimeFormat('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			}).format(d);

			if (dateStr === today) {
				return `Hari Ini • ${formatted}`;
			}
			return formatted;
		} catch {
			return dateStr;
		}
	}

	let headerActions = $derived<HeaderAction[]>([
		{
			icon: 'search',
			label: 'Cari Transaksi',
			onclick: () => {
				showSearch = !showSearch;
				if (!showSearch && searchQuery) {
					searchQuery = '';
					fetchTransactions();
				}
			},
			testId: 'transactions-search-button'
		},
		{
			icon: 'tune',
			label: t('transactions.filter'),
			onclick: openFilterSheet,
			activeIndicator: hasActiveFilters,
			testId: 'transactions-filter-button'
		}
	]);
</script>

<svelte:head>
	<title>{t('transactions.title')} - Money Tracker</title>
</svelte:head>

<div class="pt-safe flex flex-col gap-4 px-4 pb-28">
	<!-- AppHeader Sesuai Aturan: Satu Judul Besar, Tanpa Subjudul, Tanpa Tombol Tambah, Maks 2 Ikon (Cari, Filter) -->
	<AppHeader title={t('transactions.title')} actions={headerActions} />

	<!-- Search Input (jika dibuka atau ada query) -->
	{#if showSearch || searchQuery}
		<div
			class="flex items-center rounded-full border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-2"
		>
			<span class="material-symbols-outlined mr-2 text-base text-on-surface-variant">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				oninput={() => fetchTransactions()}
				placeholder="Cari catatan atau nama kategori..."
				class="w-full bg-transparent text-xs font-semibold text-on-surface outline-none"
				data-testid="transaction-search-input"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={() => {
						searchQuery = '';
						fetchTransactions();
					}}
					class="text-on-surface-variant hover:text-on-surface"
					aria-label="Hapus kata kunci pencarian"
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Filter Segmented Control (Semua, Keluar, Masuk, Transfer) -->
	<GlassSegmented options={typeFilterOptions} bind:value={activeType} />

	<!-- Active Filter Chips Bar (Dapat dihapus satu per satu) -->
	{#if hasActiveFilters}
		<div
			class="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1"
			data-testid="active-filters-bar"
		>
			<!-- Chip Pencarian Teks -->
			{#if searchQuery.trim()}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-search"
				>
					<span>Cari: "{searchQuery.trim()}"</span>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeSearchChip}
						aria-label="Hapus filter pencarian"
						data-testid="btn-remove-chip-search"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Chip Tipe Transaksi (jika bukan 'all') -->
			{#if activeType !== 'all'}
				{@const typeLabel =
					typeFilterOptions.find((o) => o.value === activeType)?.label ?? activeType}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-type"
				>
					<span>Tipe: {typeLabel}</span>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeTypeChip}
						aria-label="Hapus filter tipe"
						data-testid="btn-remove-chip-type"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Chip Rentang Tanggal -->
			{#if filterStartDate || filterEndDate}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-dates"
				>
					<span>{filterStartDate || '...'} s/d {filterEndDate || '...'}</span>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeDateChip}
						aria-label="Hapus filter tanggal"
						data-testid="btn-remove-chip-dates"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Chip Dompet Multi-select -->
			{#if filterWalletIds.length > 0}
				{@const wNames = filterWalletIds.map((id) => walletMap.get(id)?.name || 'Dompet')}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-wallets"
				>
					<span>Dompet: {wNames.join(', ')}</span>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeWalletChip}
						aria-label="Hapus filter dompet"
						data-testid="btn-remove-chip-wallets"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Chip Kategori Multi-select -->
			{#if filterCategoryIds.length > 0}
				{@const cNames = filterCategoryIds.map((id) => categoryMap.get(id)?.name || 'Kategori')}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-categories"
				>
					<span>Kategori: {cNames.join(', ')}</span>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeCategoryChip}
						aria-label="Hapus filter kategori"
						data-testid="btn-remove-chip-categories"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Chip Rentang Nominal -->
			{#if filterMinAmount !== '' || filterMaxAmount !== ''}
				<div
					class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
					data-testid="chip-amounts"
				>
					<span
						>Nominal: {filterMinAmount !== '' ? formatRupiah(Number(filterMinAmount)) : 'Rp0'} - {filterMaxAmount !==
						''
							? formatRupiah(Number(filterMaxAmount))
							: 'Bebas'}</span
					>
					<button
						type="button"
						class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
						onclick={removeAmountChip}
						aria-label="Hapus filter nominal"
						data-testid="btn-remove-chip-amounts"
					>
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				</div>
			{/if}

			<!-- Tombol Hapus Semua (jika filter aktif > 1) -->
			{#if activeFilterCount > 1}
				<button
					type="button"
					onclick={clearAllActiveFilters}
					class="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface"
					data-testid="btn-clear-all-filters"
				>
					<span class="material-symbols-outlined text-xs">clear_all</span>
					<span>{t('transactions.hapusSemuaFilter')}</span>
				</button>
			{/if}
		</div>
	{/if}

	<!-- List Transaksi Dikelompokkan per Tanggal -->
	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat riwayat transaksi...
		</div>
	{:else if groups.length === 0}
		<GlassCard variant="regular" class="p-6">
			<GlassEmptyState
				icon="receipt_long"
				title={t('transactions.emptyTitle')}
				description={t('transactions.emptyDesc')}
				actionLabel={t('transactions.tambah')}
				onaction={() => goto('/transactions/new')}
			/>
		</GlassCard>
	{:else}
		<div class="flex flex-col gap-4" data-testid="transactions-list">
			{#each groups as group (group.date)}
				<section class="flex flex-col gap-2">
					<!-- Date Header -->
					<div class="flex items-center justify-between px-1">
						<span class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
							{formatDateHeader(group.date)}
						</span>
						<div class="flex items-center gap-2 text-[11px] font-semibold tabular-nums">
							{#if group.totalExpense > 0}
								<span class="text-expense">-{formatRupiah(group.totalExpense)}</span>
							{/if}
							{#if group.totalIncome > 0}
								<span class="text-income">+{formatRupiah(group.totalIncome)}</span>
							{/if}
						</div>
					</div>

					<!-- Grouped Transactions Card -->
					<GlassCard variant="opaque" class="overflow-hidden">
						{#each group.transactions as tx, i (tx.id)}
							{@const isLast = i === group.transactions.length - 1}
							{@const isExpense = tx.type === 'expense'}
							{@const isIncome = tx.type === 'income'}
							{@const isTransfer = tx.type === 'transfer'}

							{@const title =
								tx.note ||
								(isTransfer
									? `Transfer ke ${tx.toWallet?.name ?? 'Dompet'}`
									: (tx.category?.name ?? (isExpense ? 'Pengeluaran' : 'Pemasukan')))}

							{@const subtitle = isTransfer
								? `${tx.wallet?.name ?? 'Asal'} ➔ ${tx.toWallet?.name ?? 'Tujuan'}${tx.fee > 0 ? ` • Fee ${formatRupiah(tx.fee)}` : ''}`
								: `${tx.wallet?.name ?? 'Dompet'}${tx.category ? ` • ${tx.category.name}` : ''}`}

							{@const leadingIcon = isTransfer
								? 'sync_alt'
								: (tx.category?.icon ??
									(isExpense ? 'arrow_outward' : isIncome ? 'south_west' : 'payments'))}

							{@const leadingIconBg = isTransfer
								? 'var(--color-transfer)'
								: (tx.category?.color ??
									(isExpense ? 'var(--color-expense)' : 'var(--color-income)'))}

							{@const trailingValue = isExpense
								? `-${formatRupiah(tx.amount)}`
								: isIncome
									? `+${formatRupiah(tx.amount)}`
									: formatRupiah(tx.amount)}

							{@const trailingValueColor = isExpense ? 'expense' : isIncome ? 'income' : 'default'}

							<a
								href="/transactions/{tx.id}"
								data-testid="transaction-row"
								class="block transition-colors hover:bg-surface-container-high/40"
							>
								<GlassListRow
									{title}
									{subtitle}
									{leadingIcon}
									{leadingIconBg}
									{trailingValue}
									{trailingValueColor}
									chevron={true}
									showDivider={!isLast}
								/>
							</a>
						{/each}
					</GlassCard>
				</section>
			{/each}
		</div>
	{/if}
</div>

<!-- Bottom Sheet Filter Transaksi Multi-Kriteria -->
<GlassSheet bind:isOpen={isFilterOpen} variant="sheet" title={t('transactions.filterSheetTitle')}>
	<div class="max-h-[75vh] space-y-5 overflow-y-auto px-1 py-2" data-testid="filter-sheet">
		<!-- 1. Rentang Tanggal -->
		<div>
			<div class="mb-1.5 flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">
					{t('transactions.rentangTanggal')}
				</span>
				<div class="flex items-center gap-1.5 text-[10px]">
					<button
						type="button"
						class="rounded-md bg-surface-container px-2 py-0.5 font-medium text-primary hover:bg-primary/10"
						onclick={() => applyDatePreset('thisMonth')}
						data-testid="preset-this-month"
					>
						Bulan Ini
					</button>
					<button
						type="button"
						class="rounded-md bg-surface-container px-2 py-0.5 font-medium text-primary hover:bg-primary/10"
						onclick={() => applyDatePreset('last30Days')}
					>
						30 Hari
					</button>
					<button
						type="button"
						class="hover:bg-surface-variant rounded-md bg-surface-container px-2 py-0.5 font-medium text-on-surface-variant"
						onclick={() => applyDatePreset('allTime')}
					>
						Semua
					</button>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="filter-start-date" class="text-[10px] text-on-surface-variant">Dari</label>
					<input
						id="filter-start-date"
						type="date"
						bind:value={draftStartDate}
						class="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="filter-start-date"
					/>
				</div>
				<div>
					<label for="filter-end-date" class="text-[10px] text-on-surface-variant">Sampai</label>
					<input
						id="filter-end-date"
						type="date"
						bind:value={draftEndDate}
						class="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="filter-end-date"
					/>
				</div>
			</div>
		</div>

		<!-- 2. Multi-Pilih Dompet -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">
					{t('transactions.pilihBanyakDompet')}
				</span>
				{#if draftWalletIds.length > 0}
					<button
						type="button"
						class="text-[10px] font-medium text-primary hover:underline"
						onclick={() => (draftWalletIds = [])}
					>
						Reset ({draftWalletIds.length})
					</button>
				{/if}
			</div>

			<div class="flex flex-wrap gap-1.5" data-testid="filter-wallet-chips">
				{#each wallets as w (w.id)}
					{@const selected = draftWalletIds.includes(w.id)}
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 {selected
							? 'bg-primary text-white shadow-xs'
							: 'border border-outline-variant/30 bg-surface-container-lowest/70 text-on-surface-variant hover:text-on-surface'}"
						onclick={() => toggleDraftWallet(w.id)}
						data-testid="filter-wallet-option-{w.id}"
					>
						<span class="h-2 w-2 rounded-full" style="background: {selected ? '#ffffff' : w.color};"
						></span>
						<span>{w.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 3. Multi-Pilih Kategori -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">
					{t('transactions.pilihBanyakKategori')}
				</span>
				{#if draftCategoryIds.length > 0}
					<button
						type="button"
						class="text-[10px] font-medium text-primary hover:underline"
						onclick={() => (draftCategoryIds = [])}
					>
						Reset ({draftCategoryIds.length})
					</button>
				{/if}
			</div>

			<div
				class="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto"
				data-testid="filter-category-chips"
			>
				{#each categories as cat (cat.id)}
					{@const selected = draftCategoryIds.includes(cat.id)}
					<button
						type="button"
						class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95 {selected
							? 'bg-primary text-white shadow-xs'
							: 'border border-outline-variant/30 bg-surface-container-lowest/70 text-on-surface-variant hover:text-on-surface'}"
						onclick={() => toggleDraftCategory(cat.id)}
						data-testid="filter-category-option-{cat.id}"
					>
						<span class="material-symbols-outlined text-xs">{cat.icon}</span>
						<span>{cat.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 4. Rentang Nominal -->
		<div>
			<span class="mb-1 block text-xs font-bold text-on-surface">
				{t('transactions.rentangNominal')}
			</span>
			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="filter-min-amount" class="text-[10px] text-on-surface-variant">Min (Rp)</label
					>
					<input
						id="filter-min-amount"
						type="number"
						placeholder="0"
						bind:value={draftMinAmount}
						class="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="filter-min-amount"
					/>
				</div>
				<div>
					<label for="filter-max-amount" class="text-[10px] text-on-surface-variant">Max (Rp)</label
					>
					<input
						id="filter-max-amount"
						type="number"
						placeholder="Bebas"
						bind:value={draftMaxAmount}
						class="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="filter-max-amount"
					/>
				</div>
			</div>
		</div>

		<!-- Action Buttons Filter -->
		<div class="flex gap-2.5 pt-2">
			<GlassButton
				variant="secondary"
				size="md"
				class="flex-1"
				onclick={handleResetFilter}
				data-testid="filter-reset-button"
			>
				{t('transactions.resetFilter')}
			</GlassButton>
			<GlassButton
				variant="primary"
				size="md"
				class="flex-1"
				onclick={handleApplyFilter}
				data-testid="filter-apply-button"
			>
				{t('transactions.terapkanFilter')}
			</GlassButton>
		</div>
	</div>
</GlassSheet>
