<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import WalletCard from '$lib/components/glass/WalletCard.svelte';
	import { calculateBalanceAdjustment } from '$lib/domain/adjustment';
	import { formatRupiah, parseRupiah } from '$lib/domain/money';
	import type { Transaction, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { walletService } from '$lib/services/walletService';

	const walletId = $derived(page.params.id ?? '');

	let wallet = $state<Wallet | undefined>(undefined);
	let transactions = $state<Transaction[]>([]);
	let isLoading = $state(true);

	// State Modal Sesuaikan Saldo
	let isAdjustSheetOpen = $state(false);
	let rawTargetBalanceString = $state('');
	let adjustNote = $state('');
	let isAdjusting = $state(false);
	let adjustError = $state('');

	const parsedTargetBalance = $derived(parseRupiah(rawTargetBalanceString));
	const adjustment = $derived(
		wallet ? calculateBalanceAdjustment(wallet.balance, parsedTargetBalance) : null
	);

	function openAdjustSheet() {
		if (!wallet) return;
		rawTargetBalanceString = wallet.balance.toString();
		adjustNote = '';
		adjustError = '';
		isAdjustSheetOpen = true;
	}

	async function handleAdjustSubmit() {
		if (!wallet || !adjustment || adjustment.diff === 0) return;
		isAdjusting = true;
		adjustError = '';
		try {
			await walletService.adjustBalance({
				walletId: wallet.id,
				targetBalance: parsedTargetBalance,
				note: adjustNote.trim() || 'Koreksi saldo'
			});
			isAdjustSheetOpen = false;
			await loadData();
		} catch (err: unknown) {
			adjustError = err instanceof Error ? err.message : 'Gagal menyesuaikan saldo';
		} finally {
			isAdjusting = false;
		}
	}

	async function loadData() {
		if (!walletId) return;
		isLoading = true;
		try {
			wallet = await walletService.getWalletById(walletId);
			if (wallet) {
				transactions = await walletService.getTransactionsByWallet(walletId);
			}
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top Bar -->
	<header class="mb-5 flex items-center justify-between">
		<GlassButton
			variant="icon"
			size="sm"
			class="text-on-surface"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</GlassButton>
		<h1 class="text-base font-bold text-on-surface">{t('wallets.detail')}</h1>
		{#if wallet}
			<a href="/wallets/{wallet.id}/edit" data-testid="wallet-detail-edit-button">
				<span
					class="rounded-full bg-surface-container-high/60 px-3 py-1.5 text-xs font-bold text-primary"
				>
					{t('common.edit')}
				</span>
			</a>
		{:else}
			<div class="w-9"></div>
		{/if}
	</header>

	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat detail dompet...
		</div>
	{:else if !wallet}
		<GlassCard variant="regular" class="p-8">
			<p class="text-error text-center text-sm font-semibold">Dompet tidak ditemukan.</p>
			<div class="mt-4 text-center">
				<a href="/wallets">
					<GlassButton variant="secondary" size="sm">Kembali ke Daftar</GlassButton>
				</a>
			</div>
		</GlassCard>
	{:else}
		<!-- Hero Card -->
		<section class="mb-5">
			<WalletCard {wallet} variant="hero" />
		</section>

		<!-- Action Pills (Transfer, Sesuaikan, Catat) -->
		<section class="mb-6 grid grid-cols-3 gap-2">
			<a href="/transfer" class="w-full">
				<GlassButton variant="secondary" size="md" class="w-full flex-col py-2.5">
					<span class="material-symbols-outlined text-base">sync_alt</span>
					<span class="text-xs">Transfer</span>
				</GlassButton>
			</a>
			<GlassButton
				variant="secondary"
				size="md"
				class="w-full flex-col py-2.5"
				onclick={openAdjustSheet}
				data-testid="wallet-adjust-balance-button"
			>
				<span class="material-symbols-outlined text-base">tune</span>
				<span class="text-xs">Sesuaikan</span>
			</GlassButton>
			<a href="/transaksi/baru?walletId={wallet.id}" class="w-full">
				<GlassButton variant="primary" size="md" class="w-full flex-col py-2.5">
					<span class="material-symbols-outlined text-base">add</span>
					<span class="text-xs">Catat</span>
				</GlassButton>
			</a>
		</section>

		<!-- Riwayat Transaksi Dompet -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
					Riwayat Transaksi
				</h3>
				<span class="text-xs font-medium text-on-surface-variant">
					{transactions.length} transaksi
				</span>
			</div>

			{#if transactions.length === 0}
				<GlassCard variant="regular" class="p-2">
					<GlassEmptyState
						icon="receipt_long"
						title={t('wallets.transaksiKosong')}
						description={t('wallets.transaksiKosongDesc')}
						actionLabel="Catat Transaksi"
						actionHref="/transaksi/baru?walletId={wallet.id}"
					/>
				</GlassCard>
			{:else}
				<GlassCard variant="opaque" class="overflow-hidden">
					{#each transactions as tx, i (tx.id)}
						{@const isIncome = tx.type === 'income'}
						{@const isTransfer = tx.type === 'transfer'}
						<GlassListRow
							title={tx.note || (isTransfer ? 'Transfer' : isIncome ? 'Pemasukan' : 'Pengeluaran')}
							subtitle={tx.date}
							leadingIcon={isTransfer ? 'sync_alt' : isIncome ? 'south_west' : 'arrow_outward'}
							leadingIconBg={isTransfer ? '#0070eb' : isIncome ? '#006e28' : '#bc000a'}
							trailingValue={isIncome
								? `+${formatRupiah(tx.amount)}`
								: `-${formatRupiah(tx.amount)}`}
							trailingValueColor={isIncome ? 'income' : 'expense'}
							showDivider={i < transactions.length - 1}
						/>
					{/each}
				</GlassCard>
			{/if}
		</section>

		<!-- Sheet Modal Sesuaikan Saldo -->
		<GlassSheet
			bind:isOpen={isAdjustSheetOpen}
			title="Sesuaikan Saldo"
			subtitle="Koreksi saldo riil {wallet.name}"
			variant="sheet"
		>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleAdjustSubmit();
				}}
				class="space-y-4 pt-2"
			>
				<!-- Saldo Tercatat Saat Ini -->
				<div
					class="rounded-2xl border border-outline-variant/20 bg-surface-container-high/40 p-3.5"
				>
					<span class="text-[11px] font-medium text-on-surface-variant">
						Saldo Tercatat Saat Ini
					</span>
					<div class="mt-0.5 text-base font-extrabold text-on-surface tabular-nums">
						{formatRupiah(wallet.balance)}
					</div>
				</div>

				<!-- Input Saldo Sebenarnya -->
				<div>
					<label
						for="adjust-target-balance"
						class="mb-1.5 block text-xs font-semibold text-on-surface"
					>
						Saldo Riil Sebenarnya
					</label>
					<div
						class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-3"
					>
						<span class="mr-2 text-sm font-bold text-on-surface-variant">Rp</span>
						<input
							id="adjust-target-balance"
							type="text"
							inputmode="numeric"
							bind:value={rawTargetBalanceString}
							placeholder="0"
							class="w-full bg-transparent text-sm font-bold text-on-surface tabular-nums outline-none"
							data-testid="adjust-balance-input"
						/>
					</div>
				</div>

				<!-- Live Difference Preview -->
				{#if adjustment}
					<div
						class="flex items-center gap-2 rounded-2xl border p-3 {adjustment.diff > 0
							? 'border-income/30 bg-income/10 text-income'
							: adjustment.diff < 0
								? 'border-error/30 bg-error/10 text-error'
								: 'border-outline-variant/30 bg-surface-container-high/50 text-on-surface-variant'}"
						data-testid="adjust-diff-preview"
					>
						<span class="material-symbols-outlined text-lg">
							{adjustment.diff > 0
								? 'arrow_upward'
								: adjustment.diff < 0
									? 'arrow_downward'
									: 'check_circle'}
						</span>
						<div class="min-w-0 flex-1 text-xs">
							{#if adjustment.diff > 0}
								<span class="font-bold">+{formatRupiah(adjustment.amount)}</span>
								<span class="text-[11px] opacity-90">
									(Akan dicatat sebagai Pemasukan Koreksi Saldo)
								</span>
							{:else if adjustment.diff < 0}
								<span class="font-bold">-{formatRupiah(adjustment.amount)}</span>
								<span class="text-[11px] opacity-90">
									(Akan dicatat sebagai Pengeluaran Koreksi Saldo)
								</span>
							{:else}
								<span class="font-semibold">
									Rp0 (Saldo sudah sesuai, tidak ada transaksi dicatat)
								</span>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Catatan Koreksi -->
				<div>
					<label for="adjust-note" class="mb-1.5 block text-xs font-medium text-on-surface">
						Catatan Penyesuaian
					</label>
					<input
						id="adjust-note"
						type="text"
						bind:value={adjustNote}
						placeholder="Koreksi saldo"
						class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-3 text-xs font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="adjust-note-input"
					/>
				</div>

				{#if adjustError}
					<div
						class="border-error/20 bg-error/15 text-error rounded-xl border p-2.5 text-center text-xs font-bold"
					>
						{adjustError}
					</div>
				{/if}

				<!-- Tombol Aksi -->
				<div class="pt-2">
					<GlassButton
						type="submit"
						variant="primary"
						size="lg"
						class="w-full"
						disabled={isAdjusting || !adjustment || adjustment.diff === 0}
						data-testid="adjust-balance-submit"
					>
						{#if isAdjusting}
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-lg">check</span>
							<span>Simpan Penyesuaian</span>
						{/if}
					</GlassButton>
				</div>
			</form>
		</GlassSheet>
	{/if}
</div>
