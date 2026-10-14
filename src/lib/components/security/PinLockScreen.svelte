<script lang="ts">
	import { onDestroy } from 'svelte';
	import GlassKeypad from '$lib/components/glass/GlassKeypad.svelte';
	import { isLocked, unlockApp } from '$lib/stores/securityStore';
	import { pinSecurityService } from '$lib/services/pinSecurityService';

	let enteredPin = $state('');
	let isError = $state(false);
	let isShaking = $state(false);
	let errorMessage = $state<string | null>(null);
	let isVerifying = $state(false);
	let lockoutCountdown = $state<number | null>(null);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function startLockoutTimer(seconds: number) {
		lockoutCountdown = seconds;
		if (countdownInterval) clearInterval(countdownInterval);
		countdownInterval = setInterval(() => {
			if (lockoutCountdown && lockoutCountdown > 1) {
				lockoutCountdown -= 1;
			} else {
				lockoutCountdown = null;
				errorMessage = null;
				isError = false;
				if (countdownInterval) clearInterval(countdownInterval);
			}
		}, 1000);
	}

	async function handleSubmit() {
		if (enteredPin.length !== 6 || isVerifying || lockoutCountdown !== null) return;

		isVerifying = true;
		try {
			const result = await pinSecurityService.verifyPin(enteredPin);
			if (result.success) {
				enteredPin = '';
				isError = false;
				errorMessage = null;
				unlockApp();
			} else {
				isError = true;
				isShaking = true;
				errorMessage = result.error ?? 'PIN salah. Silakan coba lagi.';

				if (result.lockedOut && result.lockoutRemainingSeconds) {
					startLockoutTimer(result.lockoutRemainingSeconds);
				}

				setTimeout(() => {
					isShaking = false;
					enteredPin = '';
				}, 600);
			}
		} catch (error) {
			isError = true;
			isShaking = true;
			errorMessage = `Terjadi kesalahan: ${String(error)}`;
			setTimeout(() => {
				isShaking = false;
				enteredPin = '';
			}, 600);
		} finally {
			isVerifying = false;
		}
	}

	function handleKeypress() {
		if (isError) {
			isError = false;
			errorMessage = null;
		}
	}

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
	});
</script>

{#if $isLocked}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 select-none"
		style="
			background: var(--color-surface);
			backdrop-filter: blur(24px);
			-webkit-backdrop-filter: blur(24px);
		"
		role="dialog"
		aria-modal="true"
		aria-label="Kunci Keamanan PIN"
		data-testid="pin-lock-screen"
	>
		<!-- Ambient Decorative Light -->
		<div
			class="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
			style="background: var(--color-primary);"
		></div>

		<!-- Bagian Atas: Header & Ikon Gembok -->
		<div class="relative z-10 flex flex-col items-center pt-10 text-center">
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg transition-transform duration-300"
				style="
					background: var(--glass-card-opaque-bg);
					border: 1px solid var(--glass-card-opaque-border);
				"
			>
				<span class="material-symbols-outlined text-3xl text-primary">lock</span>
			</div>
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Money Tracker</h1>
			<p class="mt-1 text-xs text-on-surface-variant">
				{lockoutCountdown !== null
					? `Aplikasi terkunci. Tunggu ${lockoutCountdown} detik`
					: 'Masukkan 6 digit PIN keamanan untuk membuka'}
			</p>
		</div>

		<!-- Bagian Tengah: 6 Dot Indikator -->
		<div class="relative z-10 flex flex-col items-center gap-4 py-4">
			<div
				class="flex items-center gap-4 transition-transform duration-200 {isShaking
					? 'animate-shake'
					: ''}"
				data-testid="pin-dots-container"
			>
				{#each [0, 1, 2, 3, 4, 5] as i (i)}
					{@const isFilled = i < enteredPin.length}
					<div
						class="h-4 w-4 rounded-full transition-all duration-200 {isError
							? 'bg-expense ring-2 ring-expense/40'
							: isFilled
								? 'bg-primary ring-2 ring-primary/40'
								: 'border-2 border-outline/40 bg-surface-container'}"
						data-testid="pin-dot-{i}"
					></div>
				{/each}
			</div>

			{#if errorMessage}
				<p
					class="text-center text-xs font-semibold text-expense transition-opacity duration-200"
					data-testid="pin-error-message"
				>
					{errorMessage}
				</p>
			{/if}
		</div>

		<!-- Bagian Bawah: GlassKeypad -->
		<div class="relative z-10 w-full max-w-[340px] pb-6">
			<GlassKeypad
				mode="pin"
				bind:value={enteredPin}
				maxLength={6}
				onkeypress={handleKeypress}
				onsubmit={handleSubmit}
			/>
		</div>
	</div>
{/if}

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-12px);
		}
		40%,
		80% {
			transform: translateX(12px);
		}
	}

	.animate-shake {
		animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}
</style>
