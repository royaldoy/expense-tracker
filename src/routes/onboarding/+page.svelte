<script lang="ts">
	import { goto } from '$app/navigation';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { formatRupiah, parseRupiah } from '$lib/domain/money';
	import type { WalletType } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { onboardingService } from '$lib/services/onboardingService';

	interface PresetOption {
		id: string;
		name: string;
		type: WalletType;
		icon: string;
		color: string;
		bgTint: string;
	}

	const presets: PresetOption[] = [
		{
			id: 'gopay',
			name: 'GoPay',
			type: 'ewallet',
			icon: 'account_balance_wallet',
			color: '#006e28',
			bgTint: 'rgba(0, 110, 40, 0.15)'
		},
		{
			id: 'shopeepay',
			name: 'ShopeePay',
			type: 'ewallet',
			icon: 'shopping_bag',
			color: '#bc000a',
			bgTint: 'rgba(188, 0, 10, 0.15)'
		},
		{
			id: 'bca',
			name: 'BCA',
			type: 'bank',
			icon: 'account_balance',
			color: '#0058bc',
			bgTint: 'rgba(0, 88, 188, 0.15)'
		},
		{
			id: 'mandiri',
			name: 'Mandiri',
			type: 'bank',
			icon: 'domain',
			color: '#004493',
			bgTint: 'rgba(0, 68, 147, 0.15)'
		},
		{
			id: 'tunai',
			name: 'Uang Tunai',
			type: 'cash',
			icon: 'payments',
			color: '#006e28',
			bgTint: 'rgba(0, 110, 40, 0.15)'
		},
		{
			id: 'lainnya',
			name: 'Dompet Lainnya',
			type: 'ewallet',
			icon: 'more_horiz',
			color: '#684fa2',
			bgTint: 'rgba(104, 79, 162, 0.15)'
		}
	];

	let selectedPreset = $state<PresetOption>(presets[0]);
	let customName = $state('GoPay');
	let rawBalanceString = $state('0');
	let includeInTotal = $state(true);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	let currentBalance = $derived(parseRupiah(rawBalanceString));

	function selectPreset(preset: PresetOption) {
		selectedPreset = preset;
		customName = preset.name;
	}

	function addAmount(amount: number) {
		const next = currentBalance + amount;
		rawBalanceString = next.toString();
	}

	function resetAmount() {
		rawBalanceString = '0';
	}

	async function handleComplete() {
		errorMessage = '';
		if (!customName.trim()) {
			errorMessage = 'Nama dompet wajib diisi';
			return;
		}

		isSubmitting = true;
		try {
			await onboardingService.complete({
				name: customName.trim(),
				type: selectedPreset.type,
				openingBalance: currentBalance,
				color: selectedPreset.color,
				icon: selectedPreset.icon,
				includeInTotal
			});
			goto('/wallets');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="pt-safe flex flex-col gap-6 px-4 pb-12">
	<!-- Header -->
	<header class="mb-6 text-center">
		<div
			class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-primary shadow-lg"
			style="
				background: var(--glass-card-bg);
				border: 1px solid var(--glass-card-border);
			"
		>
			<span class="material-symbols-outlined text-3xl">account_balance_wallet</span>
		</div>
		<h1 class="text-2xl font-black tracking-tight text-on-surface">
			{t('onboarding.welcomeTitle')}
		</h1>
		<p class="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-on-surface-variant">
			{t('onboarding.welcomeSubtitle')}
		</p>
	</header>

	<!-- Step 1: Preset Grid -->
	<section class="mb-5">
		<span class="mb-2.5 block text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			{t('onboarding.pilihPreset')}
		</span>
		<div class="grid grid-cols-2 gap-2.5" data-testid="onboarding-preset-grid">
			{#each presets as preset (preset.id)}
				{@const isSelected = selectedPreset.id === preset.id}
				<button
					type="button"
					class="relative flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] {isSelected
						? 'shadow-md ring-2 ring-primary'
						: 'hover:bg-surface-container-high/40'}"
					style="
						background: var(--glass-card-bg);
						backdrop-filter: blur(var(--glass-card-blur));
						border: 1px solid {isSelected ? 'var(--color-primary)' : 'var(--glass-card-border)'};
					"
					onclick={() => selectPreset(preset)}
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
						style="background: {preset.color};"
					>
						<span class="material-symbols-outlined text-xl">{preset.icon}</span>
					</div>
					<div class="min-w-0 flex-1">
						<h4 class="truncate text-xs font-bold text-on-surface">{preset.name}</h4>
						<span class="text-[10px] text-on-surface-variant capitalize">{preset.type}</span>
					</div>
					{#if isSelected}
						<div
							class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
						>
							<span class="material-symbols-outlined text-xs">check</span>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<!-- Step 2: Name Input -->
	<section class="mb-5">
		<label
			for="wallet-name"
			class="mb-1.5 block text-xs font-bold tracking-wider text-on-surface-variant uppercase"
		>
			Nama Dompet
		</label>
		<GlassCard variant="regular" class="p-2">
			<input
				id="wallet-name"
				type="text"
				bind:value={customName}
				class="w-full bg-transparent px-3 py-2 text-sm font-semibold text-on-surface outline-none"
				placeholder="Nama dompet"
				data-testid="onboarding-wallet-name"
			/>
		</GlassCard>
	</section>

	<!-- Step 3: Saldo Awal Hero -->
	<section class="mb-6">
		<label
			for="onboarding-balance-input"
			class="mb-1.5 block text-xs font-bold tracking-wider text-on-surface-variant uppercase"
		>
			{t('onboarding.saldoAwalTitle')}
		</label>
		<GlassCard variant="regular" class="p-5">
			<div class="text-center">
				<p class="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
					Nominal Rupiah
				</p>
				<h3
					class="mt-1 text-3xl font-black tracking-tight text-primary tabular-nums"
					data-testid="onboarding-balance-display"
				>
					{formatRupiah(currentBalance)}
				</h3>
			</div>

			<!-- Quick Input Buttons -->
			<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
				<button
					type="button"
					class="rounded-full bg-surface-container-high/60 px-3 py-1.5 text-xs font-bold text-on-surface transition-transform active:scale-95"
					onclick={() => addAmount(100000)}
				>
					+Rp100.000
				</button>
				<button
					type="button"
					class="rounded-full bg-surface-container-high/60 px-3 py-1.5 text-xs font-bold text-on-surface transition-transform active:scale-95"
					onclick={() => addAmount(500000)}
				>
					+Rp500.000
				</button>
				<button
					type="button"
					class="rounded-full bg-surface-container-high/60 px-3 py-1.5 text-xs font-bold text-on-surface transition-transform active:scale-95"
					onclick={() => addAmount(1000000)}
				>
					+Rp1.000.000
				</button>
				<button
					type="button"
					class="rounded-full bg-surface-container/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-transform active:scale-95"
					onclick={resetAmount}
				>
					Reset
				</button>
			</div>

			<!-- Custom input field -->
			<div
				class="mt-4 flex items-center rounded-2xl border border-white/10 bg-surface-container-lowest/50 px-3 py-2"
			>
				<span class="mr-2 text-xs font-bold text-on-surface-variant">Ketik: Rp</span>
				<input
					id="onboarding-balance-input"
					type="text"
					inputmode="numeric"
					bind:value={rawBalanceString}
					class="w-full bg-transparent text-sm font-bold text-on-surface tabular-nums outline-none"
					placeholder="0"
					data-testid="onboarding-balance-input"
				/>
			</div>
		</GlassCard>
	</section>

	<!-- Step 4: Toggle Include in Total -->
	<section class="mb-6">
		<GlassCard variant="regular" class="p-4">
			<label class="flex cursor-pointer items-center justify-between select-none">
				<div>
					<h4 class="text-xs font-bold text-on-surface">{t('wallets.sertakanTotal')}</h4>
					<p class="text-[11px] text-on-surface-variant">Dihitung dalam ringkasan total kekayaan</p>
				</div>
				<input
					type="checkbox"
					bind:checked={includeInTotal}
					class="h-5 w-5 cursor-pointer accent-primary"
				/>
			</label>
		</GlassCard>
	</section>

	{#if errorMessage}
		<div
			class="bg-error/15 text-error border-error/20 mb-4 rounded-2xl border p-3 text-center text-xs font-bold"
		>
			{errorMessage}
		</div>
	{/if}

	<!-- Submit Button -->
	<GlassButton
		variant="primary"
		size="lg"
		class="w-full"
		disabled={isSubmitting}
		onclick={handleComplete}
		data-testid="onboarding-submit-button"
	>
		<span class="material-symbols-outlined text-xl">arrow_forward</span>
		<span>{t('onboarding.lanjut')}</span>
	</GlassButton>
</div>
