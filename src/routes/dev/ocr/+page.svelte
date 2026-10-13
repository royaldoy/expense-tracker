<script lang="ts">
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { platform } from '$lib/platform';
	import type { CompressedImage, OcrResult } from '$lib/platform/types';

	let image = $state<CompressedImage | null>(null);
	let isProcessing = $state(false);
	let ocrResult = $state<OcrResult | null>(null);
	let errorMessage = $state('');
	let copyToast = $state('');

	// JSON format template siap pakai untuk fixture
	let fixtureJson = $derived.by(() => {
		if (!ocrResult) return '';
		const template = {
			description: 'Struk transaksi asli',
			ocr: ocrResult,
			expected: {
				merchantName: ocrResult.blocks[0]?.lines[0]?.text || 'NAMA MERCHANT',
				date: new Date().toISOString().split('T')[0],
				time: '12:00:00',
				items: [
					{
						name: 'Contoh Item',
						qty: 1,
						unitPrice: 10000,
						totalPrice: 10000
					}
				],
				subtotal: 10000,
				discountAmount: 0,
				taxAmount: 0,
				serviceCharge: 0,
				grandTotal: 10000,
				suggestedCategoryKeyword: 'Makan & Minum'
			}
		};
		return JSON.stringify(template, null, 2);
	});

	async function handlePickPhoto(source: 'camera' | 'photos') {
		errorMessage = '';
		ocrResult = null;
		isProcessing = true;

		try {
			const captured = await platform.cameraOcr.captureOrPickPhoto(source);
			image = captured;
			await runOcr(captured);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.toLowerCase().includes('batal')) {
				errorMessage = msg;
			}
		} finally {
			isProcessing = false;
		}
	}

	async function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		errorMessage = '';
		ocrResult = null;
		isProcessing = true;

		try {
			const compressed = await platform.cameraOcr.compressImage(file, 1600, 0.85);
			image = compressed;
			await runOcr(compressed);
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal memproses berkas';
		} finally {
			isProcessing = false;
		}
	}

	async function runOcr(img: CompressedImage) {
		isProcessing = true;
		errorMessage = '';
		try {
			const result = await platform.cameraOcr.recognizeText(img);
			ocrResult = result;
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal menjalankan OCR';
		} finally {
			isProcessing = false;
		}
	}

	async function copyToClipboard(text: string) {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard) {
				await navigator.clipboard.writeText(text);
				copyToast = 'Berhasil disalin ke clipboard!';
				setTimeout(() => {
					copyToast = '';
				}, 2500);
			}
		} catch {
			copyToast = 'Gagal menyalin';
			setTimeout(() => {
				copyToast = '';
			}, 2000);
		}
	}
</script>

<div class="pt-safe flex flex-col gap-4 px-4 pb-20">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<button
			type="button"
			class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-container-high/60 text-on-surface transition-transform active:scale-95"
			onclick={() => history.back()}
			aria-label="Kembali"
		>
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</button>
		<h1 class="text-base font-bold text-on-surface">Generator Fixture OCR (/dev/ocr)</h1>
		<div class="w-9"></div>
	</header>

	<!-- Panduan Pembuatan Fixture -->
	<GlassCard class="flex flex-col gap-2 p-4">
		<div class="flex items-center gap-2 text-primary">
			<span class="material-symbols-outlined">developer_mode</span>
			<h2 class="text-sm font-bold text-on-surface">Inspeksi OCR & Generator Fixture</h2>
		</div>
		<p class="text-xs leading-relaxed text-on-surface-variant">
			Halaman ini menjalankan pemindaian teks Google ML Kit pada foto struk asli, menampilkan posisi
			bounding box per baris, dan menghasilkan JSON terstruktur untuk disimpan ke
			<code class="rounded bg-surface-container px-1 py-0.5 text-primary"
				>tests/fixtures/receipts/</code
			>.
		</p>
	</GlassCard>

	<!-- Action Buttons Deck -->
	<div class="grid grid-cols-2 gap-3">
		<GlassButton
			variant="primary"
			class="flex items-center justify-center gap-2 py-3"
			onclick={() => handlePickPhoto('camera')}
		>
			<span class="material-symbols-outlined">photo_camera</span>
			<span>Foto Kamera</span>
		</GlassButton>

		<GlassButton
			variant="secondary"
			class="flex items-center justify-center gap-2 py-3"
			onclick={() => handlePickPhoto('photos')}
		>
			<span class="material-symbols-outlined">photo_library</span>
			<span>Pilih Galeri</span>
		</GlassButton>
	</div>

	<!-- File input fallback untuk web -->
	<label
		class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant p-3 text-xs text-on-surface-variant transition-colors hover:bg-surface-container"
	>
		<span class="material-symbols-outlined text-lg">upload_file</span>
		<span>Atau pilih berkas gambar dari komputer (Web/Desktop)</span>
		<input type="file" accept="image/*" class="hidden" onchange={handleFileInput} />
	</label>

	<!-- Error Alert -->
	{#if errorMessage}
		<div
			class="border-error/30 bg-error-container/20 text-error flex items-start gap-2 rounded-xl border p-3.5 text-xs"
		>
			<span class="material-symbols-outlined text-base">error</span>
			<div class="flex-1">
				<p class="font-bold">Kendala Pemindaian OCR</p>
				<p class="mt-0.5 leading-relaxed">{errorMessage}</p>
			</div>
		</div>
	{/if}

	<!-- Pratinjau Foto Terkompresi -->
	{#if image}
		<GlassCard class="flex flex-col gap-3 p-4">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface">Foto Struk (Terkonversi ke JPEG)</span>
				<span
					class="rounded-full bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
				>
					{image.width} × {image.height} px
				</span>
			</div>

			<div class="relative max-h-72 w-full overflow-hidden rounded-lg bg-black/10">
				<img src={image.dataUrl} alt="Pratinjau Struk" class="max-h-72 w-full object-contain" />
			</div>

			<GlassButton
				variant="ghost"
				class="w-full text-xs"
				disabled={isProcessing}
				onclick={() => image && runOcr(image)}
			>
				{isProcessing ? 'Memindai Teks...' : 'Jalankan Ulang OCR pada Foto Ini'}
			</GlassButton>
		</GlassCard>
	{/if}

	<!-- Loading Indicator -->
	{#if isProcessing}
		<div class="flex flex-col items-center justify-center gap-2 py-8 text-on-surface-variant">
			<span class="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
			<p class="text-xs font-medium">Memproses gambar dan mendeteksi baris teks...</p>
		</div>
	{/if}

	<!-- Hasil OCR -->
	{#if ocrResult}
		<div class="flex flex-col gap-4">
			<!-- Visualisasi Baris Teks & Bounding Box -->
			<GlassCard class="flex flex-col gap-3 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm text-primary">crop_free</span>
						<h3 class="text-xs font-bold text-on-surface">
							Baris Teks Terdeteksi ({ocrResult.blocks.flatMap((b) => b.lines).length} Baris)
						</h3>
					</div>
					<span class="text-[10px] text-outline">Koordinat: [L, T, R, B]</span>
				</div>

				<div class="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
					{#each ocrResult.blocks as block, bIdx (bIdx)}
						<div class="flex flex-col gap-1.5 rounded-lg bg-surface-container-low/80 p-2.5">
							<span class="text-[10px] font-bold text-primary">Blok #{bIdx + 1}</span>
							{#each block.lines as line, lIdx (lIdx)}
								<div
									class="border-surface-variant/40 flex items-start justify-between gap-2 border-b pb-1 text-xs last:border-b-0"
								>
									<span class="font-mono text-on-surface">{bIdx + 1}.{lIdx + 1} "{line.text}"</span>
									{#if line.boundingBox}
										<span class="shrink-0 font-mono text-[10px] text-outline">
											[{line.boundingBox.left}, {line.boundingBox.top}, {line.boundingBox.right}, {line
												.boundingBox.bottom}]
										</span>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</GlassCard>

			<!-- Salin JSON Fixture Lengkap -->
			<GlassCard class="flex flex-col gap-3 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm text-primary">data_object</span>
						<h3 class="text-xs font-bold text-on-surface">JSON Fixture Siap Simpan</h3>
					</div>
					<button
						type="button"
						class="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary shadow-xs transition-transform active:scale-95"
						onclick={() => copyToClipboard(fixtureJson)}
					>
						<span class="material-symbols-outlined text-sm">content_copy</span>
						<span>Salin JSON Fixture</span>
					</button>
				</div>

				{#if copyToast}
					<p class="text-secondary text-xs font-bold">{copyToast}</p>
				{/if}

				<textarea
					readonly
					rows="12"
					class="w-full rounded-lg bg-surface-container-highest p-3 font-mono text-[11px] text-on-surface focus:outline-none"
					value={fixtureJson}></textarea>
			</GlassCard>
		</div>
	{/if}
</div>
