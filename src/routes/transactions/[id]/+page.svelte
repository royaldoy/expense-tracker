<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassListRow from '$lib/components/glass/GlassListRow.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import t from '$lib/i18n';
	import {
		transactionService,
		type TransactionWithDetails
	} from '$lib/services/transactionService';

	let tx = $state<TransactionWithDetails | null>(null);
	let isLoading = $state(true);
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	const id = $derived(page.params.id);

	async function loadTransaction() {
		if (!id) {
			goto('/transactions', { replaceState: true });
			return;
		}
		isLoading = true;
		try {
			const data = await transactionService.getTransactionById(id);
			if (data) {
				tx = data;
			} else {
				goto('/transactions', { replaceState: true });
			}
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadTransaction();
	});

	async function handleDelete() {
		if (!tx) return;
		isDeleting = true;
		try {
			await transactionService.deleteTransaction(tx.id);
			showDeleteConfirm = false;
			goto('/transactions');
		} catch (err: unknown) {
			alert(err instanceof Error ? err.message : 'Gagal menghapus transaksi');
		} finally {
			isDeleting = false;
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
		<h1 class="text-base font-bold text-on-surface">{t('transactions.detailTitle')}</h1>
		<div class="w-9"></div>
	</header>

	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat detail transaksi...
		</div>
	{:else if tx}
		{@const isExpense = tx.type === 'expense'}
		{@const isIncome = tx.type === 'income'}
		{@const isTransfer = tx.type === 'transfer'}

		<!-- Main Amount Display -->
		<GlassCard class="flex flex-col items-center justify-center p-6 text-center">
			<div
				class="mb-2 flex h-13 w-13 items-center justify-center rounded-2xl text-white shadow-xs"
				style="background: {isTransfer
					? 'var(--color-transfer)'
					: (tx.category?.color ?? (isExpense ? 'var(--color-expense)' : 'var(--color-income)'))};"
			>
				<span class="material-symbols-outlined text-2xl">
					{isTransfer
						? 'sync_alt'
						: (tx.category?.icon ??
							(isExpense ? 'arrow_outward' : isIncome ? 'south_west' : 'payments'))}
				</span>
			</div>
			<h2
				class="text-3xl font-bold tabular-nums"
				style="color: {isExpense
					? 'var(--color-expense)'
					: isIncome
						? 'var(--color-income)'
						: 'var(--color-on-surface)'};"
				data-testid="transaction-detail-amount"
			>
				{isExpense ? '-' : isIncome ? '+' : ''}{formatRupiah(tx.amount)}
			</h2>
			<p class="mt-1 text-xs font-semibold text-on-surface-variant">
				{isTransfer ? 'Transfer Antar Dompet' : isExpense ? 'Pengeluaran' : 'Pemasukan'}
				{#if tx.category}
					• {tx.category.name}
				{/if}
			</p>
		</GlassCard>

		<!-- Detail Information (Kartu Konten Hampir Opak) -->
		<GlassCard variant="opaque">
			{#if isTransfer}
				<GlassListRow
					title="Dompet Asal"
					subtitle="Sumber dana"
					trailingValue={tx.wallet?.name ?? '-'}
					trailingValueColor="default"
					showDivider={true}
				/>
				<GlassListRow
					title="Dompet Tujuan"
					subtitle="Penerima dana"
					trailingValue={tx.toWallet?.name ?? '-'}
					trailingValueColor="default"
					showDivider={true}
				/>
				{#if tx.fee > 0}
					<GlassListRow
						title="Biaya Admin"
						subtitle="Dipotong dari dompet asal"
						trailingValue={formatRupiah(tx.fee)}
						trailingValueColor="expense"
						showDivider={true}
					/>
				{/if}
			{:else}
				<GlassListRow
					title="Dompet"
					subtitle="Metode pembayaran"
					trailingValue={tx.wallet?.name ?? '-'}
					trailingValueColor="default"
					showDivider={true}
				/>
				<GlassListRow
					title="Kategori"
					subtitle="Pos pengeluaran / pemasukan"
					trailingValue={tx.category?.name ?? 'Tanpa Kategori'}
					trailingValueColor="default"
					showDivider={true}
				/>
			{/if}

			<GlassListRow
				title="Tanggal Transaksi"
				subtitle="Waktu pencatatan"
				trailingValue={tx.date}
				trailingValueColor="default"
				showDivider={true}
			/>

			{#if tx.note}
				<GlassListRow title="Catatan" subtitle={tx.note} showDivider={false} />
			{/if}
		</GlassCard>

		<!-- Action Buttons -->
		<div class="mt-2 flex flex-col gap-2.5">
			{#if !isTransfer}
				<GlassButton
					variant="secondary"
					size="md"
					onclick={() => goto(`/transactions/${tx?.id}/edit`)}
					data-testid="transaction-detail-edit-button"
				>
					<span class="material-symbols-outlined mr-1 text-lg">edit</span>
					{t('common.edit')} Transaksi
				</GlassButton>
			{/if}

			<GlassButton
				variant="danger"
				size="md"
				onclick={() => (showDeleteConfirm = true)}
				data-testid="transaction-detail-delete-button"
			>
				<span class="material-symbols-outlined mr-1 text-lg">delete</span>
				{t('common.hapus')} Transaksi
			</GlassButton>
		</div>
	{/if}
</div>

<!-- Konfirmasi Hapus via GlassSheet -->
<GlassSheet
	bind:isOpen={showDeleteConfirm}
	variant="dialog"
	title={t('transactions.hapusTitle')}
	subtitle={t('transactions.hapusConfirm')}
>
	<div class="mt-4 flex gap-3">
		<GlassButton
			variant="secondary"
			size="md"
			class="flex-1"
			onclick={() => (showDeleteConfirm = false)}
		>
			{t('common.batal')}
		</GlassButton>
		<GlassButton
			variant="danger"
			size="md"
			class="flex-1"
			disabled={isDeleting}
			onclick={handleDelete}
			data-testid="confirm-delete-tx-button"
		>
			{t('common.hapus')}
		</GlassButton>
	</div>
</GlassSheet>
