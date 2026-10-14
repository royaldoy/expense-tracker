<script lang="ts">
	import { onMount } from 'svelte';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassSwitch from '$lib/components/glass/GlassSwitch.svelte';
	import type { NotificationSettings } from '$lib/domain/types';
	import { DEFAULT_NOTIFICATION_SETTINGS } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { notificationService } from '$lib/services/notificationService';

	let settings = $state<NotificationSettings>({ ...DEFAULT_NOTIFICATION_SETTINGS });
	let saveToast = $state<string | null>(null);

	async function loadSettings() {
		try {
			settings = await notificationService.getSettings();
		} catch (error) {
			console.error('Gagal memuat pengaturan notifikasi:', error);
		}
	}

	async function updateField<K extends keyof NotificationSettings>(
		key: K,
		value: NotificationSettings[K]
	) {
		settings[key] = value;
		try {
			await notificationService.updateSettings({ [key]: value });
			showToast(t('notifications.savedToast'));
		} catch (error) {
			console.error('Gagal menyimpan pengaturan:', error);
		}
	}

	function showToast(msg: string) {
		saveToast = msg;
		setTimeout(() => {
			if (saveToast === msg) {
				saveToast = null;
			}
		}, 3000);
	}

	onMount(() => {
		loadSettings();
	});
</script>

<svelte:head>
	<title>{t('notifications.settingsTitle')} - Money Tracker</title>
</svelte:head>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top Bar -->
	<header class="flex items-center gap-3 pt-2">
		<a
			href="/settings"
			class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container active:scale-95"
			aria-label="Kembali ke Pengaturan"
			data-testid="btn-back-settings"
		>
			<span class="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
		</a>
		<div>
			<h1
				class="text-xl font-bold tracking-tight text-on-surface"
				data-testid="settings-notifications-title"
			>
				{t('notifications.settingsTitle')}
			</h1>
			<p class="text-xs text-on-surface-variant">
				{t('notifications.settingsSubtitle')}
			</p>
		</div>
	</header>

	{#if saveToast}
		<div
			class="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary shadow-xs"
			data-testid="notification-saved-toast"
		>
			<span class="material-symbols-outlined text-base">check_circle</span>
			<span>{saveToast}</span>
		</div>
	{/if}

	<!-- Section: Sumber Notifikasi -->
	<section class="flex flex-col gap-3">
		<h2 class="px-1 text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			{t('notifications.sectionAlerts')}
		</h2>

		<GlassCard class="divide-surface-variant/40 divide-y p-0">
			<!-- 1. Tagihan Berulang -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3 pr-2">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary"
						style="background: rgba(0, 88, 188, 0.1);"
					>
						<span class="material-symbols-outlined text-xl">event_upcoming</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">
							{t('notifications.recurringDueTitle')}
						</p>
						<p class="text-xs text-on-surface-variant">
							{t('notifications.recurringDueDesc')}
						</p>
					</div>
				</div>

				<GlassSwitch
					checked={settings.recurringDueEnabled}
					onchange={(val) => updateField('recurringDueEnabled', val)}
					aria-label={t('notifications.recurringDueTitle')}
					data-testid="toggle-recurring-due"
				/>
			</div>

			<!-- 2. Peringatan Anggaran -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3 pr-2">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-amber-600"
						style="background: rgba(245, 158, 11, 0.1);"
					>
						<span class="material-symbols-outlined text-xl">warning</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">
							{t('notifications.budgetAlertTitle')}
						</p>
						<p class="text-xs text-on-surface-variant">
							{t('notifications.budgetAlertDesc')}
						</p>
					</div>
				</div>

				<GlassSwitch
					checked={settings.budgetAlertEnabled}
					onchange={(val) => updateField('budgetAlertEnabled', val)}
					aria-label={t('notifications.budgetAlertTitle')}
					data-testid="toggle-budget-alert"
				/>
			</div>

			<!-- 3. Pengingat Harian -->
			<div class="flex items-center justify-between p-4">
				<div class="flex items-center gap-3 pr-2">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-emerald-600"
						style="background: rgba(16, 185, 129, 0.1);"
					>
						<span class="material-symbols-outlined text-xl">notifications_active</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">
							{t('notifications.dailyReminderTitle')}
						</p>
						<p class="text-xs text-on-surface-variant">
							{t('notifications.dailyReminderDesc')}
						</p>
					</div>
				</div>

				<GlassSwitch
					checked={settings.dailyReminderEnabled}
					onchange={(val) => updateField('dailyReminderEnabled', val)}
					aria-label={t('notifications.dailyReminderTitle')}
					data-testid="toggle-daily-reminder"
				/>
			</div>

			<!-- 4. Jam Pengingat Harian -->
			{#if settings.dailyReminderEnabled}
				<div class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3 pr-2">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary"
							style="background: var(--glass-pill-bg);"
						>
							<span class="material-symbols-outlined text-xl">schedule</span>
						</div>
						<div>
							<p class="text-sm font-semibold text-on-surface">
								{t('notifications.dailyReminderTime')}
							</p>
							<p class="text-xs text-on-surface-variant">
								{t('notifications.dailyReminderTimeDesc')}
							</p>
						</div>
					</div>

					<input
						type="time"
						value={settings.dailyReminderTime}
						onchange={(e) => updateField('dailyReminderTime', e.currentTarget.value)}
						class="border-surface-variant rounded-xl border bg-surface px-3 py-1.5 text-sm font-bold text-on-surface shadow-xs outline-none focus:border-primary"
						data-testid="input-reminder-time"
					/>
				</div>
			{/if}
		</GlassCard>
	</section>

	<!-- Informasi Tambahan -->
	<div
		class="rounded-2xl p-4 text-xs leading-relaxed text-on-surface-variant"
		style="background: var(--glass-card-bg);"
	>
		<div class="flex items-start gap-2.5">
			<span class="material-symbols-outlined text-base text-primary">info</span>
			<p>
				Notifikasi beroperasi secara luring penuh di perangkat Anda. Di lingkungan aplikasi mobile
				Android, notifikasi akan dijadwalkan langsung ke baki notifikasi sistem operasi.
			</p>
		</div>
	</div>
</div>
