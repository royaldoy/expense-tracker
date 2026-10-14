<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassSwitch from '$lib/components/glass/GlassSwitch.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { formatRupiah, parseRupiah } from '$lib/domain/money';
	import type { Category, RecurringFrequency, Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import {
		categoryService,
		recurringService,
		walletService,
		type PendingRecurringItem,
		type RecurringRuleWithDetails
	} from '$lib/services';

	let loading = $state(true);
	let rules = $state<RecurringRuleWithDetails[]>([]);
	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let activeTab = $state<'expense' | 'income'>('expense');
	let pendingConfirmations = $state<PendingRecurringItem[]>([]);

	// Modal State Form Tambah / Edit
	let isSheetOpen = $state(false);
	let isEditing = $state(false);
	let editingRuleId = $state<string | null>(null);

	let formType = $state<'expense' | 'income'>('expense');
	let formName = $state('');
	let rawAmountString = $state('50000');
	let formWalletId = $state('');
	let formCategoryId = $state<string | null>(null);
	let formFrequency = $state<RecurringFrequency>('monthly');
	let formStartDate = $state(new Date().toISOString().slice(0, 10));
	let formAutoPost = $state(true);
	let formError = $state('');
	let isSubmitting = $state(false);

	// Dialog Konfirmasi Hapus
	let isDeleteDialogOpen = $state(false);
	let deletingRuleId = $state<string | null>(null);
	let isDeleting = $state(false);

	const parsedAmount = $derived(parseRupiah(rawAmountString));

	const tabOptions = [
		{ value: 'expense', label: 'Pengeluaran' },
		{ value: 'income', label: 'Pemasukan' }
	];

	const frequencyOptions: { value: RecurringFrequency; label: string }[] = [
		{ value: 'daily', label: 'Harian' },
		{ value: 'weekly', label: 'Mingguan' },
		{ value: 'monthly', label: 'Bulanan' },
		{ value: 'yearly', label: 'Tahunan' }
	];

	// Filter aturan berdasarkan tab aktif
	let filteredRules = $derived(rules.filter((r) => (r.template.type ?? 'expense') === activeTab));

	// Hitung total komitmen bulanan terproyeksi
	let totalMonthlyCommitment = $derived.by(() => {
		let total = 0;
		for (const r of rules) {
			if ((r.template.type ?? 'expense') === activeTab) {
				const amt = r.template.amount ?? 0;
				if (r.frequency === 'daily') total += amt * 30;
				else if (r.frequency === 'weekly') total += amt * 4;
				else if (r.frequency === 'monthly') total += amt;
				else if (r.frequency === 'yearly') total += Math.round(amt / 12);
			}
		}
		return total;
	});

	// Kategori sesuai tipe transaksi form
	let availableCategories = $derived(categories.filter((c) => c.kind === formType));

	async function loadData() {
		loading = true;
		try {
			await categoryService.initDefaultCategories();
			const [loadedRules, loadedWallets, loadedCats, runResult] = await Promise.all([
				recurringService.getRules(),
				walletService.getWallets({ includeArchived: false }),
				categoryService.getCategories(),
				recurringService.runDueRecurring()
			]);

			rules = loadedRules;
			wallets = loadedWallets;
			categories = loadedCats;
			pendingConfirmations = runResult.pendingRules;
		} catch (error) {
			console.error('Gagal memuat transaksi berulang:', error);
		} finally {
			loading = false;
		}
	}

	function openCreateSheet() {
		isEditing = false;
		editingRuleId = null;
		formType = activeTab;
		formName = '';
		rawAmountString = '50000';
		formWalletId = wallets[0]?.id ?? '';
		formCategoryId = availableCategories[0]?.id ?? null;
		formFrequency = 'monthly';
		formStartDate = new Date().toISOString().slice(0, 10);
		formAutoPost = true;
		formError = '';
		isSheetOpen = true;
	}

	function openEditSheet(rule: RecurringRuleWithDetails) {
		isEditing = true;
		editingRuleId = rule.id;
		formType = (rule.template.type ?? 'expense') as 'expense' | 'income';
		formName = rule.template.note ?? '';
		rawAmountString = (rule.template.amount ?? 0).toString();
		formWalletId = rule.template.walletId ?? wallets[0]?.id ?? '';
		formCategoryId = rule.template.categoryId ?? null;
		formFrequency = rule.frequency;
		formStartDate = rule.nextRunAt.slice(0, 10);
		formAutoPost = rule.autoPost;
		formError = '';
		isSheetOpen = true;
	}

	function adjustAmount(delta: number) {
		const current = parseRupiah(rawAmountString);
		rawAmountString = Math.max(0, current + delta).toString();
	}

	function resetAmount() {
		rawAmountString = '0';
	}

	async function handleSaveRule() {
		if (!formName.trim()) {
			formError = 'Nama jadwal wajib diisi';
			return;
		}
		if (parsedAmount <= 0) {
			formError = 'Nominal harus lebih dari Rp0';
			return;
		}
		if (!formWalletId) {
			formError = 'Dompet wajib dipilih';
			return;
		}

		isSubmitting = true;
		formError = '';

		try {
			if (isEditing && editingRuleId) {
				await recurringService.updateRule(editingRuleId, {
					name: formName.trim(),
					type: formType,
					amount: parsedAmount,
					walletId: formWalletId,
					categoryId: formCategoryId,
					frequency: formFrequency,
					nextRunAt: formStartDate,
					autoPost: formAutoPost
				});
			} else {
				await recurringService.createRule({
					name: formName.trim(),
					type: formType,
					amount: parsedAmount,
					walletId: formWalletId,
					categoryId: formCategoryId,
					frequency: formFrequency,
					startDate: formStartDate,
					autoPost: formAutoPost
				});
			}

			isSheetOpen = false;
			await loadData();
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Gagal menyimpan jadwal';
		} finally {
			isSubmitting = false;
		}
	}

	async function toggleAutoPost(rule: RecurringRuleWithDetails) {
		try {
			await recurringService.updateRule(rule.id, { autoPost: !rule.autoPost });
			await loadData();
		} catch (error) {
			console.error('Gagal mengubah mode autoPost:', error);
		}
	}

	async function handleConfirmDue(ruleId: string, dates: string[]) {
		try {
			await recurringService.confirmPendingRecurring(ruleId, dates);
			await loadData();
		} catch (error) {
			console.error('Gagal mengonfirmasi transaksi berulang:', error);
		}
	}

	async function handleSkipDue(ruleId: string) {
		try {
			await recurringService.skipPendingRecurring(ruleId);
			await loadData();
		} catch (error) {
			console.error('Gagal melewati jadwal berulang:', error);
		}
	}

	function promptDelete(ruleId: string) {
		deletingRuleId = ruleId;
		isDeleteDialogOpen = true;
	}

	async function handleConfirmDelete() {
		if (!deletingRuleId) return;
		isDeleting = true;
		try {
			await recurringService.deleteRule(deletingRuleId);
			isDeleteDialogOpen = false;
			deletingRuleId = null;
			await loadData();
		} catch (error) {
			console.error('Gagal menghapus jadwal:', error);
		} finally {
			isDeleting = false;
		}
	}

	function getFrequencyLabel(freq: RecurringFrequency): string {
		switch (freq) {
			case 'daily':
				return 'Setiap hari';
			case 'weekly':
				return 'Setiap minggu';
			case 'monthly':
				return 'Setiap bulan';
			case 'yearly':
				return 'Setiap tahun';
		}
	}

	onMount(() => {
		loadData();
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
				<h1 class="text-base font-bold text-on-surface" data-testid="recurring-page-title">
					{t('recurring.title')}
				</h1>
				<p class="text-[11px] font-medium text-on-surface-variant">
					{t('recurring.subtitle')}
				</p>
			</div>
		</div>

		<GlassButton
			variant="primary"
			size="sm"
			class="rounded-full"
			onclick={openCreateSheet}
			data-testid="btn-open-create-recurring"
		>
			<span class="material-symbols-outlined text-base">add</span>
			<span>Tambah</span>
		</GlassButton>
	</header>

	<!-- Segmented Control: Pengeluaran vs Pemasukan -->
	<GlassSegmented
		options={tabOptions}
		bind:value={activeTab}
		onchange={(v) => (activeTab = v as 'expense' | 'income')}
	/>

	{#if loading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat transaksi berulang...
		</div>
	{:else}
		<!-- Summary Liquid Glass Card: Total Komitmen -->
		<div data-testid="hero-recurring-card">
			<GlassCard class="relative overflow-hidden p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
							{activeTab === 'expense' ? 'Total Komitmen Bulanan' : 'Estimasi Pemasukan Bulanan'}
						</p>
						<div class="mt-1 flex items-baseline gap-1.5">
							<span
								class="text-2xl font-extrabold tabular-nums {activeTab === 'expense'
									? 'text-on-surface'
									: 'text-income'}"
								data-testid="recurring-total-commitment"
							>
								{activeTab === 'expense' ? '-' : '+'}{formatRupiah(totalMonthlyCommitment)}
							</span>
							<span class="text-xs font-semibold text-on-surface-variant">/ bulan</span>
						</div>
						<p class="mt-1 text-xs text-on-surface-variant">
							{filteredRules.length} jadwal {activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'} terdaftar
						</p>
					</div>

					<div
						class="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs"
						style="background: {activeTab === 'expense'
							? 'var(--color-primary)'
							: 'var(--color-income)'};"
					>
						<span class="material-symbols-outlined text-xl">event_repeat</span>
					</div>
				</div>

				<!-- Tombol Tambah Cepat -->
				<div class="mt-4">
					<GlassButton
						variant="primary"
						size="md"
						class="w-full gap-2"
						onclick={openCreateSheet}
						data-testid="btn-add-recurring-hero"
					>
						<span class="material-symbols-outlined text-lg">add_circle</span>
						<span>{t('recurring.tambahJadwal')}</span>
					</GlassButton>
				</div>
			</GlassCard>
		</div>

		<!-- Section: Perlu Konfirmasi / Jatuh Tempo (autoPost: false) -->
		{#if pendingConfirmations.length > 0}
			<section class="space-y-2.5" data-testid="pending-confirmations-section">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5">
						<span class="h-2 w-2 animate-pulse rounded-full bg-warning"></span>
						<h2 class="text-xs font-bold tracking-wider text-on-surface uppercase">
							{t('recurring.perluKonfirmasi')} ({pendingConfirmations.length})
						</h2>
					</div>
				</div>

				<div class="space-y-2">
					{#each pendingConfirmations as item (item.rule.id)}
						<GlassCard variant="opaque" class="border border-warning/30 p-3.5">
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
										style="background: {item.category?.color ?? '#ff9500'};"
									>
										<span class="material-symbols-outlined text-xl">
											{item.category?.icon ?? 'notification_important'}
										</span>
									</div>
									<div>
										<h4 class="text-sm font-bold text-on-surface">
											{item.rule.template.note || 'Jadwal Rutin'}
										</h4>
										<p class="text-[11px] font-medium text-warning tabular-nums">
											Jatuh tempo: {item.dueDates.join(', ')}
										</p>
										<p class="text-[10px] text-on-surface-variant">
											Dompet: {item.wallet?.name ?? 'Dompet Utama'}
										</p>
									</div>
								</div>

								<span class="text-sm font-extrabold text-on-surface tabular-nums">
									{formatRupiah(item.rule.template.amount ?? 0)}
								</span>
							</div>

							<!-- Aksi Konfirmasi Manual -->
							<div
								class="mt-3 flex items-center justify-end gap-2 border-t border-surface-container-highest/60 pt-2.5"
							>
								<GlassButton
									variant="ghost"
									size="sm"
									onclick={() => handleSkipDue(item.rule.id)}
									data-testid="btn-skip-due-{item.rule.id}"
								>
									{t('recurring.lewati')}
								</GlassButton>
								<GlassButton
									variant="primary"
									size="sm"
									onclick={() => handleConfirmDue(item.rule.id, item.dueDates)}
									data-testid="btn-confirm-due-{item.rule.id}"
								>
									{t('recurring.catatSekarang')}
								</GlassButton>
							</div>
						</GlassCard>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Section: Daftar Jadwal Berulang -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
					{t('recurring.daftarJadwal')} ({filteredRules.length})
				</h3>
			</div>

			{#if filteredRules.length === 0}
				<GlassCard variant="regular" class="p-2">
					<GlassEmptyState
						icon="event_repeat"
						title={t('recurring.emptyTitle')}
						description={t('recurring.emptyDesc')}
						actionLabel={t('recurring.tambahJadwal')}
						onaction={openCreateSheet}
					/>
				</GlassCard>
			{:else}
				<div class="space-y-2.5" data-testid="recurring-rules-list">
					{#each filteredRules as rule (rule.id)}
						{@const isIncome = rule.template.type === 'income'}
						<div data-testid="rule-card-{rule.id}">
							<GlassCard variant="opaque" class="p-4 transition-all">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
											style="background: {rule.category?.color ??
												(isIncome ? '#006e28' : '#bc000a')};"
										>
											<span class="material-symbols-outlined text-xl">
												{rule.category?.icon ?? (isIncome ? 'payments' : 'receipt_long')}
											</span>
										</div>
										<div>
											<h4
												class="text-sm font-bold text-on-surface"
												data-testid="rule-name-{rule.id}"
											>
												{rule.template.note || 'Jadwal Rutin'}
											</h4>
											<p class="text-[11px] font-medium text-on-surface-variant">
												Jatuh tempo: <strong class="text-on-surface"
													>{rule.nextRunAt.slice(0, 10)}</strong
												>
											</p>
											<span
												class="inline-block rounded-md bg-surface-container-high px-1.5 py-0.5 text-[9px] font-bold text-primary"
											>
												{getFrequencyLabel(rule.frequency)}
											</span>
										</div>
									</div>

									<div class="text-right">
										<p
											class="text-sm font-extrabold tabular-nums {isIncome
												? 'text-income'
												: 'text-on-surface'}"
											data-testid="rule-amount-{rule.id}"
										>
											{isIncome ? '+' : '-'}{formatRupiah(rule.template.amount ?? 0)}
										</p>
										<p class="text-[10px] text-on-surface-variant">
											{rule.wallet?.name ?? 'Dompet'}
										</p>
									</div>
								</div>

								<!-- Auto-post toggle & Actions -->
								<div
									class="mt-3.5 flex items-center justify-between border-t border-surface-container-highest/60 pt-2.5"
								>
									<div class="flex items-center gap-2">
										<GlassSwitch
											checked={rule.autoPost}
											onchange={() => toggleAutoPost(rule)}
											data-testid="toggle-autopost-{rule.id}"
											aria-label="Toggle Catat Otomatis"
										/>
										<span class="text-[11px] font-medium text-on-surface-variant">
											{rule.autoPost ? 'Otomatis' : 'Konfirmasi Manual'}
										</span>
									</div>

									<div class="flex items-center gap-1">
										<GlassButton
											variant="icon"
											size="sm"
											class="h-7 min-h-[28px] w-7 min-w-[28px]"
											onclick={() => openEditSheet(rule)}
											aria-label="Ubah jadwal"
											data-testid="btn-edit-rule-{rule.id}"
										>
											<span class="material-symbols-outlined text-base">edit</span>
										</GlassButton>
										<GlassButton
											variant="icon"
											size="sm"
											class="h-7 min-h-[28px] w-7 min-w-[28px] hover:text-expense"
											onclick={() => promptDelete(rule.id)}
											aria-label="Hapus jadwal"
											data-testid="btn-delete-rule-{rule.id}"
										>
											<span class="material-symbols-outlined text-base">delete</span>
										</GlassButton>
									</div>
								</div>
							</GlassCard>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<!-- Modal Sheet Form Jadwal Berulang (GlassSheet) -->
<GlassSheet
	bind:isOpen={isSheetOpen}
	title={isEditing ? t('recurring.ubahJadwal') : t('recurring.tambahJadwal')}
	subtitle="Tentukan nominal dan siklus pengulangan"
	variant="sheet"
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSaveRule();
		}}
		class="space-y-4 pt-1 pb-4"
	>
		<!-- 1. Tipe Transaksi (Pengeluaran vs Pemasukan) -->
		<div>
			<span class="mb-1 block text-xs font-semibold text-on-surface">Jenis Transaksi</span>
			<GlassSegmented
				options={tabOptions}
				bind:value={formType}
				onchange={(v) => {
					formType = v as 'expense' | 'income';
					formCategoryId = availableCategories[0]?.id ?? null;
				}}
			/>
		</div>

		<!-- 2. Nama Jadwal / Layanan -->
		<div>
			<label for="recurring-name" class="mb-1 block text-xs font-semibold text-on-surface">
				{t('recurring.namaJadwal')}
			</label>
			<input
				id="recurring-name"
				type="text"
				bind:value={formName}
				placeholder={t('recurring.namaPlaceholder')}
				class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-2.5 text-sm font-semibold text-on-surface outline-none focus:border-primary"
				data-testid="recurring-form-name"
			/>
		</div>

		<!-- 3. Nominal Uang Rupiah -->
		<div>
			<label for="recurring-amount" class="mb-1 block text-xs font-semibold text-on-surface">
				Nominal Transaksi
			</label>
			<div
				class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-2.5"
			>
				<span class="mr-2 text-sm font-bold text-on-surface-variant">Rp</span>
				<input
					id="recurring-amount"
					type="text"
					inputmode="numeric"
					bind:value={rawAmountString}
					placeholder="0"
					class="w-full bg-transparent text-base font-bold text-on-surface tabular-nums outline-none"
					data-testid="recurring-form-amount"
				/>
			</div>

			<!-- Quick Add Pills -->
			<div class="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustAmount(50000)}>+50rb</GlassButton
				>
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustAmount(100000)}>+100rb</GlassButton
				>
				<GlassButton
					variant="secondary"
					size="sm"
					class="min-h-[28px] shrink-0 rounded-full px-2.5 py-1"
					onclick={() => adjustAmount(500000)}>+500rb</GlassButton
				>
				<GlassButton
					variant="text"
					size="sm"
					class="ml-auto min-h-[28px] shrink-0 rounded-full px-2.5 py-1 text-expense hover:bg-expense/10"
					onclick={resetAmount}>Reset</GlassButton
				>
			</div>
		</div>

		<!-- 4. Pilihan Dompet & Kategori -->
		<div class="grid grid-cols-2 gap-2">
			<div>
				<label for="recurring-wallet" class="mb-1 block text-xs font-semibold text-on-surface">
					Dompet
				</label>
				<select
					id="recurring-wallet"
					bind:value={formWalletId}
					class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-3 py-2 text-xs font-semibold text-on-surface outline-none"
					data-testid="recurring-form-wallet"
				>
					{#each wallets as w (w.id)}
						<option value={w.id}>{w.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="recurring-category" class="mb-1 block text-xs font-semibold text-on-surface">
					Kategori
				</label>
				<select
					id="recurring-category"
					bind:value={formCategoryId}
					class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-3 py-2 text-xs font-semibold text-on-surface outline-none"
					data-testid="recurring-form-category"
				>
					{#each availableCategories as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- 5. Frekuensi Pengulangan -->
		<div>
			<label
				for="recurring-frequency-group"
				class="mb-1.5 block text-xs font-semibold text-on-surface"
			>
				{t('recurring.frekuensi')}
			</label>
			<div
				id="recurring-frequency-group"
				class="grid grid-cols-4 gap-1.5"
				data-testid="recurring-frequency-options"
			>
				{#each frequencyOptions as opt (opt.value)}
					<GlassButton
						variant={formFrequency === opt.value ? 'primary' : 'secondary'}
						size="sm"
						class="min-h-[36px] py-2"
						onclick={() => (formFrequency = opt.value)}
						data-testid="freq-option-{opt.value}"
					>
						{opt.label}
					</GlassButton>
				{/each}
			</div>
		</div>

		<!-- 6. Tanggal Jatuh Tempo Pertama -->
		<div>
			<label for="recurring-start-date" class="mb-1 block text-xs font-semibold text-on-surface">
				{t('recurring.tanggalMulai')}
			</label>
			<input
				id="recurring-start-date"
				type="date"
				bind:value={formStartDate}
				class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/80 px-4 py-2.5 text-xs font-semibold text-on-surface outline-none"
				data-testid="recurring-form-date"
			/>
		</div>

		<!-- 7. Toggle Mode autoPost -->
		<div class="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/60 p-3.5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface">{t('recurring.autoPostTitle')}</p>
					<p class="text-[11px] text-on-surface-variant">
						{formAutoPost ? t('recurring.autoPostDesc') : t('recurring.manualConfirmDesc')}
					</p>
				</div>
				<GlassSwitch
					checked={formAutoPost}
					onchange={(v) => (formAutoPost = v)}
					data-testid="recurring-form-autopost-toggle"
					aria-label="Toggle autoPost form"
				/>
			</div>
		</div>

		{#if formError}
			<div
				class="border-error/20 bg-error/15 text-error rounded-xl border p-2.5 text-center text-xs font-bold"
				data-testid="recurring-form-error"
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
				disabled={isSubmitting || parsedAmount <= 0}
				data-testid="recurring-form-submit"
			>
				{#if isSubmitting}
					<span>Menyimpan...</span>
				{:else}
					<span class="material-symbols-outlined text-lg">check</span>
					<span>Simpan Jadwal</span>
				{/if}
			</GlassButton>
		</div>
	</form>
</GlassSheet>

<!-- Dialog Konfirmasi Hapus -->
<GlassSheet
	bind:isOpen={isDeleteDialogOpen}
	title={t('recurring.hapusTitle')}
	subtitle={t('recurring.hapusConfirm')}
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
			data-testid="btn-confirm-delete-recurring"
		>
			{isDeleting ? 'Menghapus...' : t('common.hapus')}
		</GlassButton>
	</div>
</GlassSheet>
