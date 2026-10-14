<script lang="ts">
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSheet from '$lib/components/glass/GlassSheet.svelte';
	import { backupService, type RestoreResult } from '$lib/services/backupService';

	let fileInputElement: HTMLInputElement | null = null;
	let isExportingJson = $state(false);
	let isExportingCsv = $state(false);
	let isRestoring = $state(false);
	let restoreMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// State Dialog Konfirmasi Reset Data
	let isResetSheetOpen = $state(false);
	let isResetting = $state(false);
	let resetConfirmationText = $state('');

	async function handleExportJson() {
		isExportingJson = true;
		try {
			const jsonString = await backupService.exportBackupJson();
			const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			const nowStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
			a.href = url;
			a.download = `money-tracker-backup-${nowStr}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			restoreMessage = {
				type: 'error',
				text: `Gagal mengekspor data: ${String(error)}`
			};
		} finally {
			isExportingJson = false;
		}
	}

	async function handleExportCsv() {
		isExportingCsv = true;
		try {
			const csvString = await backupService.exportTransactionsCsv();
			const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			const dateStr = new Date().toISOString().substring(0, 10);
			a.href = url;
			a.download = `money-tracker-transaksi-${dateStr}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			restoreMessage = {
				type: 'error',
				text: `Gagal mengekspor CSV: ${String(error)}`
			};
		} finally {
			isExportingCsv = false;
		}
	}

	function triggerFileInput() {
		restoreMessage = null;
		fileInputElement?.click();
	}

	async function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isRestoring = true;
		restoreMessage = null;

		try {
			const text = await file.text();
			const result: RestoreResult = await backupService.restoreBackupJson(text);

			restoreMessage = {
				type: 'success',
				text: `Berhasil memulihkan data cadangan! (${result.counts.wallets} dompet, ${result.counts.categories} kategori, ${result.counts.transactions} transaksi dipulihkan).`
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			restoreMessage = {
				type: 'error',
				text: msg
			};
		} finally {
			isRestoring = false;
			// Reset input file agar dapat memilih file yang sama lagi jika perlu
			if (fileInputElement) {
				fileInputElement.value = '';
			}
		}
	}

	async function handleConfirmReset() {
		if (resetConfirmationText.trim().toLowerCase() !== 'hapus data') return;

		isResetting = true;
		try {
			await backupService.resetAllData();
			isResetSheetOpen = false;
			resetConfirmationText = '';
			restoreMessage = {
				type: 'success',
				text: 'Semua data telah dihapus. Kategori bawaan telah diinisialisasi ulang.'
			};
		} catch (error) {
			restoreMessage = {
				type: 'error',
				text: `Gagal mereset data: ${String(error)}`
			};
		} finally {
			isResetting = false;
		}
	}
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
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Cadangan & Data</h1>
			<p class="text-xs text-on-surface-variant">Ekspor, Pemulihan Atomik, dan Ekspor CSV</p>
		</div>
	</header>

	<!-- Feedback Alert -->
	{#if restoreMessage}
		<div
			class="flex items-start gap-3 rounded-2xl p-4 transition-all duration-200 {restoreMessage.type ===
			'success'
				? 'border border-income/20 bg-income/10 text-income'
				: 'border border-expense/20 bg-expense/10 text-expense'}"
			role="alert"
			data-testid="backup-status-alert"
		>
			<span class="material-symbols-outlined text-xl">
				{restoreMessage.type === 'success' ? 'check_circle' : 'error'}
			</span>
			<p class="flex-1 text-xs leading-relaxed font-semibold">
				{restoreMessage.text}
			</p>
			<GlassButton
				variant="icon"
				size="sm"
				class="h-6 min-h-[24px] w-6 min-w-[24px]"
				onclick={() => (restoreMessage = null)}
				aria-label="Tutup pesan"
			>
				<span class="material-symbols-outlined text-sm">close</span>
			</GlassButton>
		</div>
	{/if}

	<!-- Bagian 1: Ekspor JSON Berversi -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Cadangkan Data (JSON)
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
					style="background: #006E28;"
				>
					<span class="material-symbols-outlined text-xl">download</span>
				</div>
				<div>
					<p class="text-sm font-semibold text-on-surface">Ekspor Berkas Cadangan</p>
					<p class="text-xs text-on-surface-variant">
						Format JSON berversi dengan envelope metadata
					</p>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant">
				Simpan seluruh dompet, transaksi, kategori, anggaran, dan pengaturan ke berkas lokal. Anda
				dapat memulihkannya kapan saja di perangkat ini atau perangkat lain.
			</p>
			<div class="pt-1">
				<GlassButton
					variant="primary"
					class="w-full"
					onclick={handleExportJson}
					disabled={isExportingJson}
					data-testid="btn-export-json"
				>
					<span class="material-symbols-outlined text-lg">download</span>
					{isExportingJson ? 'Membuat Cadangan...' : 'Unduh Cadangan JSON'}
				</GlassButton>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 2: Pemulihan Data Atomik -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Pulihkan Data (Restore)
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
					style="background: #0058BC;"
				>
					<span class="material-symbols-outlined text-xl">upload_file</span>
				</div>
				<div>
					<p class="text-sm font-semibold text-on-surface">Pulihkan dari Berkas JSON</p>
					<p class="text-xs text-on-surface-variant">
						Validasi Valibot di memori sebelum penulisan
					</p>
				</div>
			</div>
			<div class="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
				<p class="font-semibold text-on-surface">Jaminan Keamanan Data:</p>
				<p class="mt-1">
					Sistem memvalidasi keutuhan skema dan integritas relasional terlebih dahulu di memori.
					Berkas yang rusak atau tidak valid akan ditolak secara utuh tanpa menyentuh data lama.
				</p>
			</div>

			<!-- Input File Tersembunyi -->
			<input
				type="file"
				accept=".json,application/json"
				bind:this={fileInputElement}
				onchange={handleFileSelected}
				class="hidden"
				data-testid="input-backup-file"
			/>

			<div class="pt-1">
				<GlassButton
					variant="secondary"
					class="w-full"
					onclick={triggerFileInput}
					disabled={isRestoring}
					data-testid="btn-trigger-restore"
				>
					<span class="material-symbols-outlined text-lg">folder_open</span>
					{isRestoring ? 'Memvalidasi & Memulihkan...' : 'Pilih Berkas Cadangan (.json)'}
				</GlassButton>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 3: Ekspor Transaksi ke CSV -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Ekspor Spreadsheet (CSV)
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
					style="background: #5856D6;"
				>
					<span class="material-symbols-outlined text-xl">table_view</span>
				</div>
				<div>
					<p class="text-sm font-semibold text-on-surface">Ekspor Riwayat Transaksi CSV</p>
					<p class="text-xs text-on-surface-variant">Standar RFC 4180 dengan awalan UTF-8 BOM</p>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant">
				Kompatibel langsung dengan Microsoft Excel, Google Sheets, dan Numbers tanpa masalah
				karakter khusus atau pembagian kolom.
			</p>
			<div class="pt-1">
				<GlassButton
					variant="secondary"
					class="w-full"
					onclick={handleExportCsv}
					disabled={isExportingCsv}
					data-testid="btn-export-csv"
				>
					<span class="material-symbols-outlined text-lg">file_download</span>
					{isExportingCsv ? 'Menyusun CSV...' : 'Unduh Spreadsheet CSV'}
				</GlassButton>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 4: Zona Bahaya (Reset Data) -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-expense uppercase">Zona Bahaya</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 border border-expense/30 p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
					style="background: var(--color-expense);"
				>
					<span class="material-symbols-outlined text-xl">delete_forever</span>
				</div>
				<div>
					<p class="text-sm font-bold text-expense">Hapus Semua Data Aplikasi</p>
					<p class="text-xs text-on-surface-variant">Bersihkan IndexedDB dan atur ulang aplikasi</p>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant">
				Tindakan ini akan menghapus seluruh saldo dompet, transaksi, kategori kustom, dan pengaturan
				secara permanen. Pastikan Anda telah membuat cadangan sebelum melanjutkan.
			</p>
			<div class="pt-1">
				<GlassButton
					variant="danger"
					class="w-full"
					onclick={() => {
						resetConfirmationText = '';
						isResetSheetOpen = true;
					}}
					data-testid="btn-open-reset-sheet"
				>
					<span class="material-symbols-outlined text-lg">warning</span>
					Hapus Semua Data
				</GlassButton>
			</div>
		</GlassCard>
	</section>
</div>

<!-- Modal Konfirmasi Reset Data (GlassSheet) -->
<GlassSheet bind:isOpen={isResetSheetOpen} title="Konfirmasi Hapus Semua Data">
	<div class="flex flex-col gap-4 p-4">
		<div class="flex items-start gap-3 rounded-2xl bg-expense/10 p-3.5 text-expense">
			<span class="material-symbols-outlined mt-0.5 text-xl">warning</span>
			<div class="text-xs">
				<p class="font-bold">PERINGATAN: Tindakan tidak dapat dibatalkan!</p>
				<p class="mt-1 leading-relaxed">
					Semua catatan keuangan lokal Anda akan dihapus bersih dari perangkat ini.
				</p>
			</div>
		</div>

		<div>
			<label for="input-confirm-reset" class="text-xs font-medium text-on-surface-variant">
				Ketik <span class="font-bold text-expense select-none">hapus data</span> di bawah untuk mengonfirmasi:
			</label>
			<input
				id="input-confirm-reset"
				type="text"
				bind:value={resetConfirmationText}
				placeholder="hapus data"
				class="mt-1.5 w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:border-expense focus:outline-hidden"
				data-testid="input-confirm-reset-text"
			/>
		</div>

		<div class="flex gap-2.5 pt-2">
			<GlassButton
				variant="secondary"
				class="flex-1"
				onclick={() => (isResetSheetOpen = false)}
				disabled={isResetting}
			>
				Batal
			</GlassButton>
			<GlassButton
				variant="danger"
				class="flex-1"
				onclick={handleConfirmReset}
				disabled={isResetting || resetConfirmationText.trim().toLowerCase() !== 'hapus data'}
				data-testid="btn-confirm-reset-final"
			>
				{isResetting ? 'Menghapus...' : 'Ya, Hapus Data'}
			</GlassButton>
		</div>
	</div>
</GlassSheet>
