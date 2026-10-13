<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import WalletCard from '$lib/components/glass/WalletCard.svelte';
	import type { Wallet } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { walletService } from '$lib/services/walletService';

	const walletId = $derived(page.params.id ?? '');

	const colorOptions = [
		{ label: 'iOS Blue', color: '#0058bc' },
		{ label: 'Emerald Green', color: '#006e28' },
		{ label: 'Coral Red', color: '#bc000a' },
		{ label: 'Purple Violet', color: '#684fa2' },
		{ label: 'Amber Gold', color: '#904a00' },
		{ label: 'Midnight Slate', color: '#303032' }
	];

	const iconOptions = [
		'account_balance',
		'account_balance_wallet',
		'smartphone',
		'credit_card',
		'payments',
		'savings'
	];

	let wallet = $state<Wallet | undefined>(undefined);
	let name = $state('');
	let selectedColor = $state('#0058bc');
	let selectedIcon = $state('account_balance_wallet');
	let includeInTotal = $state(true);

	let showArchiveDialog = $state(false);
	let showDeleteDialog = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	async function loadData() {
		if (!walletId) return;
		isLoading = true;
		try {
			wallet = await walletService.getWalletById(walletId);
			if (wallet) {
				name = wallet.name;
				selectedColor = wallet.color;
				selectedIcon = wallet.icon;
				includeInTotal = wallet.includeInTotal;
			}
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	let previewWallet = $derived({
		name: name.trim() || 'Nama Dompet',
		type: wallet?.type || 'ewallet',
		balance: wallet?.balance || 0,
		openingBalance: wallet?.openingBalance || 0,
		color: selectedColor,
		icon: selectedIcon,
		includeInTotal,
		archivedAt: wallet?.archivedAt ?? null
	});

	async function handleSave() {
		if (!name.trim()) {
			errorMessage = 'Nama dompet wajib diisi';
			return;
		}

		if (!walletId) return;

		isSubmitting = true;
		errorMessage = '';
		try {
			await walletService.updateWallet(walletId, {
				name: name.trim(),
				color: selectedColor,
				icon: selectedIcon,
				includeInTotal
			});
			goto(`/wallets/${walletId}`);
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleToggleArchive() {
		showArchiveDialog = false;
		if (!wallet || !walletId) return;

		try {
			if (wallet.archivedAt) {
				await walletService.unarchiveWallet(walletId);
			} else {
				await walletService.archiveWallet(walletId);
			}
			goto('/wallets');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal mengubah status arsip';
		}
	}

	async function handleDelete() {
		showDeleteDialog = false;
		if (!walletId) return;
		try {
			await walletService.deleteWallet(walletId);
			goto('/wallets');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal menghapus dompet';
		}
	}
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-24">
	<!-- Top Bar -->
	<header class="mb-5 flex items-center justify-between">
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high/60 text-on-surface transition-transform active:scale-95"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</button>
		<h1 class="text-base font-bold text-on-surface">{t('wallets.edit')}</h1>
		<div class="w-9"></div>
	</header>

	{#if isLoading}
		<div class="py-20 text-center text-xs font-semibold text-on-surface-variant">
			Memuat data dompet...
		</div>
	{:else if !wallet}
		<GlassCard variant="regular" class="p-8">
			<p class="text-error text-center text-sm font-semibold">Dompet tidak ditemukan.</p>
		</GlassCard>
	{:else}
		<!-- Live Preview Card -->
		<section class="mb-6">
			<WalletCard wallet={previewWallet} variant="hero" />
		</section>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
			class="space-y-5"
		>
			<!-- Info Identitas -->
			<GlassCard variant="opaque" class="space-y-4 p-5">
				<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
					Identitas Dompet
				</h3>

				<div>
					<label for="edit-wallet-name" class="mb-1.5 block text-xs font-medium text-on-surface"
						>Nama Dompet</label
					>
					<input
						id="edit-wallet-name"
						type="text"
						bind:value={name}
						class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="edit-wallet-name"
					/>
				</div>
			</GlassCard>

			<!-- Personalisasi Warna & Ikon -->
			<GlassCard variant="opaque" class="space-y-4 p-5">
				<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
					Personalisasi Visual
				</h3>

				<!-- Warna Kartu -->
				<div>
					<span class="mb-2 block text-xs font-medium text-on-surface"
						>{t('wallets.warnaKartu')}</span
					>
					<div class="flex items-center justify-between gap-2">
						{#each colorOptions as opt (opt.color)}
							{@const isSelected = selectedColor === opt.color}
							<button
								type="button"
								class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-90 {isSelected
									? 'ring-3 ring-primary ring-offset-2 ring-offset-surface'
									: 'hover:scale-105'}"
								style="background: {opt.color};"
								onclick={() => (selectedColor = opt.color)}
								aria-label={opt.label}
							>
								{#if isSelected}
									<span class="material-symbols-outlined text-sm font-black text-white">check</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Pilih Ikon -->
				<div>
					<span class="mb-2 block text-xs font-medium text-on-surface"
						>{t('wallets.pilihIkon')}</span
					>
					<div class="grid grid-cols-6 gap-2">
						{#each iconOptions as icon (icon)}
							{@const isSelected = selectedIcon === icon}
							<button
								type="button"
								class="flex h-11 cursor-pointer items-center justify-center rounded-2xl transition-all active:scale-90 {isSelected
									? 'bg-primary text-white shadow-md'
									: 'bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface'}"
								onclick={() => (selectedIcon = icon)}
								aria-label="Pilih ikon {icon}"
							>
								<span class="material-symbols-outlined text-xl">{icon}</span>
							</button>
						{/each}
					</div>
				</div>
			</GlassCard>

			<!-- Switch Sertakan Total -->
			<GlassCard variant="opaque" class="p-4">
				<label class="flex cursor-pointer items-center justify-between select-none">
					<div>
						<h4 class="text-xs font-bold text-on-surface">{t('wallets.sertakanTotal')}</h4>
						<p class="text-[11px] text-on-surface-variant">
							Dihitung dalam ringkasan total kekayaan
						</p>
					</div>
					<input
						type="checkbox"
						bind:checked={includeInTotal}
						class="h-5 w-5 cursor-pointer accent-primary"
					/>
				</label>
			</GlassCard>

			{#if errorMessage}
				<div
					class="bg-error/15 text-error border-error/20 rounded-2xl border p-3 text-center text-xs font-bold"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- Tombol Simpan Perubahan -->
			<GlassButton
				type="submit"
				variant="primary"
				size="lg"
				class="w-full"
				disabled={isSubmitting}
				data-testid="edit-wallet-submit"
			>
				<span class="material-symbols-outlined text-xl">check</span>
				<span>{t('common.simpan')}</span>
			</GlassButton>

			<!-- Tombol Arsipkan & Hapus -->
			<div class="space-y-3 pt-4">
				<button
					type="button"
					class="w-full rounded-2xl bg-amber-500/10 py-3 text-xs font-bold text-amber-500 transition-colors hover:bg-amber-500/20 active:scale-[0.99]"
					onclick={() => (showArchiveDialog = true)}
					data-testid="wallet-archive-button"
				>
					{wallet.archivedAt ? t('wallets.bukaArsip') : t('wallets.arsip')}
				</button>

				<button
					type="button"
					class="bg-error/10 text-error hover:bg-error/20 w-full rounded-2xl py-3 text-xs font-bold transition-colors active:scale-[0.99]"
					onclick={() => (showDeleteDialog = true)}
					data-testid="wallet-delete-button"
				>
					{t('common.hapus')} Dompet
				</button>
			</div>
		</form>
	{/if}
</div>

<!-- Dialog Konfirmasi Arsip -->
<GlassSheet
	bind:isOpen={showArchiveDialog}
	variant="dialog"
	title={t('wallets.arsipTitle')}
	subtitle={t('wallets.arsipConfirm')}
>
	<div class="mt-4 flex gap-3">
		<GlassButton
			variant="secondary"
			size="md"
			class="flex-1"
			onclick={() => (showArchiveDialog = false)}
		>
			{t('common.batal')}
		</GlassButton>
		<GlassButton
			variant="primary"
			size="md"
			class="flex-1"
			onclick={handleToggleArchive}
			data-testid="confirm-archive-btn"
		>
			Konfirmasi
		</GlassButton>
	</div>
</GlassSheet>

<!-- Dialog Konfirmasi Hapus -->
<GlassSheet
	bind:isOpen={showDeleteDialog}
	variant="dialog"
	title={t('wallets.hapusTitle')}
	subtitle={t('wallets.hapusConfirm')}
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
			onclick={handleDelete}
			data-testid="confirm-delete-btn"
		>
			{t('common.hapus')}
		</GlassButton>
	</div>
</GlassSheet>
