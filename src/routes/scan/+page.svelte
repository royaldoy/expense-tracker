<script lang="ts">
	import { goto } from '$app/navigation';
	import AppHeader from '$lib/components/glass/AppHeader.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';

	const isDevTools = import.meta.env.VITE_DEV_TOOLS === 'true';
</script>

<div class="pt-safe flex min-h-screen flex-col px-4 pb-28">
	<AppHeader
		title="Scan Struk Belanja"
		actions={[{ icon: 'arrow_back', label: 'Kembali', onclick: () => history.back() }]}
	/>

	<div class="mt-6 flex flex-1 flex-col items-center justify-center text-center">
		<GlassCard class="flex max-w-sm flex-col items-center gap-4 p-6">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg"
				style="background: var(--color-primary);"
			>
				<span class="material-symbols-outlined text-4xl">document_scanner</span>
			</div>

			<div class="space-y-2">
				<h2 class="text-base font-bold text-on-surface">Pindai Struk Otomatis</h2>
				<p class="text-xs leading-relaxed text-on-surface-variant">
					Pindai struk belanja fisik Anda menggunakan kamera untuk mengenali merchant, nominal,
					tanggal, dan rincian belanja secara instan.
				</p>
			</div>

			<div class="mt-4 flex w-full flex-col gap-2.5">
				{#if isDevTools}
					<GlassButton
						variant="primary"
						size="md"
						class="w-full"
						onclick={() => goto('/dev/ocr')}
						data-testid="scan-dev-ocr-button"
					>
						<span class="material-symbols-outlined mr-1.5 text-xl">biotech</span>
						Buka Uji Kamera OCR
					</GlassButton>
				{/if}

				<GlassButton variant="secondary" size="md" class="w-full" onclick={() => history.back()}>
					<span class="material-symbols-outlined mr-1.5 text-xl">arrow_back</span>
					Kembali
				</GlassButton>
			</div>
		</GlassCard>
	</div>
</div>
