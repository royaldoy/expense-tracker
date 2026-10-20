<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import AppHeader from '$lib/components/glass/AppHeader.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import { receiptScanStore, type ReceiptScanData } from '$lib/stores/scanStore';
	import { triggerHapticImpact } from '$lib/stores/uiStore';

	let scanData = $state<ReceiptScanData | null>(null);
	let isTextExpanded = $state(false);

	onMount(() => {
		// Ambil data struk dari store (tidak di-consume dulu agar tidak hilang jika back)
		receiptScanStore.subscribe((val) => {
			scanData = val;
		})();
	});

	// Ekstraksi baris teks dari OCR result
	let detectedLines = $derived(
		scanData?.ocrResult?.blocks?.flatMap((b) => b.lines.map((l) => l.text.trim())) || []
	);

	// Estimasi merchant (biasanya baris teks paling atas yang signifikan)
	let estimatedMerchant = $derived.by(() => {
		if (detectedLines.length === 0) return 'Struk Belanja';
		const firstLine = detectedLines.find(
			(line) =>
				line.length >= 3 && !/^\d+$/.test(line) && !/tanggal|waktu|jam|kasir|struk/i.test(line)
		);
		return firstLine || 'Struk Belanja';
	});

	// Estimasi total nominal (mencari pola TOTAL / JUMLAH di baris OCR)
	let estimatedTotal = $derived.by(() => {
		for (let i = detectedLines.length - 1; i >= 0; i--) {
			const line = detectedLines[i];
			if (/total|grand\s*total|jumlah|tagihan|bayar/i.test(line)) {
				const numMatch = line.match(/(?:rp\.?|idr)?\s*([\d.,]+)/i);
				if (numMatch && numMatch[1]) {
					const cleaned = numMatch[1].replace(/\./g, '').replace(/,/g, '');
					const parsed = parseInt(cleaned, 10);
					if (!isNaN(parsed) && parsed > 0) {
						return parsed;
					}
				}
			}
		}
		return null;
	});

	function handleContinueToTransaction() {
		triggerHapticImpact('light');
		// Kosongkan receipt store setelah digunakan
		receiptScanStore.clear();

		const queryParams = new SvelteURLSearchParams();
		queryParams.set('type', 'expense');
		if (estimatedMerchant) {
			queryParams.set('note', estimatedMerchant);
		}
		if (estimatedTotal && estimatedTotal > 0) {
			queryParams.set('amount', estimatedTotal.toString());
		}

		goto(`/transactions/new?${queryParams.toString()}`);
	}

	function handleRescan() {
		triggerHapticImpact('light');
		receiptScanStore.clear();
		goto('/scan');
	}
</script>

<svelte:head>
	<title>Tinjauan Struk - Money Tracker</title>
</svelte:head>

<div class="pt-safe flex min-h-screen flex-col px-4 pb-28">
	<AppHeader
		title="Tinjauan Struk"
		actions={[{ icon: 'arrow_back', label: 'Kembali', onclick: () => goto('/scan') }]}
	/>

	{#if !scanData}
		<!-- Empty State: Tidak ada data hasil pindaian struk -->
		<div class="mt-12 flex flex-1 flex-col items-center justify-center text-center">
			<GlassCard class="flex max-w-sm flex-col items-center gap-4 p-6">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
					style="background: var(--color-primary);"
				>
					<span class="material-symbols-outlined text-3xl">receipt_long</span>
				</div>

				<div class="space-y-1 text-center">
					<h3 class="text-sm font-bold text-on-surface">Belum Ada Struk yang Dipindai</h3>
					<p class="text-xs text-on-surface-variant">
						Silakan ambil foto atau unggah gambar struk belanja dari kamera untuk melihat tinjauan.
					</p>
				</div>

				<GlassButton variant="primary" size="md" class="mt-2 w-full" onclick={() => goto('/scan')}>
					<span class="material-symbols-outlined mr-1.5 text-lg">photo_camera</span>
					Buka Kamera Scan
				</GlassButton>
			</GlassCard>
		</div>
	{:else}
		<!-- Main Review Content -->
		<div class="mt-4 flex flex-1 flex-col gap-4">
			<!-- Pratinjau Foto Struk Terkompresi -->
			<GlassCard class="flex flex-col items-center overflow-hidden p-3">
				<div
					class="relative flex max-h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/5"
				>
					{#if scanData.image?.dataUrl}
						<img
							src={scanData.image.dataUrl}
							alt="Pratinjau Struk Belanja"
							class="max-h-[300px] w-auto rounded-xl object-contain shadow-sm"
							data-testid="receipt-review-image"
						/>
					{:else}
						<div class="flex h-48 w-full items-center justify-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl">broken_image</span>
						</div>
					{/if}
				</div>
			</GlassCard>

			<!-- Ringkasan Hasil Deteksi OCR -->
			<GlassCard class="flex flex-col gap-3 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full text-white"
							style="background: var(--color-income);"
						>
							<span class="material-symbols-outlined text-base">check</span>
						</div>
						<div>
							<h3 class="text-xs font-bold text-on-surface">OCR Berhasil</h3>
							<p class="text-[11px] text-on-surface-variant">
								{detectedLines.length} baris teks terdeteksi
							</p>
						</div>
					</div>

					<span
						class="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
					>
						On-Device ML Kit
					</span>
				</div>

				<!-- Info Estimasi Merchant & Total -->
				<div class="mt-2 grid grid-cols-2 gap-2">
					<div class="rounded-xl bg-surface-container-low p-2.5">
						<span class="text-[10px] font-medium text-on-surface-variant">Merchant / Catatan</span>
						<p class="truncate text-xs font-bold text-on-surface" title={estimatedMerchant}>
							{estimatedMerchant}
						</p>
					</div>

					<div class="rounded-xl bg-surface-container-low p-2.5">
						<span class="text-[10px] font-medium text-on-surface-variant">Estimasi Total</span>
						<p class="text-xs font-bold text-income">
							{estimatedTotal ? formatRupiah(estimatedTotal) : 'Tidak terdeteksi'}
						</p>
					</div>
				</div>

				<!-- Collapsible Teks OCR Lengkap -->
				{#if detectedLines.length > 0}
					<div class="mt-2 flex flex-col">
						<GlassButton
							variant="text"
							size="sm"
							class="!flex !w-full !justify-between !p-0 !text-[11px] font-medium !text-primary hover:underline"
							onclick={() => (isTextExpanded = !isTextExpanded)}
						>
							<span
								>{isTextExpanded ? 'Sembunyikan teks deteksi' : 'Lihat semua teks terdeteksi'}</span
							>
							<span class="material-symbols-outlined text-sm">
								{isTextExpanded ? 'expand_less' : 'expand_more'}
							</span>
						</GlassButton>

						{#if isTextExpanded}
							<div
								class="mt-2 max-h-40 overflow-y-auto rounded-xl bg-surface-container-lowest p-2.5 font-mono text-[11px] leading-relaxed text-on-surface-variant"
							>
								{#each detectedLines as line, i (i)}
									<p class="border-b border-outline-variant/30 py-0.5 last:border-0">{line}</p>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</GlassCard>

			<!-- Action Buttons -->
			<div class="mt-4 flex flex-col gap-2.5">
				<GlassButton
					variant="primary"
					size="lg"
					class="w-full"
					onclick={handleContinueToTransaction}
					data-testid="continue-to-transaction-btn"
				>
					<span class="material-symbols-outlined mr-1.5 text-xl">arrow_forward</span>
					Lanjutkan ke Transaksi
				</GlassButton>

				<GlassButton
					variant="secondary"
					size="md"
					class="w-full"
					onclick={handleRescan}
					data-testid="rescan-receipt-btn"
				>
					<span class="material-symbols-outlined mr-1.5 text-lg">refresh</span>
					Pindai Ulang
				</GlassButton>
			</div>
		</div>
	{/if}
</div>
