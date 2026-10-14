<script lang="ts">
	import { goto } from '$app/navigation';
	import VoiceInputModal from '../voice/VoiceInputModal.svelte';
	import GlassSheet from './GlassSheet.svelte';
	import GlassCard from './GlassCard.svelte';
	import t from '../../i18n';

	interface Props {
		isOpen: boolean;
	}

	let { isOpen = $bindable(false) }: Props = $props();

	let isVoiceModalOpen = $state(false);

	function navigateTo(url: string) {
		isOpen = false;
		goto(url);
	}

	function handleVoiceClick() {
		isOpen = false;
		// Beri sedikit jeda agar transisi sheet selesai sebelum membuka dialog suara
		setTimeout(() => {
			isVoiceModalOpen = true;
		}, 150);
	}
</script>

<GlassSheet bind:isOpen title={t('quickAction.title')} subtitle={t('quickAction.subtitle')}>
	<div class="grid grid-cols-2 gap-3 py-2">
		<!-- 1. Catat Transaksi Manual (Ke /transactions/new) -->
		<GlassCard
			onclick={() => navigateTo('/transactions/new')}
			class="flex flex-col items-start gap-3 p-4"
			data-testid="quick-action-catat"
		>
			<div class="flex w-full items-center justify-between">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: var(--color-primary);"
				>
					<span class="material-symbols-outlined text-2xl">edit_note</span>
				</div>
				<span
					class="rounded-full px-2 py-0.5 text-[10px] font-bold"
					style="background: var(--color-primary-container, rgba(0, 106, 106, 0.15)); color: var(--color-primary);"
				>
					Keypad
				</span>
			</div>
			<div>
				<h4 class="text-sm font-bold text-on-surface">
					{t('quickAction.catat')}
				</h4>
				<p class="text-xs text-on-surface-variant">{t('quickAction.catatDesc')}</p>
			</div>
		</GlassCard>

		<!-- 2. Catat Lewat Suara (Voice Transaction) -->
		<GlassCard
			onclick={handleVoiceClick}
			class="flex flex-col items-start gap-3 p-4"
			data-testid="quick-action-suara"
		>
			<div class="flex w-full items-center justify-between">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: var(--color-secondary, #4A6363);"
				>
					<span class="material-symbols-outlined text-2xl">mic</span>
				</div>
				<span
					class="rounded-full px-2 py-0.5 text-[10px] font-bold"
					style="background: rgba(74, 99, 99, 0.15); color: var(--color-secondary, #4A6363);"
				>
					Suara
				</span>
			</div>
			<div>
				<h4 class="text-sm font-bold text-on-surface">
					{t('quickAction.suara')}
				</h4>
				<p class="text-xs text-on-surface-variant">{t('quickAction.suaraDesc')}</p>
			</div>
		</GlassCard>

		<!-- 3. Scan Struk Belanja (Ke /scan) -->
		<GlassCard
			onclick={() => navigateTo('/scan')}
			class="col-span-2 flex items-center justify-between gap-4 p-4"
			data-testid="quick-action-scan"
		>
			<div class="flex items-center gap-3.5">
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: var(--color-tertiary, #4B607C);"
				>
					<span class="material-symbols-outlined text-2xl">document_scanner</span>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h4 class="text-sm font-bold text-on-surface">
							{t('quickAction.scanStruk')}
						</h4>
						<span
							class="rounded-full px-2 py-0.5 text-[10px] font-bold"
							style="background: rgba(75, 96, 124, 0.15); color: var(--color-tertiary, #4B607C);"
						>
							Kamera
						</span>
					</div>
					<p class="text-xs text-on-surface-variant">{t('quickAction.scanStrukDesc')}</p>
				</div>
			</div>
			<span class="material-symbols-outlined text-lg text-on-surface-variant">arrow_forward</span>
		</GlassCard>
	</div>
</GlassSheet>

<!-- Modal Input Suara -->
<VoiceInputModal bind:isOpen={isVoiceModalOpen} />
