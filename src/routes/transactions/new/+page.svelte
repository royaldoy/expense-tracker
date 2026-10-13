<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import type { Category, CategoryKind, TransactionType, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { categoryService } from '$lib/services/categoryService';
	import { transactionService } from '$lib/services/transactionService';
	import { walletService } from '$lib/services/walletService';

	// Query param & status reaktif tipe transaksi
	let txType = $state<string>(
		page.url.searchParams.get('type') === 'income' ? 'income' : 'expense'
	);

	$effect(() => {
		const param = page.url.searchParams.get('type');
		txType = param === 'income' ? 'income' : 'expense';
	});

	let rawAmount = $state('0');
	let note = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);

	// Wallets & Categories
	let wallets = $state<Wallet[]>([]);
	let selectedWalletId = $state<string>('');
	let categories = $state<Category[]>([]);
	let selectedCategoryId = $state<string | null>(null);

	// Sheets
	let isWalletSheetOpen = $state(false);
	let isCategorySheetOpen = $state(false);
	let isDateSheetOpen = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	const typeOptions = [
		{ value: 'expense', label: 'Pengeluaran', icon: 'arrow_outward' },
		{ value: 'income', label: 'Pemasukan', icon: 'south_west' }
	];

	let numericAmount = $derived(parseInt(rawAmount, 10) || 0);
	let formattedAmount = $derived(formatRupiah(numericAmount));

	let selectedWallet = $derived(wallets.find((w) => w.id === selectedWalletId));
	let selectedCategory = $derived(categories.find((c) => c.id === selectedCategoryId));

	async function loadData() {
		const wList = await walletService.getWallets({ includeArchived: false });
		wallets = wList;
		if (wList.length > 0 && !selectedWalletId) {
			selectedWalletId = wList[0].id;
		}

		await loadCategoriesForKind();
	}

	async function loadCategoriesForKind() {
		const kind = txType as CategoryKind;
		const cList = await categoryService.getCategories(kind);
		categories = cList;
		if (cList.length > 0) {
			selectedCategoryId = cList[0].id;
		} else {
			selectedCategoryId = null;
		}
	}

	onMount(() => {
		loadData();
	});

	$effect(() => {
		if (txType) {
			loadCategoriesForKind();
		}
	});

	async function handleSave() {
		if (numericAmount <= 0) {
			errorMessage = 'Nominal transaksi harus lebih dari Rp0';
			return;
		}
		if (!selectedWalletId) {
			errorMessage = 'Pilih dompet terlebih dahulu';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			await transactionService.addTransaction({
				type: txType as TransactionType,
				amount: numericAmount,
				walletId: selectedWalletId,
				categoryId: selectedCategoryId,
				date,
				note: note.trim() || null
			});

			goto('/transactions');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan transaksi';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="pt-safe flex flex-col gap-4 px-4 pb-28">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<button
			type="button"
			class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-container-high/60 text-on-surface transition-transform active:scale-95"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</button>
		<h1 class="text-base font-bold text-on-surface">{t('transactions.tambah')}</h1>
		<div class="w-9"></div>
	</header>

	<!-- Segmented Control Tipe Transaksi -->
	<GlassSegmented
		options={typeOptions}
		bind:value={txType}
		onchange={(val) => {
			goto(`/transactions/new?type=${val}`, { replaceState: true });
		}}
	/>

	<!-- Hero Display Nominal -->
	<GlassCard class="flex flex-col items-center justify-center px-4 py-5 text-center">
		<span class="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
			Nominal {txType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
		</span>
		<div
			class="mt-1 text-3xl font-bold tabular-nums"
			style="color: {txType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};"
			data-testid="transaction-form-amount"
		>
			{formattedAmount}
		</div>
	</GlassCard>

	<!-- Selector Dompet & Kategori -->
	<div class="grid grid-cols-2 gap-2.5">
		<!-- Dompet Trigger -->
		<button
			type="button"
			class="cursor-pointer text-left active:scale-[0.98]"
			onclick={() => (isWalletSheetOpen = true)}
			data-testid="transaction-wallet-trigger"
		>
			<GlassCard class="flex items-center gap-3 p-3">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {selectedWallet?.color ?? 'var(--color-primary)'};"
				>
					<span class="material-symbols-outlined text-lg"
						>{selectedWallet?.icon ?? 'account_balance_wallet'}</span
					>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-[10px] text-on-surface-variant uppercase">Dompet</p>
					<p class="truncate text-xs font-bold text-on-surface">
						{selectedWallet?.name ?? 'Pilih Dompet'}
					</p>
				</div>
			</GlassCard>
		</button>

		<!-- Kategori Trigger -->
		<button
			type="button"
			class="cursor-pointer text-left active:scale-[0.98]"
			onclick={() => (isCategorySheetOpen = true)}
			data-testid="transaction-category-trigger"
		>
			<GlassCard class="flex items-center gap-3 p-3">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {selectedCategory?.color ?? 'var(--color-expense)'};"
				>
					<span class="material-symbols-outlined text-lg"
						>{selectedCategory?.icon ?? 'category'}</span
					>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-[10px] text-on-surface-variant uppercase">Kategori</p>
					<p class="truncate text-xs font-bold text-on-surface">
						{selectedCategory?.name ?? 'Tanpa Kategori'}
					</p>
				</div>
			</GlassCard>
		</button>
	</div>

	<!-- Selector Tanggal & Catatan -->
	<div class="space-y-2.5">
		<!-- Tanggal Trigger -->
		<button
			type="button"
			class="w-full cursor-pointer text-left active:scale-[0.99]"
			onclick={() => (isDateSheetOpen = true)}
			data-testid="transaction-date-trigger"
		>
			<GlassCard class="flex items-center justify-between px-3.5 py-2.5">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-lg text-primary">calendar_today</span>
					<span class="text-xs font-semibold text-on-surface">Tanggal: {date}</span>
				</div>
				<span class="material-symbols-outlined text-base text-on-surface-variant"
					>chevron_right</span
				>
			</GlassCard>
		</button>

		<!-- Catatan Input -->
		<div
			class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-3.5 py-2"
		>
			<span class="material-symbols-outlined mr-2 text-base text-on-surface-variant">edit_note</span
			>
			<input
				type="text"
				bind:value={note}
				placeholder={t('transactions.catatanPlaceholder')}
				class="w-full bg-transparent text-xs font-semibold text-on-surface outline-none"
				data-testid="transaction-note-input"
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

	<!-- Tombol Simpan -->
	<GlassButton
		variant="primary"
		size="lg"
		class="w-full"
		disabled={isSubmitting}
		onclick={handleSave}
		data-testid="transaction-form-submit"
	>
		<span class="material-symbols-outlined mr-1 text-xl">check</span>
		{t('common.simpan')}
	</GlassButton>
</div>

<!-- Bottom Sheet: Pemilih Dompet -->
<GlassSheet bind:isOpen={isWalletSheetOpen} variant="sheet" title={t('transactions.pilihDompet')}>
	<div class="max-h-72 space-y-2 overflow-y-auto py-2">
		{#each wallets as w (w.id)}
			<button
				type="button"
				class="flex w-full cursor-pointer items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-surface-container-high/40 active:scale-[0.99] {selectedWalletId ===
				w.id
					? 'ring-2 ring-primary'
					: 'border border-outline-variant/20'}"
				onclick={() => {
					selectedWalletId = w.id;
					isWalletSheetOpen = false;
				}}
				data-testid="wallet-option-{w.id}"
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
				{#if selectedWalletId === w.id}
					<span class="material-symbols-outlined text-lg text-primary">check_circle</span>
				{/if}
			</button>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Kategori -->
<GlassSheet
	bind:isOpen={isCategorySheetOpen}
	variant="sheet"
	title={t('transactions.pilihKategori')}
>
	<div class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto py-2">
		{#each categories as cat (cat.id)}
			<button
				type="button"
				class="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center transition-all active:scale-95 {selectedCategoryId ===
				cat.id
					? 'bg-primary/10 ring-2 ring-primary'
					: 'bg-surface-container-lowest/60 hover:bg-surface-container'}"
				onclick={() => {
					selectedCategoryId = cat.id;
					isCategorySheetOpen = false;
				}}
				data-testid="category-option-{cat.id}"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {cat.color};"
				>
					<span class="material-symbols-outlined text-xl">{cat.icon}</span>
				</div>
				<span class="w-full truncate text-[11px] font-semibold text-on-surface">{cat.name}</span>
			</button>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Tanggal -->
<GlassSheet bind:isOpen={isDateSheetOpen} variant="dialog" title={t('transactions.pilihTanggal')}>
	<div class="space-y-4 py-2">
		<input
			type="date"
			bind:value={date}
			class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
			data-testid="transaction-date-input"
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
