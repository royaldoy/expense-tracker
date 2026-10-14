<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import VoiceInputModal from '$lib/components/voice/VoiceInputModal.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import type { Category, CategoryKind, TransactionType, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { categoryService } from '$lib/services/categoryService';
	import { transactionService } from '$lib/services/transactionService';
	import { walletService } from '$lib/services/walletService';
	import { triggerHapticNotification } from '$lib/stores/uiStore';
	import { voiceTransactionStore } from '$lib/stores/voiceStore';

	// Query param & status reaktif tipe transaksi
	let txType = $state<string>(
		page.url.searchParams.get('type') === 'income'
			? 'income'
			: page.url.searchParams.get('type') === 'transfer'
				? 'transfer'
				: 'expense'
	);

	$effect(() => {
		const param = page.url.searchParams.get('type');
		if (param === 'income' || param === 'expense' || param === 'transfer') {
			txType = param;
		}
	});

	let rawAmount = $state('0');
	let note = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);

	// Wallets & Categories
	let wallets = $state<Wallet[]>([]);
	let selectedWalletId = $state<string>('');
	let toWalletId = $state<string>('');
	let categories = $state<Category[]>([]);
	let selectedCategoryId = $state<string | null>(null);

	// Voice recognition state & uncertainty flags
	let spokenSentence = $state<string | null>(null);
	let isVoiceModalOpen = $state(false);
	let uncertainFlags = $state<{
		type?: boolean;
		amount?: boolean;
		category?: boolean;
		wallet?: boolean;
		toWallet?: boolean;
		date?: boolean;
	}>({});

	// Sheets
	let isWalletSheetOpen = $state(false);
	let isToWalletSheetOpen = $state(false);
	let isCategorySheetOpen = $state(false);
	let isDateSheetOpen = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	const typeOptions = [
		{ value: 'expense', label: 'Pengeluaran', icon: 'arrow_outward' },
		{ value: 'income', label: 'Pemasukan', icon: 'south_west' },
		{ value: 'transfer', label: 'Transfer', icon: 'sync_alt' }
	];

	let numericAmount = $derived(parseInt(rawAmount, 10) || 0);
	let formattedAmount = $derived(formatRupiah(numericAmount));

	let selectedWallet = $derived(wallets.find((w) => w.id === selectedWalletId));
	let destWallet = $derived(wallets.find((w) => w.id === toWalletId));
	let selectedCategory = $derived(categories.find((c) => c.id === selectedCategoryId));

	let hasAnyUncertain = $derived(
		Boolean(
			uncertainFlags.type ||
			uncertainFlags.amount ||
			uncertainFlags.category ||
			uncertainFlags.wallet ||
			uncertainFlags.toWallet ||
			uncertainFlags.date
		)
	);

	async function loadData() {
		const wList = await walletService.getWallets({ includeArchived: false });
		wallets = wList;

		// Periksa apakah ada hasil pengenalan suara dari voiceTransactionStore
		const voiceData = voiceTransactionStore.consume();
		if (voiceData) {
			spokenSentence = voiceData.rawText;
			txType = voiceData.parsed.type;
			rawAmount =
				voiceData.parsed.amount !== null && voiceData.parsed.amount > 0
					? voiceData.parsed.amount.toString()
					: '0';

			if (voiceData.parsed.walletId) {
				selectedWalletId = voiceData.parsed.walletId;
			} else if (wList.length > 0) {
				selectedWalletId = wList[0].id;
			}

			if (voiceData.parsed.toWalletId) {
				toWalletId = voiceData.parsed.toWalletId;
			} else if (wList.length > 1) {
				toWalletId = wList.find((w) => w.id !== selectedWalletId)?.id ?? wList[1].id;
			}

			if (voiceData.parsed.categoryId) {
				selectedCategoryId = voiceData.parsed.categoryId;
			}

			date = voiceData.parsed.date.toISOString().split('T')[0];
			note = voiceData.parsed.note ?? '';
			uncertainFlags = voiceData.parsed.uncertainFlags ?? {};
		} else {
			if (wList.length > 0 && !selectedWalletId) {
				selectedWalletId = wList[0].id;
			}
			if (wList.length > 1 && !toWalletId) {
				toWalletId = wList.find((w) => w.id !== selectedWalletId)?.id ?? wList[1].id;
			}
		}

		if (txType !== 'transfer') {
			await loadCategoriesForKind();
		}
	}

	async function loadCategoriesForKind() {
		if (txType === 'transfer') return;
		const kind = txType as CategoryKind;
		const cList = await categoryService.getCategories(kind);
		categories = cList;

		// Jika kategori belum dipilih atau tidak ada di jenis baru, set default
		if (!selectedCategoryId || !cList.some((c) => c.id === selectedCategoryId)) {
			if (cList.length > 0) {
				selectedCategoryId = cList[0].id;
			} else {
				selectedCategoryId = null;
			}
		}
	}

	onMount(() => {
		loadData();
	});

	$effect(() => {
		if (txType && txType !== 'transfer') {
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

		if (txType === 'transfer') {
			if (!toWalletId) {
				errorMessage = 'Pilih dompet tujuan transfer';
				return;
			}
			if (selectedWalletId === toWalletId) {
				errorMessage = 'Dompet sumber dan dompet tujuan tidak boleh sama';
				return;
			}
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			if (txType === 'transfer') {
				await transactionService.transfer({
					walletId: selectedWalletId,
					toWalletId,
					amount: numericAmount,
					fee: 0,
					date,
					note: note.trim() || null
				});
			} else {
				await transactionService.addTransaction({
					type: txType as TransactionType,
					amount: numericAmount,
					walletId: selectedWalletId,
					categoryId: selectedCategoryId,
					date,
					note: note.trim() || null
				});
			}

			triggerHapticNotification('success');
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
		<GlassButton
			variant="icon"
			size="sm"
			class="text-on-surface"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</GlassButton>
		<h1 class="text-base font-bold text-on-surface">{t('transactions.tambah')}</h1>
		<!-- Tombol Pintas Suara -->
		<GlassButton
			variant="icon"
			size="sm"
			class="text-primary"
			onclick={() => (isVoiceModalOpen = true)}
			aria-label="Input Suara"
			data-testid="header-voice-button"
		>
			<span class="material-symbols-outlined text-xl">mic</span>
		</GlassButton>
	</header>

	<!-- Banner Hasil Suara & Penanda Konfirmasi -->
	{#if spokenSentence}
		<div
			class="flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-left"
			data-testid="voice-banner"
		>
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-xs"
				style="background: var(--color-primary);"
			>
				<span class="material-symbols-outlined text-base">mic</span>
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-[11px] font-bold text-on-surface">
					<span class="text-primary">{t('voice.spokenPromptPrefix')}</span>
					"{spokenSentence}"
				</p>
				{#if hasAnyUncertain}
					<p
						class="mt-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
						data-testid="voice-uncertain-banner-tip"
					>
						{t('voice.uncertainTip')}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Segmented Control Tipe Transaksi (Pengeluaran, Pemasukan, Transfer) -->
	<div class="relative">
		<GlassSegmented
			options={typeOptions}
			bind:value={txType}
			onchange={(val) => {
				uncertainFlags.type = false;
				goto(`/transactions/new?type=${val}`, { replaceState: true });
			}}
		/>
		{#if uncertainFlags.type}
			<div
				class="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400"
				data-testid="uncertain-badge-type"
			>
				<span class="material-symbols-outlined text-xs">warning</span>
				<span>{t('voice.uncertainBadge')}: Tipe transaksi</span>
			</div>
		{/if}
	</div>

	<!-- Hero Display Nominal -->
	<GlassCard class="relative flex flex-col items-center justify-center px-4 py-5 text-center">
		<div class="flex items-center gap-1.5">
			<span class="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
				Nominal {txType === 'expense'
					? 'Pengeluaran'
					: txType === 'income'
						? 'Pemasukan'
						: 'Transfer'}
			</span>
			{#if uncertainFlags.amount}
				<span
					class="flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400"
					data-testid="uncertain-badge-amount"
				>
					<span class="material-symbols-outlined text-xs">warning</span>
					{t('voice.uncertainBadge')}
				</span>
			{/if}
		</div>
		<div
			class="mt-1 text-3xl font-bold tabular-nums"
			style="color: {txType === 'expense'
				? 'var(--color-expense)'
				: txType === 'income'
					? 'var(--color-income)'
					: 'var(--color-transfer)'};"
			data-testid="transaction-form-amount"
		>
			{formattedAmount}
		</div>
	</GlassCard>

	<!-- Selector Dompet & Kategori (atau Dompet Asal & Dompet Tujuan bila Transfer) -->
	<div class="grid grid-cols-2 gap-2.5">
		<!-- Dompet Utama / Asal Trigger -->
		<GlassCard
			onclick={() => (isWalletSheetOpen = true)}
			data-testid="transaction-wallet-trigger"
			class="relative flex items-center gap-3 p-3"
		>
			{#if uncertainFlags.wallet}
				<span
					class="py-0.2 absolute top-1.5 right-2 flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400"
					data-testid="uncertain-badge-wallet"
				>
					<span class="material-symbols-outlined text-[10px]">warning</span>
				</span>
			{/if}
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
				style="background: {selectedWallet?.color ?? 'var(--color-primary)'};"
			>
				<span class="material-symbols-outlined text-lg"
					>{selectedWallet?.icon ?? 'account_balance_wallet'}</span
				>
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-[10px] text-on-surface-variant uppercase">
					{txType === 'transfer' ? 'Dari Dompet' : 'Dompet'}
				</p>
				<p class="truncate text-xs font-bold text-on-surface">
					{selectedWallet?.name ?? 'Pilih Dompet'}
				</p>
			</div>
		</GlassCard>

		{#if txType === 'transfer'}
			<!-- Dompet Tujuan Transfer Trigger -->
			<GlassCard
				onclick={() => (isToWalletSheetOpen = true)}
				data-testid="transaction-towallet-trigger"
				class="relative flex items-center gap-3 p-3"
			>
				{#if uncertainFlags.toWallet}
					<span
						class="py-0.2 absolute top-1.5 right-2 flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400"
						data-testid="uncertain-badge-towallet"
					>
						<span class="material-symbols-outlined text-[10px]">warning</span>
					</span>
				{/if}
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {destWallet?.color ?? 'var(--color-transfer)'};"
				>
					<span class="material-symbols-outlined text-lg"
						>{destWallet?.icon ?? 'account_balance_wallet'}</span
					>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-[10px] text-on-surface-variant uppercase">Ke Dompet</p>
					<p class="truncate text-xs font-bold text-on-surface">
						{destWallet?.name ?? 'Pilih Tujuan'}
					</p>
				</div>
			</GlassCard>
		{:else}
			<!-- Kategori Trigger (Expense / Income) -->
			<GlassCard
				onclick={() => (isCategorySheetOpen = true)}
				data-testid="transaction-category-trigger"
				class="relative flex items-center gap-3 p-3"
			>
				{#if uncertainFlags.category}
					<span
						class="py-0.2 absolute top-1.5 right-2 flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400"
						data-testid="uncertain-badge-category"
					>
						<span class="material-symbols-outlined text-[10px]">warning</span>
					</span>
				{/if}
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
		{/if}
	</div>

	<!-- Selector Tanggal & Catatan -->
	<div class="space-y-2.5">
		<!-- Tanggal Trigger -->
		<GlassCard
			onclick={() => (isDateSheetOpen = true)}
			data-testid="transaction-date-trigger"
			class="relative flex items-center justify-between px-3.5 py-2.5"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-lg text-primary">calendar_today</span>
				<span class="text-xs font-semibold text-on-surface">Tanggal: {date}</span>
				{#if uncertainFlags.date}
					<span
						class="py-0.2 flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400"
						data-testid="uncertain-badge-date"
					>
						<span class="material-symbols-outlined text-[10px]">warning</span>
						{t('voice.uncertainBadge')}
					</span>
				{/if}
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
	<GlassKeypad
		mode="currency"
		bind:value={rawAmount}
		onkeypress={() => {
			uncertainFlags.amount = false;
		}}
		ondelete={() => {
			uncertainFlags.amount = false;
		}}
	/>

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

<!-- Bottom Sheet: Pemilih Dompet Sumber -->
<GlassSheet bind:isOpen={isWalletSheetOpen} variant="sheet" title={t('transactions.pilihDompet')}>
	<div class="max-h-72 space-y-2 overflow-y-auto py-2">
		{#each wallets as w (w.id)}
			<GlassButton
				variant="secondary"
				size="md"
				class="!flex !min-h-0 !w-full !items-center !justify-between !p-3 !text-left {selectedWalletId ===
				w.id
					? 'ring-2 ring-primary'
					: 'border border-outline-variant/20'}"
				onclick={() => {
					selectedWalletId = w.id;
					uncertainFlags.wallet = false;
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
			</GlassButton>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Dompet Tujuan (Khusus Transfer) -->
<GlassSheet bind:isOpen={isToWalletSheetOpen} variant="sheet" title="Pilih Dompet Tujuan">
	<div class="max-h-72 space-y-2 overflow-y-auto py-2">
		{#each wallets as w (w.id)}
			{#if w.id !== selectedWalletId}
				<GlassButton
					variant="secondary"
					size="md"
					class="!flex !min-h-0 !w-full !items-center !justify-between !p-3 !text-left {toWalletId ===
					w.id
						? 'ring-2 ring-primary'
						: 'border border-outline-variant/20'}"
					onclick={() => {
						toWalletId = w.id;
						uncertainFlags.toWallet = false;
						isToWalletSheetOpen = false;
					}}
					data-testid="towallet-option-{w.id}"
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
					{#if toWalletId === w.id}
						<span class="material-symbols-outlined text-lg text-primary">check_circle</span>
					{/if}
				</GlassButton>
			{/if}
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
			<GlassButton
				variant={selectedCategoryId === cat.id ? 'primary' : 'secondary'}
				size="md"
				class="!flex !h-auto !flex-col !items-center !justify-center !px-2 !py-2.5 text-center"
				onclick={() => {
					selectedCategoryId = cat.id;
					uncertainFlags.category = false;
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
			</GlassButton>
		{/each}
	</div>
</GlassSheet>

<!-- Bottom Sheet: Pemilih Tanggal -->
<GlassSheet bind:isOpen={isDateSheetOpen} variant="dialog" title={t('transactions.pilihTanggal')}>
	<div class="space-y-4 py-2">
		<input
			type="date"
			bind:value={date}
			onchange={() => {
				uncertainFlags.date = false;
			}}
			class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
			data-testid="transaction-date-input"
		/>
		<GlassButton
			variant="primary"
			size="md"
			class="w-full"
			onclick={() => (isDateSheetOpen = false)}
		>
			Pilih Tanggal
		</GlassButton>
	</div>
</GlassSheet>

<!-- Modal Input Suara -->
<VoiceInputModal bind:isOpen={isVoiceModalOpen} />
