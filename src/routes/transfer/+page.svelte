<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import type { Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { transactionService } from '$lib/services/transactionService';
	import { walletService } from '$lib/services/walletService';
	import { triggerHapticNotification } from '$lib/stores/uiStore';

	let rawAmount = $state('0');
	let rawFee = $state('0');
	let date = $state(new Date().toISOString().split('T')[0]);
	let note = $state('');

	let wallets = $state<Wallet[]>([]);
	let sourceWalletId = $state<string>('');
	let destWalletId = $state<string>('');

	let isSourceSheetOpen = $state(false);
	let isDestSheetOpen = $state(false);
	let isFeeSheetOpen = $state(false);
	let isDateSheetOpen = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let showSuccessToast = $state(false);

	let numericAmount = $derived(parseInt(rawAmount, 10) || 0);
	let numericFee = $derived(parseInt(rawFee, 10) || 0);

	let formattedAmount = $derived(formatRupiah(numericAmount));
	let formattedFee = $derived(formatRupiah(numericFee));

	let sourceWallet = $derived(wallets.find((w) => w.id === sourceWalletId));
	let destWallet = $derived(wallets.find((w) => w.id === destWalletId));

	const quickAmounts = [50000, 100000, 200000, 500000];
	const feePresets = [0, 1000, 2500, 6500];

	async function loadWallets() {
		const list = await walletService.getWallets({ includeArchived: false });
		wallets = list;
		if (list.length >= 2) {
			sourceWalletId = list[0].id;
			destWalletId = list[1].id;
		} else if (list.length === 1) {
			sourceWalletId = list[0].id;
		}
	}

	onMount(() => {
		loadWallets();
	});

	function handleSwap() {
		const temp = sourceWalletId;
		sourceWalletId = destWalletId;
		destWalletId = temp;
	}

	function addQuickAmount(nominal: number) {
		rawAmount = (numericAmount + nominal).toString();
	}

	async function handleTransfer() {
		if (numericAmount <= 0) {
			errorMessage = 'Nominal transfer harus lebih dari Rp0';
			return;
		}
		if (!sourceWalletId || !destWalletId) {
			errorMessage = 'Pilih dompet sumber dan dompet tujuan';
			return;
		}
		if (sourceWalletId === destWalletId) {
			errorMessage = 'Dompet sumber dan dompet tujuan tidak boleh sama';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			await transactionService.transfer({
				walletId: sourceWalletId,
				toWalletId: destWalletId,
				amount: numericAmount,
				fee: numericFee,
				date,
				note: note.trim() || null
			});

			triggerHapticNotification('success');
			showSuccessToast = true;
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal melakukan transfer';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="pt-safe flex flex-col gap-4 px-4 pb-28">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<GlassButton
			variant="icon"
			size="sm"
			class="text-on-surface"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</GlassButton>
		<h1 class="text-base font-bold text-on-surface">{t('transfer.title')}</h1>
		<div class="w-9"></div>
	</header>

	<!-- Dompet Asal ke Dompet Tujuan Card -->
	<GlassCard class="p-3.5">
		<div class="flex items-center justify-between gap-2">
			<!-- Dompet Asal Button -->
			<GlassButton
				variant="text"
				size="md"
				class="!h-auto !flex-1 !flex-col !items-start !p-2 !text-left"
				onclick={() => (isSourceSheetOpen = true)}
				data-testid="transfer-src-wallet-trigger"
			>
				<p class="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
					{t('transfer.dompetAsal')}
				</p>
				<p class="truncate text-sm font-bold text-on-surface">
					{sourceWallet?.name ?? 'Pilih Asal'}
				</p>
				<p class="text-[11px] text-on-surface-variant tabular-nums">
					{sourceWallet ? formatRupiah(sourceWallet.balance) : '-'}
				</p>
			</GlassButton>

			<!-- Swap Button -->
			<GlassButton
				variant="icon"
				size="md"
				class="text-primary"
				onclick={handleSwap}
				data-testid="transfer-swap-button"
				aria-label={t('transfer.tukar')}
			>
				<span class="material-symbols-outlined text-xl">sync_alt</span>
			</GlassButton>

			<!-- Dompet Tujuan Button -->
			<GlassButton
				variant="text"
				size="md"
				class="!h-auto !flex-1 !flex-col !items-end !p-2 !text-right"
				onclick={() => (isDestSheetOpen = true)}
				data-testid="transfer-dest-wallet-trigger"
			>
				<p class="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
					{t('transfer.dompetTujuan')}
				</p>
				<p class="truncate text-sm font-bold text-on-surface">
					{destWallet?.name ?? 'Pilih Tujuan'}
				</p>
				<p class="text-[11px] text-on-surface-variant tabular-nums">
					{destWallet ? formatRupiah(destWallet.balance) : '-'}
				</p>
			</GlassButton>
		</div>
	</GlassCard>

	<!-- Nominal Display -->
	<GlassCard class="flex flex-col items-center justify-center px-4 py-5 text-center">
		<span class="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
			{t('transfer.nominalTransfer')}
		</span>
		<div
			class="mt-1 text-3xl font-bold text-on-surface tabular-nums"
			data-testid="transfer-amount-display"
		>
			{formattedAmount}
		</div>

		<!-- Biaya Admin Selector Trigger -->
		<GlassButton
			variant="secondary"
			size="sm"
			class="!mt-2 !inline-flex !min-h-0 !items-center !gap-1.5 !rounded-full !px-3 !py-1 text-xs text-on-surface-variant hover:text-on-surface"
			onclick={() => (isFeeSheetOpen = true)}
			data-testid="transfer-fee-trigger"
		>
			<span>Biaya Admin:</span>
			<span class="font-bold text-expense tabular-nums">{formattedFee}</span>
			<span class="material-symbols-outlined text-sm">edit</span>
		</GlassButton>
	</GlassCard>

	<!-- Quick Amount Chips -->
	<div class="no-scrollbar flex gap-2 overflow-x-auto py-0.5">
		{#each quickAmounts as amt (amt)}
			<GlassButton
				variant="secondary"
				size="sm"
				class="!min-h-0 !rounded-full !px-3 !py-1.5 text-xs font-semibold text-on-surface"
				onclick={() => addQuickAmount(amt)}
				data-testid="transfer-quick-{amt}"
			>
				+{formatRupiah(amt)}
			</GlassButton>
		{/each}
	</div>

	<!-- Selector Tanggal & Catatan -->
	<div class="space-y-2">
		<!-- Tanggal Trigger -->
		<GlassCard
			onclick={() => (isDateSheetOpen = true)}
			class="flex items-center justify-between px-3.5 py-2"
		>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-base text-primary">calendar_today</span>
				<span class="text-xs font-semibold text-on-surface">Tanggal: {date}</span>
			</div>
			<span class="material-symbols-outlined text-base text-on-surface-variant">chevron_right</span>
		</GlassCard>

		<!-- Catatan Input -->
		<div
			class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3.5 py-2"
		>
			<span class="material-symbols-outlined mr-2 text-base text-on-surface-variant">edit_note</span
			>
			<input
				type="text"
				bind:value={note}
				placeholder="Catatan transfer (opsional)..."
				class="w-full bg-transparent text-xs font-semibold text-on-surface outline-none"
				data-testid="transfer-note-input"
			/>
		</div>
	</div>

	{#if errorMessage}
		<div
			class="border-error/20 bg-error/15 text-error rounded-xl border p-2.5 text-center text-xs font-bold"
		>
			{errorMessage}
		</div>
	{/if}

	<!-- Keypad Input Nominal -->
	<GlassKeypad mode="currency" bind:value={rawAmount} />

	<!-- Submit Button -->
	<GlassButton
		variant="primary"
		size="lg"
		class="w-full"
		disabled={isSubmitting}
		onclick={handleTransfer}
		data-testid="transfer-submit-button"
	>
		<span class="material-symbols-outlined mr-1 text-xl">sync_alt</span>
		{t('transfer.kirimTransfer')}
	</GlassButton>
</div>

<!-- Bottom Sheet: Pemilih Dompet Asal -->
<GlassSheet bind:isOpen={isSourceSheetOpen} variant="sheet" title="Pilih Dompet Asal">
	<div class="max-h-72 space-y-2 overflow-y-auto py-2">
		{#each wallets as w (w.id)}
			<GlassButton
				variant="secondary"
				size="md"
				class="!flex !min-h-0 !w-full !items-center !justify-between !p-3 !text-left {sourceWalletId ===
				w.id
					? 'ring-2 ring-primary'
					: 'border border-outline-variant/20'}"
				onclick={() => {
					sourceWalletId = w.id;
					isSourceSheetOpen = false;
				}}
				data-testid="transfer-wallet-option-{w.id}"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
						style="background: {w.color};"
					>
						<span class="material-symbols-outlined text-lg">{w.icon}</span>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface">{w.name}</p>
						<p class="text-[11px] text-on-surface-variant tabular-nums">
							Saldo: {formatRupiah(w.balance)}
						</p>
					</div>
				</div>
				{#if sourceWalletId === w.id}
					<span class="material-symbols-outlined text-lg text-primary">check_circle</span>
				{/if}
			</GlassButton>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Dompet Tujuan -->
<GlassSheet bind:isOpen={isDestSheetOpen} variant="sheet" title="Pilih Dompet Tujuan">
	<div class="max-h-72 space-y-2 overflow-y-auto py-2">
		{#each wallets.filter((w) => w.id !== sourceWalletId) as w (w.id)}
			<GlassButton
				variant="secondary"
				size="md"
				class="!flex !min-h-0 !w-full !items-center !justify-between !p-3 !text-left {destWalletId ===
				w.id
					? 'ring-2 ring-primary'
					: 'border border-outline-variant/20'}"
				onclick={() => {
					destWalletId = w.id;
					isDestSheetOpen = false;
				}}
				data-testid="transfer-dest-option-{w.id}"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
						style="background: {w.color};"
					>
						<span class="material-symbols-outlined text-lg">{w.icon}</span>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface">{w.name}</p>
						<p class="text-[11px] text-on-surface-variant tabular-nums">
							Saldo: {formatRupiah(w.balance)}
						</p>
					</div>
				</div>
				{#if destWalletId === w.id}
					<span class="material-symbols-outlined text-lg text-primary">check_circle</span>
				{/if}
			</GlassButton>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Biaya Admin -->
<GlassSheet bind:isOpen={isFeeSheetOpen} variant="dialog" title="Pilih Biaya Admin">
	<div class="space-y-3 py-2">
		<div class="grid grid-cols-2 gap-2">
			{#each feePresets as fee (fee)}
				<GlassButton
					variant={numericFee === fee ? 'primary' : 'secondary'}
					size="md"
					class="w-full text-center text-xs font-bold"
					onclick={() => {
						rawFee = fee.toString();
						isFeeSheetOpen = false;
					}}
				>
					{fee === 0 ? 'Gratis (Rp0)' : formatRupiah(fee)}
				</GlassButton>
			{/each}
		</div>

		<!-- Custom Fee Input -->
		<div class="pt-2">
			<label for="custom-fee" class="mb-1 block text-xs font-medium text-on-surface">
				Nominal Kustom
			</label>
			<input
				id="custom-fee"
				type="number"
				bind:value={rawFee}
				placeholder="0"
				class="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest/80 px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
				data-testid="transfer-fee-input"
			/>
		</div>

		<GlassButton
			variant="primary"
			size="md"
			class="mt-2 w-full"
			onclick={() => (isFeeSheetOpen = false)}
		>
			{t('common.selesai')}
		</GlassButton>
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Tanggal -->
<GlassSheet bind:isOpen={isDateSheetOpen} variant="dialog" title={t('transactions.pilihTanggal')}>
	<div class="space-y-4 py-2">
		<input
			type="date"
			bind:value={date}
			class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
		/>
		<GlassButton
			variant="primary"
			size="md"
			class="w-full"
			onclick={() => (isDateSheetOpen = false)}
		>
			{t('common.selesai')}
		</GlassButton>
	</div>
</GlassSheet>

<!-- Feedback Sukses via GlassSheet -->
<GlassSheet bind:isOpen={showSuccessToast} variant="dialog">
	<div class="flex flex-col items-center py-2 text-center">
		<div
			class="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
			style="background: var(--color-transfer);"
		>
			<span class="material-symbols-outlined text-3xl">check</span>
		</div>
		<h3 class="text-lg font-bold text-on-surface">{t('transfer.suksesTransfer')}</h3>
		<p class="mt-1 text-xs text-on-surface-variant">
			{formattedAmount} berhasil dipindahkan dari {sourceWallet?.name} ke {destWallet?.name}.
		</p>
		<div class="mt-5 w-full">
			<GlassButton
				variant="primary"
				size="md"
				class="w-full"
				onclick={() => {
					showSuccessToast = false;
					goto('/transactions');
				}}
				data-testid="transfer-success-done-button"
			>
				{t('common.selesai')}
			</GlassButton>
		</div>
	</div>
</GlassSheet>
