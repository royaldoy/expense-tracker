<script lang="ts">
	import { onMount } from 'svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import { formatRupiah } from '$lib/domain/money';
	import { formatPeriod, type Period } from '$lib/domain/period';
	import { settingService } from '$lib/services';

	let salaryDay = $state(1);
	let currentPeriod = $state<Period | null>(null);
	let isSaving = $state(false);
	let saveMessage = $state<string | null>(null);

	const presets = [1, 20, 25, 27, 28];

	async function loadSettings() {
		salaryDay = await settingService.getSalaryDay();
		currentPeriod = await settingService.getCurrentReportPeriod();
	}

	async function handleSaveSalaryDay() {
		isSaving = true;
		saveMessage = null;
		try {
			await settingService.setSalaryDay(salaryDay);
			currentPeriod = await settingService.getCurrentReportPeriod();
			saveMessage = 'Pengaturan tanggal gajian berhasil disimpan!';
			setTimeout(() => {
				saveMessage = null;
			}, 3000);
		} catch (error) {
			saveMessage = `Gagal menyimpan: ${String(error)}`;
		} finally {
			isSaving = false;
		}
	}

	function selectPreset(day: number) {
		salaryDay = day;
	}

	onMount(() => {
		loadSettings();
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
			<h1 class="text-xl font-bold tracking-tight text-on-surface">Mata Uang & Format</h1>
			<p class="text-xs text-on-surface-variant">Konfigurasi Rupiah & Siklus Tanggal Gajian</p>
		</div>
	</header>

	<!-- Bagian 1: Mata Uang & Standar Format -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Mata Uang Utama
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-3 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
						style="background: #0058BC;"
					>
						<span class="material-symbols-outlined text-xl">currency_exchange</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">Rupiah Indonesia (IDR)</p>
						<p class="text-xs text-on-surface-variant">Simbol: Rp • Pemisah Ribuan: Titik (.)</p>
					</div>
				</div>
				<span
					class="rounded-lg px-2 py-1 text-xs font-bold text-income"
					style="background: var(--color-income-container);"
				>
					Baku (IDR)
				</span>
			</div>

			<div class="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
				<p class="font-medium text-on-surface">Aturan Data Integritas Keuangan:</p>
				<p class="mt-1">
					Seluruh nilai moneter disimpan sebagai bilangan bulat (Integer Rupiah) tanpa floating
					point untuk menjamin akurasi mutasi 100%.
				</p>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 2: Pratinjau Format Live -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Pratinjau Format Angka
		</h2>
		<GlassCard variant="opaque" class="divide-y divide-surface-container-highest overflow-hidden">
			<div class="flex items-center justify-between p-3.5">
				<span class="text-xs font-medium text-on-surface-variant">Saldo Positif (Pemasukan)</span>
				<span class="text-sm font-bold text-income tabular-nums">
					+{formatRupiah(1250000)}
				</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<span class="text-xs font-medium text-on-surface-variant">Pengeluaran (Beban)</span>
				<span class="text-sm font-bold text-expense tabular-nums">
					{formatRupiah(-50000)}
				</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<span class="text-xs font-medium text-on-surface-variant">Biaya Transfer / Admin</span>
				<span class="text-sm font-bold text-on-surface tabular-nums">
					{formatRupiah(2500)}
				</span>
			</div>
			<div class="flex items-center justify-between p-3.5">
				<span class="text-xs font-medium text-on-surface-variant">Nol (Saldo Kosong)</span>
				<span class="text-sm font-bold text-on-surface tabular-nums">
					{formatRupiah(0)}
				</span>
			</div>
		</GlassCard>
	</section>

	<!-- Bagian 3: Siklus Tanggal Gajian -->
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			Siklus Laporan & Tanggal Gajian
		</h2>
		<GlassCard variant="opaque" class="flex flex-col gap-4 p-4">
			<div>
				<label for="input-salary-day" class="text-sm font-bold text-on-surface">
					Tanggal Awal Periode Bulanan
				</label>
				<p class="mt-0.5 text-xs text-on-surface-variant">
					Laporan keuangan dan anggaran akan dihitung per siklus gajian (1 - 31).
				</p>
			</div>

			<div class="flex items-center gap-3">
				<div class="flex-1">
					<input
						id="input-salary-day"
						type="number"
						min="1"
						max="31"
						bind:value={salaryDay}
						class="w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest px-4 py-2.5 text-base font-bold text-on-surface tabular-nums focus:border-primary focus:outline-hidden"
						data-testid="input-salary-day"
					/>
				</div>
				<GlassButton
					variant="primary"
					onclick={handleSaveSalaryDay}
					disabled={isSaving}
					data-testid="btn-save-salary-day"
				>
					{isSaving ? 'Menyimpan...' : 'Simpan'}
				</GlassButton>
			</div>

			<!-- Preset Cepat -->
			<div>
				<p class="mb-2 text-xs font-semibold text-on-surface-variant">Pilihan Cepat:</p>
				<div class="flex flex-wrap gap-2">
					{#each presets as p (p)}
						<GlassButton
							variant={salaryDay === p ? 'primary' : 'secondary'}
							size="sm"
							class="min-h-[30px] px-3 py-1"
							onclick={() => selectPreset(p)}
							data-testid="preset-salary-{p}"
						>
							Tgl {p}
						</GlassButton>
					{/each}
				</div>
			</div>

			<!-- Tampilan Periode Berjalan -->
			{#if currentPeriod}
				<div class="rounded-xl bg-surface-container-low p-3">
					<p class="text-[11px] font-semibold text-on-surface-variant uppercase">
						Periode Berjalan Saat Ini
					</p>
					<p class="mt-0.5 text-sm font-bold text-primary" data-testid="current-period-display">
						{formatPeriod(currentPeriod)}
					</p>
				</div>
			{/if}

			{#if saveMessage}
				<div
					class="rounded-xl bg-income/10 p-3 text-xs font-semibold text-income"
					data-testid="salary-save-feedback"
				>
					{saveMessage}
				</div>
			{/if}
		</GlassCard>
	</section>
</div>
