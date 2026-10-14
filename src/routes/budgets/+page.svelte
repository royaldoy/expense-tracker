<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah, parseRupiah } from '$lib/domain/money';
	import { formatPeriod, type Period } from '$lib/domain/period';
	import { getNextPeriod, getPreviousPeriod } from '$lib/domain/aggregation';
	import type { Category } from '$lib/domain/types';
	import t from '$lib/i18n';
	import {
		budgetService,
		categoryService,
		settingService,
		type BudgetReportResult,
		type BudgetWithCategoryDetail
	} from '$lib/services';

	let loading = $state(true);
	let report = $state<BudgetReportResult | null>(null);
	let currentPeriod = $state<Period | null>(null);
	let salaryDay = $state(1);
	let categories = $state<Category[]>([]);

	// Modal State Form Atur Anggaran
	let isSheetOpen = $state(false);
	let isEditing = $state(false);
	let editingBudgetId = $state<string | null>(null);
	let selectedCategoryId = $state<string | null>(null);
	let rawLimitString = $state('1000000');
	let alertThreshold = $state(80);
	let formError = $state('');
	let isSubmitting = $state(false);

	// Dialog Konfirmasi Hapus
	let isDeleteDialogOpen = $state(false);
	let deletingBudgetId = $state<string | null>(null);
	let isDeleting = $state(false);

	let periodKey = $derived.by(() => {
		if (!currentPeriod) return '';
		const y = currentPeriod.startDate.getFullYear();
		const m = String(currentPeriod.startDate.getMonth() + 1).padStart(2, '0');
		return `${y}-${m}`;
	});

	let parsedLimit = $derived(parseRupiah(rawLimitString));

	// Filter kategori pengeluaran aktif
	let expenseCategories = $derived(categories.filter((c) => c.kind === 'expense'));

	// Nama bulan & tahun periode untuk header
	let periodMonthLabel = $derived.by(() => {
		if (!currentPeriod) return '';
		return currentPeriod.startDate.toLocaleDateString('id-ID', {
			month: 'long',
			year: 'numeric'
		});
	});

	async function loadBudgetData() {
		loading = true;
		try {
			await categoryService.initDefaultCategories();
			if (!currentPeriod) {
				salaryDay = await settingService.getSalaryDay();
				currentPeriod = await settingService.getCurrentReportPeriod();
			}
			categories = await categoryService.getCategories('expense');
			report = await budgetService.getBudgetReport(currentPeriod, periodKey);
		} catch (error) {
			console.error('Gagal memuat data anggaran:', error);
		} finally {
			loading = false;
		}
	}

	function goToPrevious() {
		if (currentPeriod) {
			currentPeriod = getPreviousPeriod(currentPeriod);
			loadBudgetData();
		}
	}

	function goToNext() {
		if (currentPeriod) {
			currentPeriod = getNextPeriod(currentPeriod);
			loadBudgetData();
		}
	}

	async function resetToTodayPeriod() {
		currentPeriod = await settingService.getCurrentReportPeriod();
		loadBudgetData();
	}

	function openCreateSheet() {
		isEditing = false;
		editingBudgetId = null;
		// Pilih kategori pertama yang belum memiliki anggaran jika ada
		const existingCatIds = new Set(report?.items.map((it) => it.budget.categoryId).filter(Boolean));
		const availableCat = expenseCategories.find((c) => !existingCatIds.has(c.id));
		selectedCategoryId = availableCat ? availableCat.id : (expenseCategories[0]?.id ?? null);
		rawLimitString = '1000000';
		alertThreshold = 80;
		formError = '';
		isSheetOpen = true;
	}

	function openEditSheet(item: BudgetWithCategoryDetail) {
		isEditing = true;
		editingBudgetId = item.budget.id;
		selectedCategoryId = item.budget.categoryId;
		rawLimitString = item.budget.limit.toString();
		alertThreshold = item.budget.alertAt;
		formError = '';
		isSheetOpen = true;
	}

	function adjustLimit(delta: number) {
		const current = parseRupiah(rawLimitString);
		rawLimitString = Math.max(0, current + delta).toString();
	}

	function resetLimit() {
		rawLimitString = '0';
	}

	async function handleSaveBudget() {
		if (parsedLimit <= 0) {
			formError = 'Limit anggaran harus lebih dari Rp0';
			return;
		}

		isSubmitting = true;
		formError = '';

		try {
			if (isEditing && editingBudgetId) {
				await budgetService.updateBudget(editingBudgetId, {
					categoryId: selectedCategoryId,
					limit: parsedLimit,
					alertAt: alertThreshold
				});
			} else {
				await budgetService.setBudget({
					categoryId: selectedCategoryId,
					period: periodKey,
					limit: parsedLimit,
					alertAt: alertThreshold
				});
			}
			isSheetOpen = false;
			await loadBudgetData();
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Gagal menyimpan anggaran';
		} finally {
			isSubmitting = false;
		}
	}

	function promptDelete(budgetId: string) {
		deletingBudgetId = budgetId;
		isDeleteDialogOpen = true;
	}

	async function handleConfirmDelete() {
		if (!deletingBudgetId) return;
		isDeleting = true;
		try {
			await budgetService.deleteBudget(deletingBudgetId);
			isDeleteDialogOpen = false;
			deletingBudgetId = null;
			await loadBudgetData();
		} catch (error) {
			console.error('Gagal menghapus anggaran:', error);
		} finally {
			isDeleting = false;
		}
	}

	onMount(() => {
		loadBudgetData();
	});
</script>

<div class="pt-safe flex flex-col gap-4 px-4 pb-28">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<div class="flex items-center gap-3">
			<GlassButton variant="icon" size="sm" onclick={() => history.back()} aria-label="Kembali">
				<span class="material-symbols-outlined text-xl">arrow_back</span>
			</GlassButton>
			<div>
				<h1 class="text-base font-bold text-on-surface" data-testid="budgets-page-title">
					{t('budgets.title')}
				</h1>
				<p class="text-[11px] font-medium text-on-surface-variant">
					Siklus Tgl {salaryDay} ({periodKey})
				</p>
			</div>
		</div>

		<GlassButton
			variant="primary"
			size="sm"
			class="rounded-full"
			onclick={openCreateSheet}
			data-testid="btn-open-create-budget"
		>
			<span class="material-symbols-outlined text-base">add</span>
			<span>Atur</span>
		</GlassButton>
	</header>

	<!-- Period Navigator Pill -->
	{#if currentPeriod}
		<div class="flex items-center justify-between">
			<div
				class="flex items-center gap-1 rounded-full p-1 shadow-xs"
				style="background: var(--glass-pill-bg); border: 1px solid var(--glass-pill-border);"
			>
				<GlassButton
					variant="icon"
					size="sm"
					class="h-7 min-h-[28px] w-7 min-w-[28px]"
					onclick={goToPrevious}
					aria-label="Bulan sebelumnya"
					data-testid="btn-prev-period"
				>
					<span class="material-symbols-outlined text-base">chevron_left</span>
				</GlassButton>

				<GlassButton
					variant="text"
					size="sm"
					class="min-h-[28px] px-2 py-0 text-xs font-bold text-on-surface"
					onclick={resetToTodayPeriod}
					aria-label="Kembali ke periode aktif"
					data-testid="current-period-btn"
				>
					<span class="material-symbols-outlined text-sm text-primary">calendar_month</span>
					<span>{periodMonthLabel}</span>
				</GlassButton>

				<GlassButton
					variant="icon"
					size="sm"
					class="h-7 min-h-[28px] w-7 min-w-[28px]"
					onclick={goToNext}
					aria-label="Bulan berikutnya"
					data-testid="btn-next-period"
				>
					<span class="material-symbols-outlined text-base">chevron_right</span>
				</GlassButton>
			</div>

			<span class="text-[11px] font-medium text-on-surface-variant">
				{formatPeriod(currentPeriod)}
			</span>
		</div>
	{/if}

	{#if loading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat data anggaran...
		</div>
	{:else if report}
		<!-- Hero Liquid Glass Card: Total Anggaran Bulanan -->
		<div data-testid="hero-budget-card">
			<GlassCard class="relative overflow-hidden p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
							{t('budgets.totalAnggaran')}
						</p>
						<div class="mt-1 flex items-baseline gap-1.5">
							<span
								class="text-2xl font-extrabold text-on-surface tabular-nums"
								data-testid="total-spent-display"
							>
								{formatRupiah(report.overall.totalSpent)}
							</span>
							<span class="text-xs font-semibold text-on-surface-variant tabular-nums">
								/ {formatRupiah(report.overall.totalLimit)}
							</span>
						</div>
					</div>

					<div
						class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-xs {report
							.overall.status === 'lewat'
							? 'bg-expense/10 text-expense'
							: report.overall.status === 'waspada'
								? 'bg-warning/15 text-warning'
								: 'bg-primary/10 text-primary'}"
						data-testid="total-percentage-badge"
					>
						<span class="material-symbols-outlined text-sm">pie_chart</span>
						<span>{report.overall.percentage}%</span>
					</div>
				</div>

				<!-- Visual Progress Bar Liquid Glow -->
				<div class="mt-3.5 h-3 w-full overflow-hidden rounded-full bg-surface-container-highest/70">
					<div
						class="h-full rounded-full transition-all duration-500 {report.overall.status ===
						'lewat'
							? 'bg-expense shadow-[0_0_12px_rgba(188,0,10,0.45)]'
							: report.overall.status === 'waspada'
								? 'bg-warning shadow-[0_0_12px_rgba(255,149,0,0.45)]'
								: 'bg-primary shadow-[0_0_12px_rgba(0,88,188,0.45)]'}"
						style="width: {Math.min(100, report.overall.percentage)}%;"
						data-testid="total-progress-bar"
					></div>
				</div>

				<!-- Sub-metric Pills -->
				<div class="mt-3.5 grid grid-cols-2 gap-2 text-xs">
					<div
						class="flex items-center gap-2 rounded-xl p-2.5"
						style="background: var(--color-surface-container-low);"
					>
						<span
							class="material-symbols-outlined text-base {report.overall.totalRemaining >= 0
								? 'text-income'
								: 'text-expense'}"
						>
							{report.overall.totalRemaining >= 0 ? 'savings' : 'warning'}
						</span>
						<div class="min-w-0">
							<p class="text-[10px] text-on-surface-variant">
								{report.overall.totalRemaining >= 0
									? t('budgets.sisaAlokasi')
									: t('budgets.melebihi')}
							</p>
							<p
								class="truncate font-bold tabular-nums {report.overall.totalRemaining >= 0
									? 'text-income'
									: 'text-expense'}"
								data-testid="total-remaining-display"
							>
								{formatRupiah(Math.abs(report.overall.totalRemaining))}
							</p>
						</div>
					</div>

					<div
						class="flex items-center gap-2 rounded-xl p-2.5"
						style="background: var(--color-surface-container-low);"
					>
						<span class="material-symbols-outlined text-base text-primary">verified</span>
						<div class="min-w-0">
							<p class="text-[10px] text-on-surface-variant">Status</p>
							<p class="truncate font-bold text-on-surface">
								{report.overall.status === 'lewat'
									? 'Melebihi Limit'
									: report.overall.status === 'waspada'
										? 'Perlu Waspada'
										: 'Kondisi Sehat'}
							</p>
						</div>
					</div>
				</div>
			</GlassCard>
		</div>

		<!-- Section: Daftar Anggaran per Kategori -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
					Anggaran Kategori ({report.items.length})
				</h3>
				{#if report.items.length > 0}
					<GlassButton
						variant="text"
						size="sm"
						class="min-h-[24px] p-0 text-xs font-semibold text-primary"
						onclick={openCreateSheet}
					>
						+ Tambah Kategori
					</GlassButton>
				{/if}
			</div>

			{#if report.items.length === 0}
				<GlassCard variant="regular" class="p-2">
					<GlassEmptyState
						icon="pie_chart"
						title={t('budgets.emptyTitle')}
						description={t('budgets.emptyDesc')}
						actionLabel={t('budgets.aturAnggaran')}
						onaction={openCreateSheet}
					/>
				</GlassCard>
			{:else}
				<div class="space-y-2.5" data-testid="budget-items-list">
					{#each report.items as item (item.budget.id)}
						{@const isOver = item.status === 'lewat'}
						{@const isWarn = item.status === 'waspada'}
						<GlassCard variant="opaque" class="p-4 transition-all">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
										style="background: {item.category?.color ?? '#0058bc'};"
									>
										<span class="material-symbols-outlined text-xl">
											{item.category?.icon ?? 'category'}
										</span>
									</div>
									<div>
										<h4 class="text-sm font-bold text-on-surface">
											{item.category?.name ?? 'Total Pengeluaran'}
										</h4>
										<p class="text-[11px] font-medium text-on-surface-variant tabular-nums">
											{formatRupiah(item.spent)} / {formatRupiah(item.budget.limit)}
										</p>
									</div>
								</div>

								<!-- Status Badge & Menu -->
								<div class="flex items-center gap-1.5">
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-bold {isOver
											? 'bg-expense/10 text-expense'
											: isWarn
												? 'bg-warning/15 text-warning'
												: 'bg-income/10 text-income'}"
										data-testid="budget-status-badge-{item.budget.id}"
									>
										{isOver
											? t('budgets.statusLewat')
											: isWarn
												? t('budgets.statusWaspada')
												: t('budgets.statusAman')} ({item.percentage}%)
									</span>

									<!-- Tombol Edit & Hapus -->
									<GlassButton
										variant="icon"
										size="sm"
										class="h-7 min-h-[28px] w-7 min-w-[28px]"
										onclick={() => openEditSheet(item)}
										aria-label="Ubah anggaran"
										data-testid="btn-edit-budget-{item.budget.id}"
									>
										<span class="material-symbols-outlined text-base">edit</span>
									</GlassButton>
									<GlassButton
										variant="icon"
										size="sm"
										class="h-7 min-h-[28px] w-7 min-w-[28px] hover:text-expense"
										onclick={() => promptDelete(item.budget.id)}
										aria-label="Hapus anggaran"
										data-testid="btn-delete-budget-{item.budget.id}"
									>
										<span class="material-symbols-outlined text-base">delete</span>
									</GlassButton>
								</div>
							</div>

							<!-- Category Progress Bar -->
							<div
								class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest"
							>
								<div
									class="h-full rounded-full transition-all duration-300 {isOver
										? 'bg-expense'
										: isWarn
											? 'bg-warning'
											: 'bg-primary'}"
									style="width: {Math.min(100, item.percentage)}%;"
								></div>
							</div>

							<!-- Sisa Informasi -->
							<div class="mt-2 flex items-center justify-between text-[11px]">
								<span class="font-medium text-on-surface-variant">
									{isOver ? t('budgets.melebihi') : t('budgets.sisa')}:
									<strong class="{isOver ? 'text-expense' : 'text-on-surface'} tabular-nums">
										{formatRupiah(Math.abs(item.remaining))}
									</strong>
								</span>
								<span class="text-on-surface-variant">
									Ambang: {item.budget.alertAt}%
								</span>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<!-- Modal Sheet Form Atur Anggaran (GlassSheet) -->
<GlassSheet
	bind:isOpen={isSheetOpen}
	title={isEditing ? t('budgets.ubahAnggaran') : t('budgets.tambahAnggaran')}
	subtitle="Kategori & limit siklus {periodMonthLabel}"
	variant="sheet"
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSaveBudget();
		}}
		class="space-y-4 pt-1 pb-4"
	>
		<!-- 1. Pemilihan Kategori Pengeluaran -->
		<div>
			<span class="mb-2 block text-xs font-semibold text-on-surface">
				{t('budgets.pilihKategori')}
			</span>
			<div class="grid grid-cols-3 gap-2" data-testid="budget-category-selector">
				{#each expenseCategories as cat (cat.id)}
					{@const isSelected = selectedCategoryId === cat.id}
					<GlassCard
						onclick={() => (selectedCategoryId = cat.id)}
						data-testid="category-chip-{cat.id}"
						class="flex flex-col items-center justify-center p-2.5 text-center {isSelected
							? 'bg-primary/10 ring-2 ring-primary'
							: ''}"
					>
						<div
							class="mb-1 flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
							style="background: {cat.color};"
						>
							<span class="material-symbols-outlined text-lg">{cat.icon}</span>
						</div>
						<span class="w-full truncate text-[11px] font-semibold text-on-surface">
							{cat.name}
						</span>
					</GlassCard>
				{/each}
			</div>
		</div>

		<!-- 2. Nominal Limit Bulanan -->
		<div>
			<label for="budget-limit-input" class="mb-1.5 block text-xs font-semibold text-on-surface">
				{t('budgets.limitNominal')}
			</label>
			<div
				class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-3"
			>
				<span class="mr-2 text-sm font-bold text-on-surface-variant">Rp</span>
				<input
					id="budget-limit-input"
					type="text"
					inputmode="numeric"
					bind:value={rawLimitString}
					placeholder="0"
					class="w-full bg-transparent text-base font-bold text-on-surface tabular-nums outline-none"
					data-testid="budget-limit-input"
				/>
			</div>

			<!-- Quick Add Pills -->
			<div class="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustLimit(250000)}>+250rb</GlassButton
				>
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustLimit(500000)}>+500rb</GlassButton
				>
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustLimit(1000000)}>+1jt</GlassButton
				>
				<GlassButton
					variant="text"
					size="sm"
					class="ml-auto min-h-[28px] shrink-0 rounded-full px-2.5 py-1 text-expense hover:bg-expense/10"
					onclick={resetLimit}>Reset</GlassButton
				>
			</div>
		</div>

		<!-- 3. Ambang Peringatan (alertAt) -->
		<div>
			<div class="mb-1.5 flex items-center justify-between text-xs">
				<span class="font-semibold text-on-surface">{t('budgets.ambangPeringatan')}</span>
				<span class="font-bold text-primary tabular-nums" data-testid="alert-threshold-label">
					{alertThreshold}%
				</span>
			</div>
			<div class="flex items-center gap-2">
				{#each [50, 75, 80, 90] as threshold (threshold)}
					<GlassButton
						variant={alertThreshold === threshold ? 'primary' : 'secondary'}
						size="sm"
						class="min-h-[32px] flex-1 py-1.5"
						onclick={() => (alertThreshold = threshold)}
						data-testid="preset-threshold-{threshold}"
					>
						{threshold}%
					</GlassButton>
				{/each}
			</div>
			<p class="mt-1 text-[11px] text-on-surface-variant">
				{t('budgets.ambangDesc', { pct: alertThreshold })}
			</p>
		</div>

		{#if formError}
			<div
				class="border-error/20 bg-error/15 text-error rounded-xl border p-2.5 text-center text-xs font-bold"
				data-testid="budget-form-error"
			>
				{formError}
			</div>
		{/if}

		<!-- Submit Button -->
		<div class="pt-2">
			<GlassButton
				type="submit"
				variant="primary"
				size="lg"
				class="w-full"
				disabled={isSubmitting || parsedLimit <= 0}
				data-testid="budget-form-submit"
			>
				{#if isSubmitting}
					<span>Menyimpan...</span>
				{:else}
					<span class="material-symbols-outlined text-lg">check</span>
					<span>Simpan Anggaran</span>
				{/if}
			</GlassButton>
		</div>
	</form>
</GlassSheet>

<!-- Dialog Konfirmasi Hapus Anggaran -->
<GlassSheet
	bind:isOpen={isDeleteDialogOpen}
	title={t('budgets.hapusTitle')}
	subtitle={t('budgets.hapusConfirm')}
	variant="dialog"
>
	<div class="flex gap-2.5 pt-4">
		<GlassButton
			variant="secondary"
			size="md"
			class="flex-1"
			onclick={() => (isDeleteDialogOpen = false)}
		>
			{t('common.batal')}
		</GlassButton>
		<GlassButton
			variant="danger"
			size="md"
			class="flex-1"
			disabled={isDeleting}
			onclick={handleConfirmDelete}
			data-testid="btn-confirm-delete-budget"
		>
			{isDeleting ? 'Menghapus...' : t('common.hapus')}
		</GlassButton>
	</div>
</GlassSheet>
