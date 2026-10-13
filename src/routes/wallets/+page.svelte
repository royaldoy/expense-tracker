<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import WalletCard from '$lib/components/glass/WalletCard.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import type { Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { walletService } from '$lib/services/walletService';

	let wallets = $state<Wallet[]>([]);
	let totalBalance = $state(0);
	let activeFilter = $state('all');
	let isLoading = $state(true);

	const filterItems = [
		{ value: 'all', label: 'Semua' },
		{ value: 'ewallet', label: 'E-Wallet' },
		{ value: 'bank', label: 'Bank' },
		{ value: 'cash', label: 'Tunai' },
		{ value: 'archived', label: 'Arsip' }
	];

	async function loadData() {
		isLoading = true;
		try {
			wallets = await walletService.getWallets({ includeArchived: true });
			totalBalance = await walletService.getTotalBalance();
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	let filteredWallets = $derived.by(() => {
		if (activeFilter === 'archived') {
			return wallets.filter((w) => w.archivedAt !== null);
		}
		const activeOnly = wallets.filter((w) => w.archivedAt === null);
		if (activeFilter === 'all') return activeOnly;
		return activeOnly.filter((w) => w.type === activeFilter);
	});

	let activeWalletsCount = $derived(wallets.filter((w) => w.archivedAt === null).length);
</script>

<div class="px-5 pt-6 pb-28">
	<!-- Top App Bar -->
	<header class="mb-5 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-black tracking-tight text-on-surface">
				{t('wallets.title')}
			</h1>
			<p class="text-xs text-on-surface-variant">Kelola akun dan pantau saldo keuangan</p>
		</div>
		<a href="/wallets/new" data-testid="wallets-add-button">
			<GlassButton variant="primary" size="sm">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Tambah</span>
			</GlassButton>
		</a>
	</header>

	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat data dompet...
		</div>
	{:else if wallets.length === 0}
		<!-- Empty State Global -->
		<GlassCard variant="regular" class="p-2">
			<GlassEmptyState
				icon="account_balance_wallet"
				title={t('wallets.emptyTitle')}
				description={t('wallets.emptyDesc')}
				actionLabel={t('wallets.tambahDompet')}
				actionHref="/wallets/new"
			/>
		</GlassCard>
	{:else}
		<!-- Hero Total Balance Card -->
		<section class="mb-5">
			<GlassCard variant="opaque" class="relative overflow-hidden p-6">
				<div class="relative z-10">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
							{t('wallets.totalSaldo')}
						</span>
						<span
							class="bg-secondary-container/30 text-secondary flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
						>
							<span class="bg-secondary h-1.5 w-1.5 rounded-full"></span>
							{activeWalletsCount}
							{t('wallets.akunAktif')}
						</span>
					</div>

					<div class="mt-2 flex items-baseline justify-between">
						<h2
							class="text-3xl font-black tracking-tight text-on-surface tabular-nums"
							data-testid="wallets-total-balance"
						>
							{formatRupiah(totalBalance)}
						</h2>
					</div>

					<!-- Quick Transfer Action -->
					<div class="mt-4 flex gap-2 border-t border-outline-variant/30 pt-3">
						<a href="/transfer" class="flex-1">
							<GlassButton variant="secondary" size="sm" class="w-full">
								<span class="material-symbols-outlined text-base">swap_horiz</span>
								<span>Transfer</span>
							</GlassButton>
						</a>
						<a href="/wallets/new" class="flex-1">
							<GlassButton variant="secondary" size="sm" class="w-full">
								<span class="material-symbols-outlined text-base">add_card</span>
								<span>Akun Baru</span>
							</GlassButton>
						</a>
					</div>
				</div>
			</GlassCard>
		</section>

		<!-- Segmented Filter -->
		<section class="mb-4">
			<GlassSegmented options={filterItems} bind:value={activeFilter} />
		</section>

		<!-- Wallet Cards List -->
		{#if filteredWallets.length === 0}
			<GlassCard variant="regular" class="p-4">
				<p class="py-8 text-center text-xs text-on-surface-variant">
					Tidak ada dompet pada kategori ini.
				</p>
			</GlassCard>
		{:else}
			<div class="space-y-3" data-testid="wallets-list">
				{#each filteredWallets as wallet (wallet.id)}
					<WalletCard {wallet} variant="compact" href="/wallets/{wallet.id}" />
				{/each}
			</div>
		{/if}
	{/if}
</div>
