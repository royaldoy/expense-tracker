<script lang="ts">
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { platform } from '$lib/platform';
	import type { CompressedImage, OcrResult } from '$lib/platform/types';

	interface ExpectedFormItem {
		name: string;
		qty: string;
		unitPrice: string;
		totalPrice: string;
	}

	let image = $state<CompressedImage | null>(null);
	let isProcessing = $state(false);
	let ocrResult = $state<OcrResult | null>(null);
	let errorMessage = $state('');
	let copyToast = $state('');
	let shareToast = $state('');

	// Form input "Hasil yang Benar" (Ground Truth / Expected) - Seluruhnya opsional
	let expectedMerchant = $state('');
	let expectedDate = $state('');
	let expectedTime = $state('');
	let expectedTotal = $state('');
	let expectedItems = $state<ExpectedFormItem[]>([]);

	function addItem() {
		expectedItems = [...expectedItems, { name: '', qty: '1', unitPrice: '', totalPrice: '' }];
	}

	function removeItem(index: number) {
		expectedItems = expectedItems.filter((_, i) => i !== index);
	}

	function sanitizeSlug(str: string): string {
		return (
			str
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '') || 'struk'
		);
	}

	function buildFixtureObject() {
		if (!ocrResult || !image) return null;

		const lines = ocrResult.blocks.flatMap((b) =>
			b.lines.map((l) => ({
				text: l.text,
				boundingBox: l.boundingBox
			}))
		);

		const items = expectedItems
			.filter((it) => it.name.trim().length > 0)
			.map((it) => {
				const qtyNum = it.qty ? parseInt(it.qty, 10) : undefined;
				const unitPriceNum = it.unitPrice ? parseInt(it.unitPrice, 10) : undefined;
				const totalPriceNum = it.totalPrice ? parseInt(it.totalPrice, 10) : undefined;
				return {
					name: it.name.trim(),
					qty: Number.isFinite(qtyNum) ? qtyNum : undefined,
					unitPrice: Number.isFinite(unitPriceNum) ? unitPriceNum : undefined,
					totalPrice: Number.isFinite(totalPriceNum) ? totalPriceNum : undefined
				};
			});

		const grandTotalNum = expectedTotal ? parseInt(expectedTotal, 10) : undefined;

		const expected: Record<string, unknown> = {};
		if (expectedMerchant.trim()) expected.merchantName = expectedMerchant.trim();
		if (expectedDate.trim()) expected.date = expectedDate.trim();
		if (expectedTime.trim()) expected.time = expectedTime.trim();
		if (Number.isFinite(grandTotalNum)) expected.grandTotal = grandTotalNum;
		if (items.length > 0) expected.items = items;

		return {
			description: `Struk fisik ${expectedMerchant.trim() || 'tanpa nama'}`,
			image: {
				width: image.width,
				height: image.height
			},
			ocr: {
				rawText: ocrResult.text,
				lines
			},
			...(Object.keys(expected).length > 0 ? { expected } : {})
		};
	}

	let fixtureJson = $derived.by(() => {
		const obj = buildFixtureObject();
		return obj ? JSON.stringify(obj, null, 2) : '';
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

			// Prediksi awal merchant name dari baris pertama jika form masih kosong
			if (!expectedMerchant && result.blocks[0]?.lines[0]?.text) {
				expectedMerchant = result.blocks[0].lines[0].text.trim();
			}
			if (!expectedDate) {
				expectedDate = new Date().toISOString().split('T')[0];
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Gagal menjalankan OCR';
		} finally {
			isProcessing = false;
		}
	}

	async function handleShareFixture() {
		const fixture = buildFixtureObject();
		if (!fixture) return;

		const jsonString = JSON.stringify(fixture, null, 2);
		const merchantSlug = sanitizeSlug(expectedMerchant || 'struk');
		const fileNumber = Date.now().toString().slice(-4);
		const filename = `${merchantSlug}-${fileNumber}.json`;

		try {
			if (platform.isNative) {
				const writeResult = await platform.filesystem.writeFile({
					path: filename,
					data: jsonString,
					directory: 'cache'
				});
				await platform.share.share({
					title: `Fixture Struk ${expectedMerchant || ''}`,
					dialogTitle: 'Bagikan Fixture Struk',
					files: [writeResult.uri]
				});
			} else {
				await platform.filesystem.saveAndDownload(filename, jsonString, 'application/json');
			}
			shareToast = `Berkas ${filename} siap dibagikan!`;
			setTimeout(() => {
				shareToast = '';
			}, 3000);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.toLowerCase().includes('abort') && !msg.toLowerCase().includes('batal')) {
				errorMessage = `Gagal membagikan fixture: ${msg}`;
			}
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

<div class="pt-safe flex flex-col gap-4 px-4 pb-24">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<GlassButton variant="icon" size="sm" onclick={() => history.back()} aria-label="Kembali">
			<span class="material-symbols-outlined text-xl">arrow_back</span>
		</GlassButton>
		<h1 class="text-base font-bold text-on-surface">Generator Fixture OCR (/dev/ocr)</h1>
		<div class="w-9"></div>
	</header>

	<!-- Panduan Pembuatan Fixture -->
	<GlassCard class="flex flex-col gap-2 p-4">
		<div class="flex items-center gap-2 text-primary">
			<span class="material-symbols-outlined">document_scanner</span>
			<h2 class="text-sm font-bold text-on-surface">Ambil Struk Asli & Buat Fixture</h2>
		</div>
		<p class="text-xs leading-relaxed text-on-surface-variant">
			Foto struk asli dengan kamera HP atau galeri. Setelah teks terbaca, lengkapi form "Hasil yang
			Benar", lalu tekan <strong class="text-on-surface">"Bagikan Fixture"</strong> untuk menghasilkan
			berkas JSON tanpa foto.
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
				<span class="text-xs font-bold text-on-surface">Pratinjau Foto (JPEG Maks 1600 px)</span>
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

	<!-- Hasil OCR & Formulir Ground Truth -->
	{#if ocrResult}
		<div class="flex flex-col gap-4">
			<!-- Formulir Hasil yang Benar (Expected Ground Truth) -->
			<GlassCard class="flex flex-col gap-3 p-4">
				<div class="flex items-center gap-2 text-primary">
					<span class="material-symbols-outlined text-lg">check_circle</span>
					<h3 class="text-sm font-bold text-on-surface">Hasil yang Benar (Ground Truth)</h3>
				</div>
				<p class="text-[11px] leading-relaxed text-on-surface-variant">
					Seluruh kolom bersifat opsional. Lengkapi informasi yang terbaca jelas untuk data acuan
					pengujian parser.
				</p>

				<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
					<!-- Merchant -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-semibold text-outline">Nama Toko / Merchant</span>
						<input
							type="text"
							placeholder="Misal: Indomaret, Kopi Kenangan"
							class="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:outline-none"
							bind:value={expectedMerchant}
						/>
					</div>

					<!-- Total -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-semibold text-outline">Grand Total Tagihan (Rp)</span>
						<input
							type="number"
							placeholder="Misal: 45000"
							class="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:outline-none"
							bind:value={expectedTotal}
						/>
					</div>

					<!-- Tanggal -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-semibold text-outline">Tanggal Transaksi</span>
						<input
							type="date"
							class="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:outline-none"
							bind:value={expectedDate}
						/>
					</div>

					<!-- Jam -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-semibold text-outline">Waktu / Jam (HH:mm)</span>
						<input
							type="text"
							placeholder="Misal: 14:30"
							class="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:outline-none"
							bind:value={expectedTime}
						/>
					</div>
				</div>

				<!-- Daftar Item Pembelian -->
				<div class="mt-2 flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-on-surface"
							>Daftar Item ({expectedItems.length})</span
						>
						<GlassButton
							variant="secondary"
							size="sm"
							class="min-h-[28px] rounded-full px-2.5 py-1 text-[11px] text-primary"
							onclick={addItem}
						>
							<span class="material-symbols-outlined text-sm">add</span>
							<span>Tambah Item</span>
						</GlassButton>
					</div>

					{#if expectedItems.length === 0}
						<p class="text-[11px] text-outline italic">
							Belum ada rincian item. Tekan "Tambah Item" jika ingin melengkapi daftar barang.
						</p>
					{/if}

					<div class="flex flex-col gap-2">
						{#each expectedItems as item, idx (idx)}
							<div
								class="border-surface-variant/40 flex flex-col gap-1.5 rounded-lg border bg-surface-container-low/70 p-2.5 text-xs"
							>
								<div class="flex items-center justify-between gap-2">
									<input
										type="text"
										placeholder="Nama barang / menu"
										class="flex-1 rounded bg-surface-container px-2.5 py-1 text-xs text-on-surface focus:outline-none"
										bind:value={item.name}
									/>
									<GlassButton
										variant="icon"
										size="sm"
										class="hover:text-error h-7 min-h-[28px] w-7 min-w-[28px] text-outline"
										onclick={() => removeItem(idx)}
										aria-label="Hapus item"
									>
										<span class="material-symbols-outlined text-base">delete</span>
									</GlassButton>
								</div>
								<div class="grid grid-cols-3 gap-2">
									<input
										type="number"
										placeholder="Qty"
										class="rounded bg-surface-container px-2 py-1 text-[11px] text-on-surface focus:outline-none"
										bind:value={item.qty}
									/>
									<input
										type="number"
										placeholder="Harga (Rp)"
										class="rounded bg-surface-container px-2 py-1 text-[11px] text-on-surface focus:outline-none"
										bind:value={item.unitPrice}
									/>
									<input
										type="number"
										placeholder="Total (Rp)"
										class="rounded bg-surface-container px-2 py-1 text-[11px] text-on-surface focus:outline-none"
										bind:value={item.totalPrice}
									/>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Tombol Bagikan Fixture & Salin -->
				<div class="mt-3 flex flex-col gap-2 pt-2">
					<GlassButton
						variant="primary"
						class="flex items-center justify-center gap-2 py-3"
						onclick={handleShareFixture}
					>
						<span class="material-symbols-outlined">share</span>
						<span>Bagikan Fixture (File JSON)</span>
					</GlassButton>

					{#if shareToast}
						<p class="text-secondary text-center text-xs font-bold">{shareToast}</p>
					{/if}

					<div class="flex items-center justify-between gap-2 pt-1">
						<span class="text-[11px] text-outline">Atau salin teks JSON langsung:</span>
						<GlassButton
							variant="secondary"
							size="sm"
							class="min-h-[28px] rounded-full px-3 py-1 text-xs text-primary"
							onclick={() => copyToClipboard(fixtureJson)}
						>
							<span class="material-symbols-outlined text-sm">content_copy</span>
							<span>Salin JSON</span>
						</GlassButton>
					</div>
					{#if copyToast}
						<p class="text-secondary text-right text-xs font-bold">{copyToast}</p>
					{/if}
				</div>
			</GlassCard>

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

				<div class="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
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
		</div>
	{/if}
</div>
