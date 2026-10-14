<script lang="ts">
	import { goto } from '$app/navigation';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { parseVoiceTransaction } from '$lib/domain/voiceParser';
	import t from '$lib/i18n';
	import { platform, type VoiceErrorCode } from '$lib/platform';
	import { categoryService } from '$lib/services/categoryService';
	import { walletService } from '$lib/services/walletService';
	import { triggerHapticNotification } from '$lib/stores/uiStore';
	import { voiceTransactionStore } from '$lib/stores/voiceStore';

	interface Props {
		isOpen: boolean;
	}

	let { isOpen = $bindable(false) }: Props = $props();

	type ModalStep = 'idle' | 'permission' | 'listening' | 'processing' | 'error';

	let step = $state<ModalStep>('idle');
	let errorCode = $state<VoiceErrorCode>('unknown');
	let errorMessage = $state<string>('');

	// Saat isOpen berubah menjadi true, periksa izin dan mulai rekognisi
	$effect(() => {
		if (isOpen) {
			initVoiceFlow();
		} else {
			cleanup();
		}
	});

	function cleanup() {
		step = 'idle';
		errorMessage = '';
		platform.voice.stop().catch(() => {});
	}

	async function initVoiceFlow() {
		errorMessage = '';
		try {
			const hasPermission = await platform.voice.checkPermissions();
			if (!hasPermission) {
				step = 'permission';
			} else {
				startRecording();
			}
		} catch {
			step = 'permission';
		}
	}

	async function handleRequestPermission() {
		try {
			const granted = await platform.voice.requestPermissions();
			if (granted) {
				startRecording();
			} else {
				step = 'error';
				errorCode = 'permission_denied';
				errorMessage = t('voice.errPermissionDenied');
				triggerHapticNotification('error');
			}
		} catch {
			step = 'error';
			errorCode = 'permission_denied';
			errorMessage = t('voice.errPermissionDenied');
			triggerHapticNotification('error');
		}
	}

	async function startRecording() {
		step = 'listening';
		errorMessage = '';

		try {
			const result = await platform.voice.start();
			const spokenMatches = result.matches ?? [];
			if (spokenMatches.length === 0 || !spokenMatches[0]?.trim()) {
				step = 'error';
				errorCode = 'no_speech';
				errorMessage = t('voice.errNoSpeech');
				triggerHapticNotification('warning');
				return;
			}

			step = 'processing';
			const recognizedSentence = spokenMatches[0].trim();

			// Ambil daftar dompet dan kategori aktif untuk parser
			const [wallets, categories] = await Promise.all([
				walletService.getWallets({ includeArchived: false }),
				categoryService.getCategories()
			]);

			const parsed = parseVoiceTransaction(recognizedSentence, wallets, categories);

			// Simpan ke voice store untuk dikonsumsi form transaksi
			voiceTransactionStore.set({
				rawText: recognizedSentence,
				parsed
			});

			triggerHapticNotification('success');
			isOpen = false;
			goto('/transactions/new?from=voice');
		} catch (err: unknown) {
			step = 'error';
			triggerHapticNotification('error');

			const errCode = (err as { code?: VoiceErrorCode })?.code ?? 'unknown';
			errorCode = errCode;

			if (errCode === 'permission_denied') {
				errorMessage = t('voice.errPermissionDenied');
			} else if (errCode === 'no_speech') {
				errorMessage = t('voice.errNoSpeech');
			} else if (errCode === 'not_understood') {
				errorMessage = t('voice.errNotUnderstood');
			} else if (errCode === 'service_unavailable') {
				errorMessage = t('voice.errServiceUnavailable');
			} else {
				errorMessage = err instanceof Error ? err.message : t('voice.errUnknown');
			}
		}
	}

	function handleManualFallback() {
		isOpen = false;
		goto('/transactions/new');
	}
</script>

<GlassSheet bind:isOpen title={t('voice.title')} subtitle={t('voice.subtitle')} variant="dialog">
	<div class="flex flex-col items-center justify-center py-4 text-center">
		<!-- 1. Step: Penjelasan Izin Mikrofon & Privasi Google Cloud -->
		{#if step === 'permission'}
			<div class="flex flex-col items-center gap-4 py-2">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md"
					style="background: var(--color-primary);"
				>
					<span class="material-symbols-outlined text-3xl">mic</span>
				</div>

				<div class="space-y-1.5 px-2">
					<h3 class="text-base font-bold text-on-surface">
						{t('voice.permissionTitle')}
					</h3>
					<p class="text-xs leading-relaxed text-on-surface-variant">
						{t('voice.permissionDesc')}
					</p>
				</div>

				<div class="mt-2 flex w-full flex-col gap-2">
					<GlassButton
						variant="primary"
						size="md"
						class="w-full"
						onclick={handleRequestPermission}
						data-testid="voice-grant-permission-button"
					>
						<span class="material-symbols-outlined mr-1 text-lg">check</span>
						{t('voice.permissionGrant')}
					</GlassButton>
					<GlassButton
						variant="ghost"
						size="md"
						class="w-full"
						onclick={() => (isOpen = false)}
						data-testid="voice-cancel-button"
					>
						{t('voice.permissionCancel')}
					</GlassButton>
				</div>
			</div>

			<!-- 2. Step: Mendengarkan Suara (Listening) -->
		{:else}
			{#if step === 'listening'}
				<div class="flex flex-col items-center gap-4 py-3">
					<!-- Animasi Lingkaran Berdenyut -->
					<div class="relative flex h-24 w-24 items-center justify-center">
						<div
							class="absolute h-full w-full animate-ping rounded-full opacity-20"
							style="background: var(--color-primary);"
						></div>
						<div
							class="absolute h-20 w-20 rounded-full opacity-30"
							style="background: var(--color-primary);"
						></div>
						<div
							class="relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
							style="background: var(--color-primary);"
						>
							<span class="material-symbols-outlined text-3xl">mic</span>
						</div>
					</div>

					<div class="space-y-1">
						<p class="text-sm font-bold text-primary">{t('voice.listening')}</p>
						<p class="px-4 text-xs text-on-surface-variant">{t('voice.listeningDesc')}</p>
					</div>

					<div class="mt-2 flex w-full gap-2">
						<GlassButton
							variant="secondary"
							size="md"
							class="w-full"
							onclick={() => (isOpen = false)}
							data-testid="voice-listening-cancel-button"
						>
							{t('voice.cancel')}
						</GlassButton>
					</div>
				</div>

				<!-- 3. Step: Memproses Ucapan (Processing) -->
			{:else}
				{#if step === 'processing'}
					<div class="flex flex-col items-center gap-3 py-6">
						<div
							class="h-10 w-10 animate-spin rounded-full border-3 border-outline-variant/30 border-t-primary"
						></div>
						<p class="text-xs font-semibold text-on-surface-variant">
							{t('voice.processing')}
						</p>
					</div>

					<!-- 4. Step: Penanganan Gagal / Error -->
				{:else}
					{#if step === 'error'}
						<div class="flex flex-col items-center gap-4 py-2" data-testid="voice-error-container">
							<div
								class="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xs"
								style="background: var(--color-error, #BA1A1A);"
							>
								<span class="material-symbols-outlined text-2xl"
									>{errorCode === 'permission_denied' ? 'mic_off' : 'error_outline'}</span
								>
							</div>

							<div class="space-y-1.5 px-2">
								<h3 class="text-sm font-bold text-on-surface">Gagal Mendeteksi Suara</h3>
								<p
									class="text-xs leading-relaxed text-on-surface-variant"
									data-testid="voice-error-message"
								>
									{errorMessage}
								</p>
							</div>

							<div class="mt-2 flex w-full flex-col gap-2">
								<GlassButton
									variant="primary"
									size="md"
									class="w-full"
									onclick={startRecording}
									data-testid="voice-retry-button"
								>
									<span class="material-symbols-outlined mr-1 text-lg">refresh</span>
									{t('voice.cobaLagi')}
								</GlassButton>
								<GlassButton
									variant="ghost"
									size="md"
									class="w-full"
									onclick={handleManualFallback}
									data-testid="voice-fallback-manual-button"
								>
									<span class="material-symbols-outlined mr-1 text-lg">edit</span>
									{t('voice.catatManual')}
								</GlassButton>
							</div>
						</div>
					{/if}
				{/if}
			{/if}
		{/if}
	</div>
</GlassSheet>
