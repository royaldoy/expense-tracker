<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { App } from '@capacitor/app';
	import type { PluginListenerHandle } from '@capacitor/core';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import VoiceInputModal from '$lib/components/voice/VoiceInputModal.svelte';
	import { platform, type FlashMode } from '$lib/platform';
	import { receiptScanStore } from '$lib/stores/scanStore';
	import { triggerHapticImpact, triggerHapticNotification } from '$lib/stores/uiStore';

	let hasPermission = $state(false);
	let isPermissionChecking = $state(true);
	let showPermissionSheet = $state(false);
	let isCapturing = $state(false);
	let flashMode = $state<FlashMode>('off');
	let isVoiceModalOpen = $state(false);
	let cameraError = $state<string | null>(null);

	// Tap-to-focus ring state
	let focusRing = $state<{ x: number; y: number; visible: boolean }>({
		x: 0,
		y: 0,
		visible: false
	});
	let focusTimeout: ReturnType<typeof setTimeout> | null = null;

	// Swipe left to dismiss state
	let touchStartX = 0;
	let touchStartY = 0;

	let appStateHandle: PluginListenerHandle | null = null;
	let removeBackListener: (() => void) | null = null;

	onMount(() => {
		// 1. Terapkan class transparansi DOM untuk CameraX SurfaceView
		if (typeof document !== 'undefined') {
			document.documentElement.classList.add('camera-preview-active');
			document.body.classList.add('camera-preview-active');
		}

		// 2. Daftarkan hardware back button Android
		removeBackListener = platform.backButton.addListener(() => {
			if (showPermissionSheet) {
				showPermissionSheet = false;
				return true;
			}
			if (isVoiceModalOpen) {
				isVoiceModalOpen = false;
				return true;
			}
			handleClose();
			return true;
		});

		// 3. Dengarkan state aplikasi (background/foreground)
		if (platform.isNative) {
			App.addListener('appStateChange', (state) => {
				if (!state.isActive) {
					stopCamera();
				} else if (hasPermission && !isVoiceModalOpen) {
					startCamera();
				}
			}).then((handle) => {
				appStateHandle = handle;
			});
		}

		// 4. Inisialisasi pengecekan izin dan kamera
		initCamera();

		return () => {
			cleanup();
		};
	});

	onDestroy(() => {
		cleanup();
	});

	function cleanup() {
		stopCamera();
		if (typeof document !== 'undefined') {
			document.documentElement.classList.remove('camera-preview-active');
			document.body.classList.remove('camera-preview-active');
		}
		if (removeBackListener) {
			removeBackListener();
			removeBackListener = null;
		}
		if (appStateHandle) {
			appStateHandle.remove();
			appStateHandle = null;
		}
		if (focusTimeout) {
			clearTimeout(focusTimeout);
		}
	}

	async function initCamera() {
		isPermissionChecking = true;
		cameraError = null;

		try {
			const permitted = await platform.liveCamera.checkPermissions();
			hasPermission = permitted;

			if (permitted) {
				await startCamera();
			} else {
				showPermissionSheet = true;
			}
		} catch (err) {
			console.error('Error saat memeriksa izin kamera:', err);
			showPermissionSheet = true;
		} finally {
			isPermissionChecking = false;
		}
	}

	async function startCamera() {
		try {
			cameraError = null;
			await platform.liveCamera.start({
				position: 'rear',
				toBack: true,
				disableAudio: true
			});
			flashMode = platform.liveCamera.getFlashMode();
		} catch (err) {
			console.error('Gagal memulai preview kamera:', err);
			cameraError = 'Tidak dapat memulai preview kamera langsung.';
		}
	}

	async function stopCamera() {
		try {
			await platform.liveCamera.stop();
		} catch {
			// Abaikan error penghentian
		}
	}

	async function handleRequestPermission() {
		showPermissionSheet = false;
		try {
			const granted = await platform.liveCamera.requestPermissions();
			hasPermission = granted;
			if (granted) {
				await startCamera();
			} else {
				cameraError = 'Izin kamera ditolak. Gunakan opsi fallback atau berikan izin di Pengaturan.';
			}
		} catch (err) {
			console.error('Error saat meminta izin kamera:', err);
			cameraError = 'Gagal meminta izin kamera.';
		}
	}

	async function handleToggleFlash() {
		triggerHapticImpact('light');
		try {
			flashMode = await platform.liveCamera.toggleFlashMode();
		} catch (err) {
			console.error('Gagal mengubah flash mode:', err);
		}
	}

	function handleViewfinderTap(e: MouseEvent | TouchEvent) {
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

		focusRing = {
			x: clientX,
			y: clientY,
			visible: true
		};

		if (focusTimeout) clearTimeout(focusTimeout);
		focusTimeout = setTimeout(() => {
			focusRing.visible = false;
		}, 900);

		platform.liveCamera.setFocus({ x: clientX, y: clientY });
	}

	async function handleCapture() {
		if (isCapturing) return;
		isCapturing = true;
		triggerHapticImpact('heavy');

		try {
			// 1. Ambil foto beresolusi penuh dari sensor kamera (otomatis terkompresi ke JPEG maks 1600px)
			const compressedImage = await platform.liveCamera.capture(90);

			// 2. Jalankan pengenalan teks ML Kit pada gambar terkompresi
			const ocrResult = await platform.cameraOcr.recognizeText(compressedImage);

			// 3. Simpan ke reactive scan store
			receiptScanStore.set({
				image: compressedImage,
				ocrResult,
				scannedAt: new Date()
			});

			triggerHapticNotification('success');

			// 4. Beralih ke halaman tinjauan struk
			await goto('/scan/review');
		} catch (err) {
			console.error('Gagal mengambil atau memproses foto struk:', err);
			triggerHapticNotification('error');
			cameraError = 'Gagal memproses foto struk. Coba lagi.';
		} finally {
			isCapturing = false;
		}
	}

	async function handlePickGallery() {
		triggerHapticImpact('light');
		try {
			isCapturing = true;
			const compressedImage = await platform.cameraOcr.captureOrPickPhoto('photos');
			const ocrResult = await platform.cameraOcr.recognizeText(compressedImage);

			receiptScanStore.set({
				image: compressedImage,
				ocrResult,
				scannedAt: new Date()
			});

			triggerHapticNotification('success');
			await goto('/scan/review');
		} catch (err) {
			console.error('Gagal memilih foto dari galeri:', err);
		} finally {
			isCapturing = false;
		}
	}

	async function handleSystemCameraFallback() {
		triggerHapticImpact('light');
		try {
			isCapturing = true;
			const compressedImage = await platform.cameraOcr.captureOrPickPhoto('camera');
			const ocrResult = await platform.cameraOcr.recognizeText(compressedImage);

			receiptScanStore.set({
				image: compressedImage,
				ocrResult,
				scannedAt: new Date()
			});

			triggerHapticNotification('success');
			await goto('/scan/review');
		} catch (err) {
			console.error('Gagal mengambil foto dari kamera sistem:', err);
		} finally {
			isCapturing = false;
		}
	}

	function handleClose() {
		triggerHapticImpact('light');
		cleanup();
		goto('/');
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const deltaX = e.changedTouches[0].clientX - touchStartX;
		const deltaY = e.changedTouches[0].clientY - touchStartY;

		// Gestur geser ke kiri (swipe left) untuk menutup layar scan dan kembali ke Beranda
		if (deltaX < -90 && Math.abs(deltaY) < 60) {
			handleClose();
		}
	}

	// Koordinasi hardware kamera saat modal rekognisi suara dibuka/ditutup
	$effect(() => {
		if (isVoiceModalOpen) {
			stopCamera();
		} else if (hasPermission && !showPermissionSheet && !isPermissionChecking) {
			startCamera();
		}
	});

	const flashIconMap: Record<FlashMode, string> = {
		off: 'flash_off',
		on: 'flash_on',
		torch: 'flashlight_on',
		auto: 'flash_auto'
	};
</script>

<svelte:head>
	<title>Scan Struk - Money Tracker</title>
</svelte:head>

<!-- Container Layar Penuh Kamera Live -->
<div
	class="fixed inset-0 z-10 flex flex-col justify-between overflow-hidden bg-transparent select-none"
	role="region"
	aria-label="Live Camera Viewfinder"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
>
	<!-- TOP CONTROLS OVERLAY -->
	<header
		class="pt-safe pointer-events-auto relative z-20 flex items-center justify-between px-5 pt-3 pb-2"
		style="background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, transparent 100%);"
	>
		<!-- Tombol Tutup / Kembali -->
		<GlassButton
			variant="icon"
			size="md"
			class="!h-11 !w-11 !rounded-full !text-white active:scale-90"
			style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);"
			onclick={handleClose}
			aria-label="Kembali ke Beranda"
			data-testid="scan-close-btn"
		>
			<span class="material-symbols-outlined text-2xl">close</span>
		</GlassButton>

		<!-- Indikator Judul Tengah Ringkas -->
		<div
			class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white/90"
			style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.15);"
		>
			<span class="material-symbols-outlined text-sm text-cyan-400">document_scanner</span>
			<span>Pindai Struk</span>
		</div>

		<!-- Tombol Aksi Kanan: Flash Mode & Galeri -->
		<div class="flex items-center gap-2.5">
			<GlassButton
				variant="icon"
				size="md"
				class="!h-11 !w-11 !rounded-full !text-white active:scale-90"
				style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);"
				onclick={handleToggleFlash}
				aria-label="Ubah Flash Mode"
				data-testid="scan-flash-btn"
			>
				<span class="material-symbols-outlined text-2xl text-amber-300">
					{flashIconMap[flashMode] || 'flash_off'}
				</span>
			</GlassButton>

			<GlassButton
				variant="icon"
				size="md"
				class="!h-11 !w-11 !rounded-full !text-white active:scale-90"
				style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);"
				onclick={handlePickGallery}
				aria-label="Pilih foto dari Galeri"
				data-testid="scan-gallery-btn"
			>
				<span class="material-symbols-outlined text-2xl">photo_library</span>
			</GlassButton>
		</div>
	</header>

	<!-- CENTER VIEWFINDER AREA (Reticle, Laser Sweep & Tap-to-Focus) -->
	<div
		class="relative flex flex-1 flex-col items-center justify-center px-6"
		role="presentation"
		onclick={handleViewfinderTap}
	>
		<!-- Pesan Error / Fallback Banner jika Preview tidak berjalan -->
		{#if cameraError && !showPermissionSheet}
			<div
				class="pointer-events-auto absolute z-30 mx-6 max-w-sm rounded-2xl p-4 text-center"
				style="background: rgba(20, 20, 24, 0.92); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);"
			>
				<div class="mb-2 flex justify-center text-amber-400">
					<span class="material-symbols-outlined text-3xl">warning</span>
				</div>
				<p class="text-xs text-white/90">{cameraError}</p>
				<div class="mt-3 flex flex-col gap-2">
					<GlassButton
						variant="primary"
						size="sm"
						class="w-full text-xs"
						onclick={handleSystemCameraFallback}
					>
						<span class="material-symbols-outlined mr-1 text-sm">photo_camera</span>
						Buka Kamera Sistem
					</GlassButton>
					<GlassButton
						variant="secondary"
						size="sm"
						class="w-full text-xs"
						onclick={handlePickGallery}
					>
						<span class="material-symbols-outlined mr-1 text-sm">photo_library</span>
						Pilih dari Galeri
					</GlassButton>
				</div>
			</div>
		{/if}

		<!-- Reticle Struk Vertikal dengan 4 Sudut L-Bracket -->
		<div
			class="relative flex h-[420px] w-full max-w-[290px] flex-col items-center justify-between rounded-3xl p-4"
			style="box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);"
			data-testid="scan-reticle"
		>
			<!-- Sudut Kiri Atas -->
			<div
				class="absolute -top-1 -left-1 h-8 w-8 rounded-tl-2xl border-t-3 border-l-3 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
			></div>
			<!-- Sudut Kanan Atas -->
			<div
				class="absolute -top-1 -right-1 h-8 w-8 rounded-tr-2xl border-t-3 border-r-3 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
			></div>
			<!-- Sudut Kiri Bawah -->
			<div
				class="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-3 border-l-3 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
			></div>
			<!-- Sudut Kanan Bawah -->
			<div
				class="absolute -right-1 -bottom-1 h-8 w-8 rounded-br-2xl border-r-3 border-b-3 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
			></div>

			<!-- Laser Sweep Scanning Animation -->
			<div
				class="pointer-events-none absolute inset-x-2 h-1 overflow-hidden"
				style="animation: laser-sweep 2.4s ease-in-out infinite alternate;"
			>
				<div
					class="h-full w-full rounded-full"
					style="background: linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.95) 50%, transparent 100%); box-shadow: 0 0 16px 2px rgba(34, 211, 238, 0.85);"
				></div>
			</div>
		</div>

		<!-- Teks Panduan di Bawah Reticle -->
		<div
			class="mt-4 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-white/80"
			style="background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.15);"
		>
			<span class="material-symbols-outlined text-sm text-cyan-300">crop_free</span>
			<span>Posisikan struk belanja di dalam kotak</span>
		</div>

		<!-- Animated Tap-To-Focus Ring -->
		{#if focusRing.visible}
			<div
				class="pointer-events-none fixed z-50 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400"
				style="left: {focusRing.x}px; top: {focusRing.y}px; animation: focus-pulse 0.8s ease-out forwards;"
			></div>
		{/if}
	</div>

	<!-- BOTTOM LIQUID GLASS DOCK (3 Tombol: Catat, Shutter, Suara) -->
	<footer
		class="pb-safe pointer-events-auto relative z-20 flex w-full max-w-[420px] flex-col items-center self-center px-6 pt-3 pb-6"
		style="background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);"
	>
		<div
			class="flex w-full items-center justify-between rounded-full px-5 py-3"
			style="background: rgba(18, 18, 22, 0.65); border: 1px solid rgba(255, 255, 255, 0.22); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);"
		>
			<!-- Tombol Kiri: Catat Manual -->
			<GlassButton
				variant="text"
				size="sm"
				class="!flex !h-auto !flex-col !items-center !justify-center !gap-1 !p-1 !text-white/90 active:scale-95"
				onclick={() => {
					triggerHapticImpact('light');
					goto('/transactions/new');
				}}
				aria-label="Catat Transaksi Manual"
				data-testid="scan-dock-manual-btn"
			>
				<div
					class="flex h-11 w-11 items-center justify-center rounded-full"
					style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2);"
				>
					<span class="material-symbols-outlined text-xl">edit_note</span>
				</div>
				<span class="text-[10px] font-medium tracking-tight">Catat</span>
			</GlassButton>

			<!-- Tombol Tengah: Shutter Button Besar Taktil -->
			<GlassButton
				variant="icon"
				class="relative !h-20 !w-20 !rounded-full active:scale-90 disabled:opacity-60"
				style="background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.5); box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);"
				onclick={handleCapture}
				disabled={isCapturing}
				aria-label="Ambil Foto Struk"
				data-testid="scan-shutter-btn"
			>
				<!-- Lingkaran Inti Shutter -->
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md transition-all {isCapturing
						? 'scale-75 bg-cyan-400'
						: ''}"
				>
					{#if isCapturing}
						<div
							class="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
					{:else}
						<div class="h-14 w-14 rounded-full border border-black/10"></div>
					{/if}
				</div>
			</GlassButton>

			<!-- Tombol Kanan: Input Suara -->
			<GlassButton
				variant="text"
				size="sm"
				class="!flex !h-auto !flex-col !items-center !justify-center !gap-1 !p-1 !text-white/90 active:scale-95"
				onclick={() => {
					triggerHapticImpact('light');
					isVoiceModalOpen = true;
				}}
				aria-label="Input Transaksi Suara"
				data-testid="scan-dock-voice-btn"
			>
				<div
					class="flex h-11 w-11 items-center justify-center rounded-full"
					style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2);"
				>
					<span class="material-symbols-outlined text-xl">mic</span>
				</div>
				<span class="text-[10px] font-medium tracking-tight">Suara</span>
			</GlassButton>
		</div>
	</footer>
</div>

<!-- Modal Rekognisi Suara Terintegrasi -->
<VoiceInputModal bind:isOpen={isVoiceModalOpen} />

<!-- Educational Permission Pre-Prompt Sheet -->
<GlassSheet bind:isOpen={showPermissionSheet} title="Akses Kamera Diperlukan">
	<div class="flex flex-col items-center gap-4 py-2 text-center">
		<div
			class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
			style="background: var(--color-primary);"
		>
			<span class="material-symbols-outlined text-3xl">photo_camera</span>
		</div>

		<div class="space-y-1.5">
			<h3 class="text-sm font-bold text-on-surface">Pindai Struk Lebih Cepat & Otomatis</h3>
			<p class="text-xs leading-relaxed text-on-surface-variant">
				Money Tracker membutuhkan izin akses kamera untuk menampilkan preview dan membaca teks pada
				struk belanja secara lokal langsung di perangkat Anda tanpa mengirim data ke internet.
			</p>
		</div>

		<div class="mt-3 flex w-full flex-col gap-2">
			<GlassButton
				variant="primary"
				size="md"
				class="w-full"
				onclick={handleRequestPermission}
				data-testid="scan-request-permission-btn"
			>
				<span class="material-symbols-outlined mr-1.5 text-lg">check_circle</span>
				Izinkan Akses Kamera
			</GlassButton>

			<GlassButton
				variant="secondary"
				size="md"
				class="w-full"
				onclick={() => {
					showPermissionSheet = false;
					handlePickGallery();
				}}
			>
				<span class="material-symbols-outlined mr-1.5 text-lg">photo_library</span>
				Pilih dari Galeri Saja
			</GlassButton>
		</div>
	</div>
</GlassSheet>

<style>
	@keyframes laser-sweep {
		0% {
			top: 5%;
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
		100% {
			top: 92%;
			opacity: 0.8;
		}
	}

	@keyframes focus-pulse {
		0% {
			transform: translate(-50%, -50%) scale(1.6);
			opacity: 0;
		}
		50% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(0.9);
			opacity: 0;
		}
	}
</style>
