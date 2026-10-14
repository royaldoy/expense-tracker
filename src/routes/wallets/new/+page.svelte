<script lang="ts">
	import { goto } from '$app/navigation';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSegmented from '$lib/components/glass/GlassSegmented.svelte';
	import WalletCard from '$lib/components/glass/WalletCard.svelte';
	import { parseRupiah } from '$lib/domain/money';
	import type { WalletType } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { walletService } from '$lib/services/walletService';

	const typeItems = [
		{ value: 'ewallet', label: 'E-Wallet' },
		{ value: 'bank', label: 'Bank' },
		{ value: 'cash', label: 'Tunai' }
	];

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

	let name = $state('');
	let type = $state<string>('ewallet');
	let rawBalanceString = $state('0');
	let selectedColor = $state('#0058bc');
	let selectedIcon = $state('account_balance_wallet');
	let includeInTotal = $state(true);

	let errorMessage = $state('');
	let isSubmitting = $state(false);

	let openingBalance = $derived(parseRupiah(rawBalanceString));

	// Preview object
	let previewWallet = $derived({
		name: name.trim() || 'Nama Dompet',
		type: type as WalletType,
		openingBalance,
		balance: openingBalance,
		color: selectedColor,
		icon: selectedIcon,
		includeInTotal
	});

	async function handleSubmit() {
		errorMessage = '';
		if (!name.trim()) {
			errorMessage = 'Nama dompet wajib diisi';
			return;
		}

		isSubmitting = true;
		try {
			await walletService.createWallet({
				name: name.trim(),
				type: type as WalletType,
				openingBalance,
				color: selectedColor,
				icon: selectedIcon,
				includeInTotal
			});
			goto('/wallets');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan validasi';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-24">
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
		<h1 class="text-base font-bold text-on-surface">{t('wallets.tambahDompet')}</h1>
		<div class="w-9"></div>
	</header>

	<!-- Live Card Preview -->
	<section class="mb-6">
		<WalletCard wallet={previewWallet} variant="hero" />
	</section>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-5"
	>
		<!-- Group 1: Identitas & Tipe -->
		<GlassCard variant="opaque" class="space-y-4 p-5">
			<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				Identitas & Tipe
			</h3>

			<!-- Nama Dompet -->
			<div>
				<label for="new-wallet-name" class="mb-1.5 block text-xs font-medium text-on-surface"
					>Nama Dompet</label
				>
				<div class="relative flex items-center">
					<input
						id="new-wallet-name"
						type="text"
						bind:value={name}
						placeholder={t('wallets.namaPlaceholder')}
						class="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
						data-testid="wallet-form-name"
					/>
					{#if name}
						<GlassButton
							variant="text"
							size="sm"
							class="!absolute !right-3 !h-6 !min-h-0 !w-6 !min-w-0 !rounded-full bg-surface-container !p-0 text-on-surface-variant"
							onclick={() => (name = '')}
							aria-label="Hapus nama"
						>
							<span class="material-symbols-outlined text-xs">close</span>
						</GlassButton>
					{/if}
				</div>
			</div>

			<!-- Tipe Dompet -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-on-surface">Tipe Akun</span>
				<GlassSegmented options={typeItems} bind:value={type} />
			</div>

			<!-- Saldo Awal -->
			<div>
				<label for="new-wallet-balance" class="mb-1.5 block text-xs font-medium text-on-surface"
					>Saldo Awal</label
				>
				<div
					class="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 px-4 py-3 focus-within:border-primary"
				>
					<span class="mr-2 text-xs font-bold text-on-surface-variant">Rp</span>
					<input
						id="new-wallet-balance"
						type="text"
						inputmode="numeric"
						bind:value={rawBalanceString}
						placeholder="0"
						class="w-full bg-transparent text-sm font-bold text-on-surface tabular-nums outline-none"
						data-testid="wallet-form-balance"
					/>
				</div>
			</div>
		</GlassCard>

		<!-- Group 2: Personalisasi Visual -->
		<GlassCard variant="opaque" class="space-y-4 p-5">
			<h3 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				Personalisasi Visual
			</h3>

			<!-- Warna Kartu -->
			<div>
				<span class="mb-2 block text-xs font-medium text-on-surface">{t('wallets.warnaKartu')}</span
				>
				<div class="flex items-center justify-between gap-2" data-testid="wallet-color-picker">
					{#each colorOptions as opt (opt.color)}
						{@const isSelected = selectedColor === opt.color}
						<GlassButton
							variant="icon"
							size="md"
							class="!h-10 !min-h-[40px] !w-10 !min-w-[40px] rounded-full !p-0 transition-transform active:scale-90 {isSelected
								? 'ring-3 ring-primary ring-offset-2 ring-offset-surface'
								: 'hover:scale-105'}"
							style="background: {opt.color} !important;"
							onclick={() => (selectedColor = opt.color)}
							aria-label={opt.label}
						>
							{#if isSelected}
								<span class="material-symbols-outlined text-sm font-black text-white">check</span>
							{/if}
						</GlassButton>
					{/each}
				</div>
			</div>

			<!-- Pilih Ikon -->
			<div>
				<span class="mb-2 block text-xs font-medium text-on-surface">{t('wallets.pilihIkon')}</span>
				<div class="grid grid-cols-6 gap-2" data-testid="wallet-icon-picker">
					{#each iconOptions as icon (icon)}
						{@const isSelected = selectedIcon === icon}
						<GlassButton
							variant={isSelected ? 'primary' : 'secondary'}
							size="md"
							class="!h-11 !w-full !rounded-2xl transition-all active:scale-90 {isSelected
								? 'shadow-md'
								: 'text-on-surface-variant hover:text-on-surface'}"
							onclick={() => (selectedIcon = icon)}
							aria-label="Pilih ikon {icon}"
						>
							<span class="material-symbols-outlined text-xl">{icon}</span>
						</GlassButton>
					{/each}
				</div>
			</div>
		</GlassCard>

		<!-- Group 3: Pengaturan Tambahan -->
		<GlassCard variant="opaque" class="p-4">
			<label class="flex cursor-pointer items-center justify-between select-none">
				<div>
					<h4 class="text-xs font-bold text-on-surface">{t('wallets.sertakanTotal')}</h4>
					<p class="text-[11px] text-on-surface-variant">Dihitung dalam ringkasan total kekayaan</p>
				</div>
				<input
					type="checkbox"
					bind:checked={includeInTotal}
					class="h-5 w-5 cursor-pointer accent-primary"
					data-testid="wallet-form-include-total"
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

		<!-- Submit Button -->
		<GlassButton
			type="submit"
			variant="primary"
			size="lg"
			class="w-full"
			disabled={isSubmitting}
			data-testid="wallet-form-submit"
		>
			<span class="material-symbols-outlined text-xl">check_circle</span>
			<span>{t('common.simpan')}</span>
		</GlassButton>
	</form>
</div>
