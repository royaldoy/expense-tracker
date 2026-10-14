<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassSwitch from '$lib/components/glass/GlassSwitch.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { pinSecurityService, type PinSecurityConfig } from '$lib/services/pinSecurityService';
	import { isPinSet, lockApp, refreshPinStatus } from '$lib/stores/securityStore';
	import { hideBalance, toggleHideBalance } from '$lib/stores/uiStore';

	let pinConfig = $state<PinSecurityConfig | null>(null);
	let autoLockTimeout = $state(0);

	// State Modal PIN
	type PinModalMode = 'setup' | 'change' | 'disable';
	let isPinSheetOpen = $state(false);
	let modalMode = $state<PinModalMode>('setup');
	let step = $state<'enter_old' | 'enter_new' | 'confirm_new' | 'enter_current'>('enter_new');

	let oldPin = $state('');
	let newPin = $state('');
	let confirmPin = $state('');

	let keypadValue = $state('');
	let pinError = $state<string | null>(null);
	let isProcessing = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const timeoutOptions = [
		{ label: 'Langsung (0 detik)', value: 0 },
		{ label: '1 Menit', value: 60000 },
		{ label: '5 Menit', value: 300000 },
		{ label: 'Jangan Pernah', value: -1 }
	];

	async function loadConfig() {
		pinConfig = await pinSecurityService.getConfig();
		autoLockTimeout = pinConfig.autoLockTimeoutMs;
		await refreshPinStatus();
	}

	function openSetupSheet() {
		modalMode = 'setup';
		step = 'enter_new';
		newPin = '';
		confirmPin = '';
		keypadValue = '';
		pinError = null;
		isPinSheetOpen = true;
	}

	function openChangeSheet() {
		modalMode = 'change';
		step = 'enter_old';
		oldPin = '';
		newPin = '';
		confirmPin = '';
		keypadValue = '';
		pinError = null;
		isPinSheetOpen = true;
	}

	function openDisableSheet() {
		modalMode = 'disable';
		step = 'enter_current';
		keypadValue = '';
		pinError = null;
		isPinSheetOpen = true;
	}

	async function handleKeypadSubmit() {
		if (keypadValue.length !== 6 || isProcessing) return;

		isProcessing = true;
		pinError = null;

		try {
			if (modalMode === 'setup') {
				if (step === 'enter_new') {
					newPin = keypadValue;
					keypadValue = '';
					step = 'confirm_new';
				} else if (step === 'confirm_new') {
					confirmPin = keypadValue;
					if (confirmPin !== newPin) {
						pinError = 'Konfirmasi PIN tidak cocok. Silakan ulangi.';
						keypadValue = '';
						return;
					}
					await pinSecurityService.setPin(newPin);
					await loadConfig();
					isPinSheetOpen = false;
					feedbackMessage = {
						type: 'success',
						text: 'PIN Keamanan 6-digit berhasil diaktifkan!'
					};
				}
			} else if (modalMode === 'change') {
				if (step === 'enter_old') {
					const verify = await pinSecurityService.verifyPin(keypadValue);
					if (!verify.success) {
						pinError = verify.error ?? 'PIN lama salah.';
						keypadValue = '';
						return;
					}
					oldPin = keypadValue;
					keypadValue = '';
					step = 'enter_new';
				} else if (step === 'enter_new') {
					newPin = keypadValue;
					keypadValue = '';
					step = 'confirm_new';
				} else if (step === 'confirm_new') {
					confirmPin = keypadValue;
					if (confirmPin !== newPin) {
						pinError = 'Konfirmasi PIN tidak cocok. Silakan ulangi.';
						keypadValue = '';
						return;
					}
					const changed = await pinSecurityService.changePin(oldPin, newPin);
					if (changed) {
						await loadConfig();
						isPinSheetOpen = false;
						feedbackMessage = {
							type: 'success',
							text: 'PIN Keamanan berhasil diubah!'
						};
					} else {
						pinError = 'Gagal mengubah PIN.';
						keypadValue = '';
					}
				}
			} else if (modalMode === 'disable') {
				const disabled = await pinSecurityService.disablePin(keypadValue);
				if (disabled) {
					await loadConfig();
					isPinSheetOpen = false;
					feedbackMessage = {
						type: 'success',
						text: 'Kunci PIN keamanan telah dinonaktifkan.'
					};
				} else {
					pinError = 'PIN yang dimasukkan salah.';
					keypadValue = '';
				}
			}
		} catch (error) {
			pinError = `Terjadi kesalahan: ${String(error)}`;
			keypadValue = '';
		} finally {
			isProcessing = false;
		}
	}

	async function handleTimeoutChange(val: number) {
		autoLockTimeout = val;
		await pinSecurityService.setAutoLockTimeout(val);
		await loadConfig();
	}

	onMount(() => {
		loadConfig();
	});
</script>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top App Bar -->
	<header class="flex items-center gap-3 pt-2">
		<a
			href="/settings"
			class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
			aria-label="Kembali ke Pengaturan"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</a>
		<div>
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Keamanan & Privasi</h1>
			<p class="text-xs text-on-surface-variant">Kunci PIN PBKDF2 Web Crypto & Privasi</p>
		</div>
	</header>

	<!-- Feedback Notification -->
	{#if feedbackMessage}
		<div
			class="flex items-center gap-3 rounded-2xl p-4 transition-all duration-200 {feedbackMessage.type ===
			'success'
				? 'border border-income/20 bg-income/10 text-income'
				: 'border border-expense/20 bg-expense/10 text-expense'}"
			role="alert"
			data-testid="security-status-alert"
		>
			<span class="material-symbols-outlined text-xl">
				{feedbackMessage.type === 'success' ? 'check_circle' : 'error'}
			</span>
			<p class="flex-1 text-xs font-semibold">{feedbackMessage.text}</p>
			<GlassButton
				variant="icon"
				size="sm"
				class="h-6 min-h-[24px] w-6 min-w-[24px]"
				onclick={() => (feedbackMessage = null)}
				aria-label="Tutup pesan"
			>
				<span class="material-symbols-outlined text-sm">close</span>
			</GlassButton>
		</div>
	{/if}

	<!-- Bagian 1: Status Kunci PIN 6-Digit -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Kunci PIN Aplikasi
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-4 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #5856D6;"
					>
						<span class="material-symbols-outlined text-xl">lock</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">PIN Keamanan 6-Digit</p>
						<p class="text-xs text-on-surface-variant">
							{$isPinSet ? 'Status: Aktif & Terlindungi' : 'Status: Belum Diaktifkan'}
						</p>
					</div>
				</div>
				<span
					class="rounded-lg px-2.5 py-1 text-xs font-bold {$isPinSet
						? 'bg-income/10 text-income'
						: 'bg-surface-container text-on-surface-variant'}"
					data-testid="pin-status-badge"
				>
					{$isPinSet ? 'Aktif' : 'Nonaktif'}
				</span>
			</div>

			<div class="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
				<p class="font-semibold text-on-surface">Enkripsi Kriptografi Tingkat Tinggi:</p>
				<p class="mt-1 leading-relaxed">
					PIN disimpan sebagai hash Web Crypto PBKDF2 (SHA-256, 100.000 iterasi, 16-byte random
					salt). Aplikasi otomatis terkunci selama 30 detik bila terjadi 5 kesalahan berturut-turut.
				</p>
			</div>

			<!-- Tombol-tombol Aksi PIN -->
			<div class="flex flex-col gap-2">
				{#if !$isPinSet}
					<GlassButton
						variant="primary"
						class="w-full"
						onclick={openSetupSheet}
						data-testid="btn-enable-pin"
					>
						<span class="material-symbols-outlined text-lg">pin</span>
						Aktifkan Kunci PIN
					</GlassButton>
				{:else}
					<div class="grid grid-cols-2 gap-2">
						<GlassButton
							variant="secondary"
							class="w-full"
							onclick={openChangeSheet}
							data-testid="btn-change-pin"
						>
							<span class="material-symbols-outlined text-lg">edit</span>
							Ubah PIN
						</GlassButton>
						<GlassButton
							variant="danger"
							class="w-full"
							onclick={openDisableSheet}
							data-testid="btn-disable-pin"
						>
							<span class="material-symbols-outlined text-lg">lock_open</span>
							Nonaktifkan
						</GlassButton>
					</div>
					<GlassButton variant="secondary" class="w-full" onclick={lockApp}>
						<span class="material-symbols-outlined text-lg">screen_lock_portrait</span>
						Uji Kunci Aplikasi Sekarang
					</GlassButton>
				{/if}
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 2: Batas Waktu Kunci Otomatis (Auto-Lock) -->
	{#if $isPinSet}
		<section class="flex flex-col gap-2">
			<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
				Kunci Otomatis (Latar Belakang)
			</h2>
			<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
				{#each timeoutOptions as opt (opt.value)}
					<GlassButton
						variant="text"
						size="sm"
						class="flex min-h-[44px] w-full items-center justify-between rounded-none p-3.5 text-left font-normal hover:bg-surface-container/30"
						onclick={() => handleTimeoutChange(opt.value)}
						data-testid="timeout-opt-{opt.value}"
					>
						<span class="text-xs font-medium text-on-surface">{opt.label}</span>
						{#if autoLockTimeout === opt.value}
							<span class="material-symbols-outlined text-lg text-primary">check_circle</span>
						{/if}
					</GlassButton>
				{/each}
			</GlassCard>
		</section>
	{/if}

	<!-- Bagian 3: Sensor Saldo Beranda (hideBalance) -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Privasi Tampilan Saldo
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #34C759;"
					>
						<span class="material-symbols-outlined text-xl">
							{$hideBalance ? 'visibility_off' : 'visibility'}
						</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Sensor Saldo Beranda</p>
						<p class="text-xs text-on-surface-variant">Sembunyikan nominal saldo di layar utama</p>
					</div>
				</div>
				<GlassSwitch
					checked={$hideBalance}
					onchange={toggleHideBalance}
					aria-label="Sensor Saldo Beranda"
					data-testid="security-toggle-hide-balance"
				/>
			</div>
			<p class="text-xs text-on-surface-variant">
				Saat fitur ini aktif, total saldo dan arus kas pada Beranda disamarkan menjadi
				<span class="font-bold text-on-surface">••••••••</span> untuk mencegah orang lain mengintip finansial
				Anda di tempat umum.
			</p>
		</GlassCard>
	</section>
</div>

<!-- Modal Sheet Setup / Ubah / Nonaktifkan PIN -->
<GlassSheet
	bind:isOpen={isPinSheetOpen}
	title={modalMode === 'setup'
		? 'Atur PIN Keamanan'
		: modalMode === 'change'
			? 'Ubah PIN Keamanan'
			: 'Nonaktifkan PIN'}
>
	<div class="flex flex-col items-center gap-4 p-4">
		<!-- Subjudul Langkah -->
		<p class="text-xs font-semibold text-on-surface-variant" data-testid="pin-modal-step-title">
			{#if step === 'enter_old'}
				Masukkan PIN lama Anda saat ini
			{:else if step === 'enter_new'}
				Masukkan 6 digit PIN baru Anda
			{:else if step === 'confirm_new'}
				Ulangi 6 digit PIN baru untuk konfirmasi
			{:else if step === 'enter_current'}
				Masukkan PIN Anda saat ini untuk menonaktifkan
			{/if}
		</p>

		<!-- 6 Dot Indikator -->
		<div class="flex items-center gap-4 py-2">
			{#each [0, 1, 2, 3, 4, 5] as i (i)}
				{@const isFilled = i < keypadValue.length}
				<div
					class="h-4 w-4 rounded-full transition-all duration-200 {isFilled
						? 'bg-primary ring-2 ring-primary/40'
						: 'border-2 border-outline/40 bg-surface-container'}"
					data-testid="sheet-pin-dot-{i}"
				></div>
			{/each}
		</div>

		{#if pinError}
			<p class="text-center text-xs font-semibold text-expense" data-testid="sheet-pin-error">
				{pinError}
			</p>
		{/if}

		<!-- Keypad Interaktif -->
		<div class="w-full max-w-[340px]">
			<GlassKeypad
				mode="pin"
				bind:value={keypadValue}
				maxLength={6}
				onkeypress={() => (pinError = null)}
				onsubmit={handleKeypadSubmit}
			/>
		</div>
	</div>
</GlassSheet>
