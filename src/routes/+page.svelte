<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import AppHeader, { type HeaderAction } from '$lib/components/glass/AppHeader.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import GlassSkeleton from '$lib/components/glass/GlassSkeleton.svelte';
	import { aggregateSummary } from '$lib/domain/aggregation';
	import { calculateOverallBudget, type OverallBudgetSummary } from '$lib/domain/budget';
	import { formatRupiah } from '$lib/domain/money';
	import { formatPeriod, type Period } from '$lib/domain/period';
	import type { Category, Transaction, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import {
		budgetService,
		categoryService,
		settingService,
		transactionService,
		walletService
	} from '$lib/services';
	import { unreadNotificationsCount } from '$lib/stores/notificationStore';
	import { hideBalance, toggleHideBalance } from '$lib/stores/uiStore';
	import { animateCount } from '$lib/utils/motion';

	let wallets = $state<Wallet[]>([]);
	let totalBalance = $state(0);
	let animatedBalance = $state(0);
	let countCancel: (() => void) | null = null;
	let isLoading = $state(true);
	let currentPeriod = $state<Period | null>(null);
	let periodSummary = $state({ income: 0, expense: 0, net: 0 });
	let budgetSummary = $state<OverallBudgetSummary | null>(null);
	let recentTransactions = $state<Transaction[]>([]);
	let categories = $state<Category[]>([]);

	let categoryMap = $derived.by(() => {
		const map = new SvelteMap<string, Category>();
		for (const cat of categories) {
			map.set(cat.id, cat);
		}
		return map;
	});

	let walletMap = $derived.by(() => {
		const map = new SvelteMap<string, Wallet>();
		for (const w of wallets) {
			map.set(w.id, w);
		}
		return map;
	});

	async function loadDashboardData() {
		try {
			const period = await settingService.getCurrentReportPeriod();
			const periodKey = `${period.startDate.getFullYear()}-${String(period.startDate.getMonth() + 1).padStart(2, '0')}`;

			const [loadedWallets, loadedTotal, allTxs, loadedCats, loadedBudgets] = await Promise.all([
				walletService.getWallets({ includeArchived: false }),
				walletService.getTotalBalance(),
				transactionService.getTransactions(),
				categoryService.getCategories(),
				budgetService.getBudgets(periodKey)
			]);

			wallets = loadedWallets;
			totalBalance = loadedTotal;
			currentPeriod = period;
			categories = loadedCats;

			// Hitung ringkasan arus kas periode berjalan via pure domain
			const summary = aggregateSummary(allTxs, period);
			periodSummary = {
				income: summary.income,
				expense: summary.expense,
				net: summary.net
			};

			// Hitung ringkasan anggaran periode berjalan via pure domain (tanpa hitung ulang di komponen)
			const subcategoryMap = new SvelteMap<string, string[]>();
			for (const c of loadedCats) {
				if (c.parentId) {
					const existing = subcategoryMap.get(c.parentId) ?? [];
					existing.push(c.id);
					subcategoryMap.set(c.parentId, existing);
				}
			}
			budgetSummary = calculateOverallBudget(loadedBudgets, allTxs, period, subcategoryMap);

			// Ambil 5 transaksi terbaru aktif
			recentTransactions = allTxs.slice(0, 5);
		} catch (error) {
			console.error('Gagal memuat data dashboard:', error);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const target = totalBalance;
		if (countCancel) countCancel();
		countCancel = animateCount(animatedBalance, target, {
			durationMs: 500,
			onUpdate: (val) => {
				animatedBalance = val;
			}
		});

		return () => {
			if (countCancel) countCancel();
		};
	});

	function getTransactionTitle(tx: Transaction): string {
		if (tx.note && tx.note.trim()) {
			return tx.note;
		}
		if (tx.type === 'transfer') {
			const src = walletMap.get(tx.walletId)?.name ?? 'Dompet';
			const dest = tx.toWalletId ? (walletMap.get(tx.toWalletId)?.name ?? 'Dompet') : 'Dompet';
			return `Transfer ${src} ke ${dest}`;
		}
		if (tx.categoryId) {
			return categoryMap.get(tx.categoryId)?.name ?? 'Transaksi';
		}
		return tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
	}

	function getTransactionSubtitle(tx: Transaction): string {
		const srcWallet = walletMap.get(tx.walletId)?.name ?? '';
		const catName = tx.categoryId ? categoryMap.get(tx.categoryId)?.name : null;

		if (tx.type === 'transfer') {
			const feeText = (tx.fee ?? 0) > 0 ? ` • Fee ${formatRupiah(tx.fee)}` : '';
			return `${srcWallet}${feeText}`;
		}

		return catName ? `${srcWallet} • ${catName}` : srcWallet;
	}

	function getTransactionIcon(tx: Transaction): string {
		if (tx.type === 'transfer') return 'sync_alt';
		if (tx.categoryId) {
			return categoryMap.get(tx.categoryId)?.icon ?? 'payments';
		}
		return tx.type === 'income' ? 'arrow_downward' : 'arrow_upward';
	}

	function getTransactionIconBg(tx: Transaction): string {
		if (tx.type === 'transfer') return 'var(--color-primary, #6366F1)';
		if (tx.categoryId) {
			return (
				categoryMap.get(tx.categoryId)?.color ??
				(tx.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)')
			);
		}
		return tx.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)';
	}

	function getGreeting(): string {
		const hour = new Date().getHours();
		if (hour >= 4 && hour < 11) return 'Selamat Pagi';
		if (hour >= 11 && hour < 15) return 'Selamat Siang';
		if (hour >= 15 && hour < 18) return 'Selamat Sore';
		return 'Selamat Malam';
	}

	let headerActions = $derived<HeaderAction[]>([
		{
			icon: 'notifications',
			label: t('routes.notifikasi'),
			href: '/notifications',
			badgeCount: $unreadNotificationsCount,
			testId: 'btn-notifications-bell'
		},
		{
			icon: 'settings',
			label: t('nav.pengaturan'),
			href: '/settings',
			testId: 'btn-settings'
		}
	]);

	onMount(() => {
		loadDashboardData();
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- AppHeader Sesuai Aturan: Satu Judul Besar (Sapaan), Tanpa Subjudul, Maks 2 Tombol Ikon -->
	<AppHeader title={getGreeting()} actions={headerActions} />

	<!-- Hero Card: Total Saldo Aktif -->
	<GlassCard class="p-6">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
				Total Saldo Aktif
			</span>
			<button
				type="button"
				class="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface"
				onclick={toggleHideBalance}
				aria-label={$hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
			>
				<span class="material-symbols-outlined text-lg">
					{$hideBalance ? 'visibility_off' : 'visibility'}
				</span>
			</button>
		</div>

		<div class="mt-2 mb-4">
			<h2
				class="text-3xl font-bold tracking-tight text-on-surface tabular-nums"
				data-testid="dashboard-total-balance"
			>
				{$hideBalance ? '••••••••' : formatRupiah(animatedBalance)}
			</h2>
			{#if currentPeriod}
				<p class="mt-1 text-[11px] font-medium text-on-surface-variant">
					Periode: {formatPeriod(currentPeriod)}
				</p>
			{/if}
		</div>

		<!-- Cashflow Summary Periode Aktif -->
		<div
			class="grid grid-cols-2 gap-2 rounded-xl p-3"
			style="background: var(--color-surface-container-low);"
		>
			<div class="flex items-center gap-2.5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg text-white"
					style="background: var(--color-income);"
				>
					<span class="material-symbols-outlined text-base">south_west</span>
				</div>
				<div>
					<p class="text-[11px] font-medium text-on-surface-variant">Pemasukan</p>
					<p
						class="text-xs font-bold text-on-surface tabular-nums"
						data-testid="dashboard-period-income"
					>
						{$hideBalance ? '••••' : formatRupiah(periodSummary.income)}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2.5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg text-white"
					style="background: var(--color-expense);"
				>
					<span class="material-symbols-outlined text-base">arrow_outward</span>
				</div>
				<div>
					<p class="text-[11px] font-medium text-on-surface-variant">Pengeluaran</p>
					<p
						class="text-xs font-bold text-on-surface tabular-nums"
						data-testid="dashboard-period-expense"
					>
						{$hideBalance ? '••••' : formatRupiah(periodSummary.expense)}
					</p>
				</div>
			</div>
		</div>
	</GlassCard>

	<!-- Ringkasan Anggaran Bulanan (Dashboard) -->
	{#if budgetSummary}
		<section class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-bold text-on-surface">Anggaran Periode Ini</h3>
				<a
					href="/budgets"
					class="text-xs font-semibold text-primary hover:underline"
					data-testid="dashboard-manage-budgets"
				>
					{budgetSummary.budgetCount > 0
						? `Kelola (${budgetSummary.budgetCount})`
						: 'Atur Anggaran'}
				</a>
			</div>

			{#if budgetSummary.budgetCount === 0}
				<GlassCard variant="regular" class="flex items-center justify-between p-3.5">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
							style="background: var(--color-primary);"
						>
							<span class="material-symbols-outlined text-lg">pie_chart</span>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface">Belum Ada Anggaran</p>
							<p class="text-[11px] text-on-surface-variant">
								Kendalikan pengeluaran dengan limit kategori
							</p>
						</div>
					</div>
					<a href="/budgets">
						<span class="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
							Atur
						</span>
					</a>
				</GlassCard>
			{:else}
				<a href="/budgets" class="block" data-testid="dashboard-budget-card">
					<GlassCard variant="opaque" class="p-4 transition-all hover:border-outline-variant/50">
						<div class="flex items-start justify-between">
							<div>
								<div class="flex items-center gap-1.5">
									<span class="text-xs font-semibold text-on-surface-variant">Terpakai:</span>
									<span
										class="text-xs font-bold text-on-surface tabular-nums"
										data-testid="dashboard-budget-spent"
									>
										{$hideBalance ? '••••' : formatRupiah(budgetSummary.totalSpent)}
									</span>
									<span class="text-[11px] text-on-surface-variant tabular-nums">
										/ {formatRupiah(budgetSummary.totalLimit)}
									</span>
								</div>
								<p class="mt-0.5 text-[11px] font-medium text-on-surface-variant">
									{budgetSummary.totalRemaining >= 0 ? 'Sisa Alokasi' : 'Melebihi'}:
									<strong
										class="{budgetSummary.totalRemaining >= 0
											? 'text-income'
											: 'text-expense'} tabular-nums"
										data-testid="dashboard-budget-remaining"
									>
										{$hideBalance ? '••••' : formatRupiah(Math.abs(budgetSummary.totalRemaining))}
									</strong>
								</p>
							</div>

							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs {budgetSummary.status ===
								'lewat'
									? 'bg-expense/10 text-expense'
									: budgetSummary.status === 'waspada'
										? 'bg-warning/15 text-warning'
										: 'bg-primary/10 text-primary'}"
								data-testid="dashboard-budget-status"
							>
								{budgetSummary.percentage}% ({budgetSummary.status === 'lewat'
									? 'Lewat'
									: budgetSummary.status === 'waspada'
										? 'Waspada'
										: 'Aman'})
							</span>
						</div>

						<!-- Visual Progress Bar -->
						<div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
							<div
								class="h-full rounded-full transition-all duration-300 {budgetSummary.status ===
								'lewat'
									? 'bg-expense'
									: budgetSummary.status === 'waspada'
										? 'bg-warning'
										: 'bg-primary'}"
								style="width: {Math.min(100, budgetSummary.percentage)}%;"
							></div>
						</div>
					</GlassCard>
				</a>
			{/if}
		</section>
	{/if}

	<!-- Strip Dompet Horizontal (Maksimal 4 Dompet) -->
	<section class="flex flex-col gap-2.5">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-bold text-on-surface">{t('nav.dompet')}</h3>
			<a href="/wallets" class="text-xs font-semibold text-primary hover:underline">
				Lihat semua
			</a>
		</div>

		{#if wallets.length === 0}
			<GlassCard class="p-4 text-center">
				<p class="mb-2 text-xs text-on-surface-variant">Belum ada dompet terdaftar.</p>
				<GlassButton
					variant="primary"
					size="sm"
					onclick={() => (window.location.href = '/wallets/new')}
				>
					Buat Dompet Pertama
				</GlassButton>
			</GlassCard>
		{:else}
			<div class="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
				{#each wallets.slice(0, 4) as w (w.id)}
					<a
						href="/wallets/{w.id}"
						class="flex min-w-[140px] flex-1 items-center gap-2.5 rounded-2xl p-2.5 transition-all hover:bg-surface-container active:scale-95"
						style="
							background: var(--glass-card-bg);
							backdrop-filter: blur(var(--glass-card-blur));
							-webkit-backdrop-filter: blur(var(--glass-card-blur));
							border: 1px solid var(--glass-card-border);
						"
						data-testid="home-wallet-chip"
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
							style="background: {w.color};"
						>
							<span class="material-symbols-outlined text-base">{w.icon}</span>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-bold text-on-surface">{w.name}</p>
							<p class="truncate text-[11px] font-semibold text-on-surface-variant tabular-nums">
								{$hideBalance ? '••••' : formatRupiah(w.balance)}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Transaksi Terakhir -->
	<section class="flex flex-col gap-2.5">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-bold text-on-surface">Transaksi Terakhir</h3>
			<a href="/transactions" class="text-xs font-semibold text-primary hover:underline"> Semua </a>
		</div>

		{#if isLoading}
			<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
				<GlassSkeleton height="h-10" delayMs={150} />
				<GlassSkeleton height="h-10" delayMs={150} />
				<GlassSkeleton height="h-10" delayMs={150} />
			</GlassCard>
		{:else if recentTransactions.length === 0}
			<GlassCard variant="opaque" class="p-6">
				<GlassEmptyState
					icon="receipt_long"
					title="Belum Ada Transaksi"
					description="Catat pengeluaran atau pemasukan pertama Anda untuk memulai pelacakan keuangan."
					actionLabel="Catat Sekarang"
					actionHref="/transactions/new"
				/>
			</GlassCard>
		{:else}
			<GlassCard variant="opaque" class="divide-y divide-surface-container-highest">
				{#each recentTransactions as tx, idx (tx.id)}
					<a
						href="/transactions/{tx.id}"
						class="block transition-transform duration-150 select-none active:scale-[0.985]"
						style={idx < 6
							? `animation: vt-fade-in 250ms var(--motion-ease-decelerate, cubic-bezier(0, 0, 0.2, 1)) both; animation-delay: ${idx * 40}ms;`
							: ''}
					>
						<GlassListRow
							title={getTransactionTitle(tx)}
							subtitle={getTransactionSubtitle(tx)}
							leadingIcon={getTransactionIcon(tx)}
							leadingIconBg={getTransactionIconBg(tx)}
							trailingValue={tx.type === 'income'
								? `+${formatRupiah(tx.amount)}`
								: tx.type === 'expense'
									? `-${formatRupiah(tx.amount)}`
									: formatRupiah(tx.amount)}
							trailingValueColor={tx.type === 'income'
								? 'income'
								: tx.type === 'expense'
									? 'expense'
									: 'default'}
							showDivider={idx < recentTransactions.length - 1}
						/>
					</a>
				{/each}
			</GlassCard>
		{/if}
	</section>
</div>
