<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import type { Category, CategoryKind, ULID } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { categoryService, type CategoryWithChildren } from '$lib/services/categoryService';

	let activeKind = $state<string>('expense');
	let searchQuery = $state('');
	let categories = $state<CategoryWithChildren[]>([]);
	let allParents = $state<Category[]>([]);
	let isLoading = $state(true);

	// Expanded accordion parent IDs
	let expandedParents = new SvelteSet<string>();

	// Sheet state
	let isSheetOpen = $state(false);
	let isEditing = $state(false);
	let isEditingSystem = $state(false);
	let editingId = $state<ULID | null>(null);

	// Sheet form fields
	let formName = $state('');
	let formKind = $state<string>('expense');
	let formParentId = $state<ULID | null>(null);
	let formColor = $state('#0058bc');
	let formIcon = $state('category');
	let formOrder = $state(1);
	let formError = $state('');
	let isSubmitting = $state(false);

	// Delete confirmation
	let showDeleteDialog = $state(false);

	const kindItems = [
		{ value: 'expense', label: 'Pengeluaran' },
		{ value: 'income', label: 'Pemasukan' }
	];

	const colorOptions = [
		'#bc000a',
		'#0058bc',
		'#006e28',
		'#904a00',
		'#684fa2',
		'#006877',
		'#e2241f',
		'#303032'
	];

	const iconOptions = [
		'restaurant',
		'local_cafe',
		'shopping_bag',
		'shopping_cart',
		'directions_car',
		'local_gas_station',
		'receipt_long',
		'bolt',
		'wifi',
		'movie',
		'medical_services',
		'payments',
		'card_giftcard',
		'trending_up',
		'savings',
		'category'
	];

	async function loadCategories() {
		isLoading = true;
		try {
			await categoryService.initDefaultCategories();
			const kind = activeKind as CategoryKind;
			categories = await categoryService.getCategoriesWithSubcategories(kind);
			const all = await categoryService.getCategories(kind);
			allParents = all.filter((c) => c.parentId === null);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadCategories();
	});

	$effect(() => {
		if (activeKind) {
			loadCategories();
		}
	});

	function toggleExpand(id: string) {
		if (expandedParents.has(id)) {
			expandedParents.delete(id);
		} else {
			expandedParents.add(id);
		}
	}

	function openAddModal(parentId: ULID | null = null) {
		isEditing = false;
		isEditingSystem = false;
		editingId = null;
		formName = '';
		formKind = activeKind;
		formParentId = parentId;
		formColor = colorOptions[0];
		formIcon = iconOptions[0];
		formOrder = categories.length + 1;
		formError = '';
		isSheetOpen = true;
	}

	function openEditModal(cat: Category) {
		isEditing = true;
		isEditingSystem = !!cat.isSystem;
		editingId = cat.id;
		formName = cat.name;
		formKind = cat.kind;
		formParentId = cat.parentId;
		formColor = cat.color;
		formIcon = cat.icon;
		formOrder = cat.order;
		formError = '';
		isSheetOpen = true;
	}

	async function handleSaveCategory() {
		if (!formName.trim()) {
			formError = 'Nama kategori wajib diisi';
			return;
		}

		isSubmitting = true;
		formError = '';
		try {
			if (isEditing && editingId) {
				await categoryService.updateCategory(editingId, {
					name: formName.trim(),
					kind: formKind as CategoryKind,
					parentId: formParentId,
					icon: formIcon,
					color: formColor,
					order: formOrder
				});
			} else {
				await categoryService.createCategory({
					name: formName.trim(),
					kind: formKind as CategoryKind,
					parentId: formParentId,
					icon: formIcon,
					color: formColor,
					order: formOrder
				});
			}
			isSheetOpen = false;
			await loadCategories();
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDeleteCategory() {
		showDeleteDialog = false;
		if (!editingId) return;

		try {
			await categoryService.deleteCategory(editingId);
			isSheetOpen = false;
			await loadCategories();
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Gagal menghapus kategori';
		}
	}

	let filteredCategories = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return categories;

		return categories.filter(
			(parent) =>
				parent.name.toLowerCase().includes(q) ||
				parent.subcategories.some((sub) => sub.name.toLowerCase().includes(q))
		);
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top Bar -->
	<header class="mb-5 flex items-center justify-between">
		<GlassButton variant="icon" size="sm" onclick={() => history.back()} aria-label="Kembali">
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</GlassButton>
		<h1 class="text-base font-bold text-on-surface">{t('categories.title')}</h1>
		<GlassButton
			variant="primary"
			size="sm"
			class="h-9 min-h-[36px] w-9 min-w-[36px] rounded-full p-0"
			onclick={() => openAddModal(null)}
			data-testid="category-add-header-btn"
			aria-label="Tambah Kategori"
		>
			<span class="material-symbols-outlined text-xl">add</span>
		</GlassButton>
	</header>

	<!-- Kind Tabs (Pengeluaran vs Pemasukan) -->
	<section class="mb-4">
		<GlassSegmented options={kindItems} bind:value={activeKind} />
	</section>

	<!-- Search Bar -->
	<section class="mb-4">
		<div
			class="flex items-center rounded-full border border-outline-variant/30 bg-surface-container-lowest/60 px-4 py-2.5"
		>
			<span class="material-symbols-outlined mr-2 text-lg text-on-surface-variant">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={t('common.cari')}
				class="w-full bg-transparent text-xs font-semibold text-on-surface outline-none"
				data-testid="category-search-input"
			/>
			{#if searchQuery}
				<GlassButton
					variant="icon"
					size="sm"
					class="h-6 min-h-[24px] w-6 min-w-[24px]"
					onclick={() => (searchQuery = '')}
					aria-label="Hapus pencarian"
				>
					<span class="material-symbols-outlined text-base">close</span>
				</GlassButton>
			{/if}
		</div>
	</section>

	<!-- Categories Accordion List -->
	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat kategori...
		</div>
	{:else if filteredCategories.length === 0}
		<GlassCard variant="regular" class="p-4">
			<GlassEmptyState
				icon="category"
				title={t('categories.emptyTitle')}
				description={t('categories.emptyDesc')}
				actionLabel={t('categories.tambahKategori')}
				onaction={() => openAddModal(null)}
			/>
		</GlassCard>
	{:else}
		<div class="space-y-3" data-testid="categories-list">
			{#each filteredCategories as category (category.id)}
				{@const isExpanded = expandedParents.has(category.id)}
				<GlassCard variant="opaque" class="p-3.5 transition-all">
					<!-- Parent Row -->
					<div class="flex items-center justify-between">
						<GlassButton
							variant="text"
							class="flex min-h-0 flex-1 items-center gap-3 p-0 text-left hover:bg-transparent"
							onclick={() => toggleExpand(category.id)}
						>
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
								style="background: {category.color};"
							>
								<span class="material-symbols-outlined text-xl">{category.icon}</span>
							</div>
							<div class="min-w-0 flex-1">
								<h4 class="flex items-center gap-1.5 truncate text-sm font-bold text-on-surface">
									<span>{category.name}</span>
									{#if category.isSystem}
										<span
											class="bg-secondary-container/50 text-on-secondary-container rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
										>
											Sistem
										</span>
									{/if}
								</h4>
								<span class="text-[11px] font-medium text-on-surface-variant">
									{category.subcategories.length}
									{t('categories.subkategori')}
								</span>
							</div>
							{#if category.subcategories.length > 0}
								<span
									class="material-symbols-outlined text-lg text-on-surface-variant transition-transform duration-200 {isExpanded
										? 'rotate-180'
										: ''}"
								>
									expand_more
								</span>
							{/if}
						</GlassButton>

						<!-- Edit Parent Button -->
						<GlassButton
							variant="icon"
							size="sm"
							class="ml-2 h-8 min-h-[32px] w-8 min-w-[32px]"
							onclick={() => openEditModal(category)}
							data-testid="edit-category-{category.id}"
							aria-label="Edit Kategori"
						>
							<span class="material-symbols-outlined text-base">edit</span>
						</GlassButton>
					</div>

					<!-- Subcategories Drawer -->
					{#if isExpanded && category.subcategories.length > 0}
						<div class="mt-3 space-y-1.5 border-t border-outline-variant/30 pt-3">
							{#each category.subcategories as sub (sub.id)}
								<div
									class="flex items-center justify-between rounded-xl bg-surface-container-low/50 px-3 py-2"
								>
									<div class="flex items-center gap-2.5">
										<div
											class="flex h-7 w-7 items-center justify-center rounded-lg text-white"
											style="background: {category.color}; opacity: 0.85;"
										>
											<span class="material-symbols-outlined text-sm">{sub.icon}</span>
										</div>
										<span class="text-xs font-semibold text-on-surface">{sub.name}</span>
									</div>
									<GlassButton
										variant="icon"
										size="sm"
										class="h-7 min-h-[28px] w-7 min-w-[28px]"
										onclick={() => openEditModal(sub)}
										aria-label="Edit Subkategori"
									>
										<span class="material-symbols-outlined text-sm">edit</span>
									</GlassButton>
								</div>
							{/each}

							<!-- Add Subcategory Button -->
							<GlassButton
								variant="text"
								size="sm"
								class="mt-2 w-full rounded-xl border border-dashed border-outline-variant/50 py-2 text-xs font-bold text-primary"
								onclick={() => openAddModal(category.id)}
							>
								<span class="material-symbols-outlined text-sm">add</span>
								<span>{t('categories.tambahSubkategori')}</span>
							</GlassButton>
						</div>
					{/if}
				</GlassCard>
			{/each}
		</div>
	{/if}
</div>

<!-- Bottom Sheet Tambah / Edit Kategori -->
<GlassSheet
	bind:isOpen={isSheetOpen}
	variant="sheet"
	title={isEditing ? t('categories.ubahKategori') : t('categories.tambahKategori')}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSaveCategory();
		}}
		class="space-y-4 py-2"
	>
		<!-- Nama Kategori -->
		<div>
			<label for="cat-form-name" class="mb-1 block text-xs font-medium text-on-surface"
				>Nama Kategori</label
			>
			<input
				id="cat-form-name"
				type="text"
				bind:value={formName}
				placeholder={t('categories.namaPlaceholder')}
				class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-2.5 text-sm font-semibold text-on-surface outline-none focus:border-primary"
				data-testid="category-form-name"
			/>
		</div>

		<!-- Jenis (Pemasukan / Pengeluaran) jika kategori utama -->
		{#if !formParentId}
			<div>
				<span class="mb-1 block text-xs font-medium text-on-surface">Jenis Kategori</span>
				<GlassSegmented options={kindItems} bind:value={formKind} />
			</div>
		{/if}

		<!-- Kategori Induk -->
		<div>
			<label for="cat-form-parent" class="mb-1 block text-xs font-medium text-on-surface"
				>{t('categories.kategoriInduk')}</label
			>
			<select
				id="cat-form-parent"
				bind:value={formParentId}
				class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-2.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
			>
				<option value={null}>{t('categories.tanpaInduk')}</option>
				{#each allParents.filter((p) => p.id !== editingId) as parent (parent.id)}
					<option value={parent.id}>{parent.name}</option>
				{/each}
			</select>
		</div>

		<!-- Pilihan Warna -->
		<div>
			<span class="mb-1.5 block text-xs font-medium text-on-surface"
				>{t('categories.pilihWarna')}</span
			>
			<div class="flex flex-wrap gap-2">
				{#each colorOptions as c (c)}
					{@const isSelected = formColor === c}
					<GlassButton
						variant="icon"
						size="sm"
						class="h-8 min-h-[32px] w-8 min-w-[32px] {isSelected
							? 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
							: ''}"
						style="background: {c}; border: none;"
						onclick={() => (formColor = c)}
						aria-label="Pilih warna {c}"
					>
						{#if isSelected}
							<span class="material-symbols-outlined text-xs text-white">check</span>
						{/if}
					</GlassButton>
				{/each}
			</div>
		</div>

		<!-- Pilihan Ikon -->
		<div>
			<span class="mb-1.5 block text-xs font-medium text-on-surface"
				>{t('categories.pilihIkon')}</span
			>
			<div class="grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto p-1">
				{#each iconOptions as icon (icon)}
					{@const isSelected = formIcon === icon}
					<GlassButton
						variant={isSelected ? 'primary' : 'secondary'}
						size="sm"
						class="h-9 min-h-[36px] p-0"
						onclick={() => (formIcon = icon)}
						aria-label="Pilih ikon {icon}"
					>
						<span class="material-symbols-outlined text-base">{icon}</span>
					</GlassButton>
				{/each}
			</div>
		</div>

		{#if formError}
			<div
				class="bg-error/15 text-error border-error/20 rounded-xl border p-2.5 text-center text-xs font-bold"
			>
				{formError}
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="space-y-2 pt-2">
			<GlassButton
				type="submit"
				variant="primary"
				size="lg"
				class="w-full"
				disabled={isSubmitting}
				data-testid="category-form-submit"
			>
				<span class="material-symbols-outlined text-lg">check</span>
				<span>{t('common.simpan')}</span>
			</GlassButton>

			{#if isEditing && !isEditingSystem}
				<GlassButton
					variant="destructive"
					size="md"
					class="w-full"
					onclick={() => (showDeleteDialog = true)}
					data-testid="category-delete-btn"
				>
					{t('common.hapus')} Kategori
				</GlassButton>
			{/if}
		</div>
	</form>
</GlassSheet>

<!-- Dialog Konfirmasi Hapus Kategori -->
<GlassSheet
	bind:isOpen={showDeleteDialog}
	variant="dialog"
	title={t('categories.hapusTitle')}
	subtitle={t('categories.hapusConfirm')}
>
	<div class="mt-4 flex gap-3">
		<GlassButton
			variant="secondary"
			size="md"
			class="flex-1"
			onclick={() => (showDeleteDialog = false)}
		>
			{t('common.batal')}
		</GlassButton>
		<GlassButton
			variant="danger"
			size="md"
			class="flex-1"
			onclick={handleDeleteCategory}
			data-testid="confirm-delete-cat-btn"
		>
			{t('common.hapus')}
		</GlassButton>
	</div>
</GlassSheet>
