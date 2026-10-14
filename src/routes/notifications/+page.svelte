<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { format, isToday } from 'date-fns';
	import GlassCard from '$lib/components/glass/GlassCard.svelte';
	import GlassButton from '$lib/components/glass/GlassButton.svelte';
	import GlassEmptyState from '$lib/components/glass/GlassEmptyState.svelte';
	import type { Notification, NotificationType } from '$lib/domain/types';
	import t from '$lib/i18n';
	import { notificationService } from '$lib/services/notificationService';

	let notifications = $state<Notification[]>([]);
	let activeFilter = $state<'all' | 'unread'>('all');
	let loading = $state(true);

	async function loadNotifications() {
		loading = true;
		try {
			notifications = await notificationService.getNotifications();
		} catch (error) {
			console.error('Gagal memuat notifikasi:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadNotifications();
	});

	let unreadList = $derived(notifications.filter((n) => n.readAt === null));
	let filteredList = $derived(activeFilter === 'unread' ? unreadList : notifications);

	let todayList = $derived(filteredList.filter((n) => isToday(new Date(n.createdAt))));
	let previousList = $derived(filteredList.filter((n) => !isToday(new Date(n.createdAt))));

	async function handleMarkAllAsRead() {
		await notificationService.markAllAsRead();
		await loadNotifications();
	}

	async function handleMarkAsRead(notif: Notification) {
		if (notif.readAt === null) {
			await notificationService.markAsRead(notif.id);
			await loadNotifications();
		}
	}

	async function handleDelete(id: string) {
		await notificationService.deleteNotification(id);
		await loadNotifications();
	}

	function handleAction(notif: Notification) {
		handleMarkAsRead(notif);
		if (notif.type === 'budget_alert') {
			goto('/budgets');
		} else if (notif.type === 'recurring_due') {
			goto('/recurring');
		} else if (notif.type === 'daily_reminder') {
			goto('/transactions/new');
		}
	}

	function getActionLabel(type: NotificationType): string {
		switch (type) {
			case 'budget_alert':
				return t('notifications.viewBudget');
			case 'recurring_due':
				return t('notifications.viewRecurring');
			case 'daily_reminder':
				return t('notifications.viewTransaction');
			default:
				return 'Lihat';
		}
	}

	function getIconConfig(type: NotificationType): { icon: string; bg: string; text: string } {
		switch (type) {
			case 'budget_alert':
				return { icon: 'warning', bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706' };
			case 'recurring_due':
				return {
					icon: 'event_upcoming',
					bg: 'rgba(0, 88, 188, 0.15)',
					text: 'var(--color-primary)'
				};
			case 'daily_reminder':
				return { icon: 'notifications_active', bg: 'rgba(16, 185, 129, 0.15)', text: '#059669' };
			default:
				return { icon: 'info', bg: 'rgba(99, 102, 241, 0.15)', text: '#4f46e5' };
		}
	}

	function formatTimestamp(timestamp: number): string {
		const d = new Date(timestamp);
		if (isToday(d)) {
			return `${format(d, 'HH:mm')} WIB`;
		}
		return format(d, 'd MMM, HH:mm');
	}
</script>

<svelte:head>
	<title>{t('notifications.title')} - Money Tracker</title>
</svelte:head>

<div class="pt-safe flex flex-col gap-5 px-4 pb-28">
	<!-- Top Bar -->
	<header class="flex items-center justify-between pt-2">
		<div class="flex items-center gap-2">
			<GlassButton
				variant="icon"
				size="sm"
				onclick={() => history.back()}
				aria-label="Kembali"
				data-testid="btn-back"
			>
				<span class="material-symbols-outlined text-xl">arrow_back</span>
			</GlassButton>
			<div>
				<h1 class="text-xl font-bold text-on-surface" data-testid="notifications-title">
					{t('notifications.title')}
				</h1>
				<p class="text-xs text-on-surface-variant">
					{t('notifications.subtitle')}
				</p>
			</div>
		</div>

		<a
			href="/settings/notifications"
			class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
			aria-label={t('notifications.settingsTitle')}
			data-testid="btn-settings-notifications"
		>
			<span class="material-symbols-outlined text-xl">tune</span>
		</a>
	</header>

	<!-- Filter Chips & Actions -->
	<section class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<GlassButton
				variant={activeFilter === 'all' ? 'primary' : 'secondary'}
				size="sm"
				class="rounded-full px-4 py-1.5"
				onclick={() => (activeFilter = 'all')}
				data-testid="filter-all"
			>
				<span>{t('notifications.filterAll')}</span>
				<span
					class="py-0.2 rounded-full px-1.5 text-[10px] font-bold {activeFilter === 'all'
						? 'bg-white/20 text-white'
						: 'bg-surface-container text-on-surface-variant'}"
				>
					{notifications.length}
				</span>
			</GlassButton>

			<GlassButton
				variant={activeFilter === 'unread' ? 'primary' : 'secondary'}
				size="sm"
				class="rounded-full px-4 py-1.5"
				onclick={() => (activeFilter = 'unread')}
				data-testid="filter-unread"
			>
				<span>{t('notifications.filterUnread')}</span>
				<span
					class="py-0.2 rounded-full px-1.5 text-[10px] font-bold {activeFilter === 'unread'
						? 'bg-white/20 text-white'
						: 'bg-primary/10 text-primary'}"
					data-testid="unread-count-pill"
				>
					{unreadList.length}
				</span>
			</GlassButton>
		</div>

		{#if unreadList.length > 0}
			<GlassButton
				variant="secondary"
				size="sm"
				class="rounded-full text-primary"
				onclick={handleMarkAllAsRead}
				data-testid="btn-mark-all-read"
			>
				<span class="material-symbols-outlined text-base">done_all</span>
				<span class="hidden sm:inline">{t('notifications.markAllAsRead')}</span>
			</GlassButton>
		{/if}
	</section>

	<!-- Content Feed -->
	{#if loading}
		<div class="flex items-center justify-center py-16">
			<span class="text-sm text-on-surface-variant">Memuat notifikasi...</span>
		</div>
	{:else if filteredList.length === 0}
		<GlassCard class="p-8">
			<GlassEmptyState
				icon="notifications_off"
				title={t('notifications.emptyTitle')}
				description={t('notifications.emptyDesc')}
			/>
		</GlassCard>
	{:else}
		<div class="flex flex-col gap-6" data-testid="notifications-list">
			<!-- Group: Hari Ini -->
			{#if todayList.length > 0}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between px-1">
						<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
							{t('notifications.today')}
						</h2>
						{#if todayList.some((n) => n.readAt === null)}
							<span class="text-[11px] font-semibold text-primary">
								{todayList.filter((n) => n.readAt === null).length} Baru
							</span>
						{/if}
					</div>

					<div class="flex flex-col gap-2.5">
						{#each todayList as notif (notif.id)}
							{@const conf = getIconConfig(notif.type)}
							<GlassCard
								class="p-4 transition-all hover:shadow-md {notif.readAt === null
									? 'border-primary/20'
									: 'opacity-85'}"
							>
								<div class="flex items-start gap-3.5">
									<!-- Icon Glass Badge -->
									<div
										class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
										style="background: {conf.bg}; color: {conf.text};"
									>
										<span class="material-symbols-outlined text-2xl">{conf.icon}</span>
										{#if notif.readAt === null}
											<span
												class="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-surface"
												data-testid="unread-indicator"
											></span>
										{/if}
									</div>

									<!-- Text Content -->
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-baseline justify-between gap-2">
											<h3 class="truncate text-sm font-bold text-on-surface">
												{notif.title}
											</h3>
											<time class="shrink-0 text-[11px] text-on-surface-variant">
												{formatTimestamp(notif.createdAt)}
											</time>
										</div>
										<p class="mb-3 text-xs leading-relaxed text-on-surface-variant">
											{notif.message}
										</p>

										<div class="flex items-center justify-between">
											<GlassButton
												variant="secondary"
												size="sm"
												class="min-h-[28px] rounded-full px-3 py-0.5 text-primary"
												onclick={() => handleAction(notif)}
												data-testid="btn-action-{notif.id}"
											>
												<span>{getActionLabel(notif.type)}</span>
												<span class="material-symbols-outlined text-sm">arrow_forward</span>
											</GlassButton>

											<div class="flex items-center gap-1">
												{#if notif.readAt === null}
													<GlassButton
														variant="icon"
														size="sm"
														class="h-7 min-h-[28px] w-7 min-w-[28px]"
														onclick={() => handleMarkAsRead(notif)}
														title="Tandai dibaca"
													>
														<span class="material-symbols-outlined text-base">check</span>
													</GlassButton>
												{/if}
												<GlassButton
													variant="icon"
													size="sm"
													class="hover:text-error h-7 min-h-[28px] w-7 min-w-[28px] text-on-surface-variant"
													onclick={() => handleDelete(notif.id)}
													title="Hapus"
												>
													<span class="material-symbols-outlined text-base">delete</span>
												</GlassButton>
											</div>
										</div>
									</div>
								</div>
							</GlassCard>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Group: Sebelumnya -->
			{#if previousList.length > 0}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between px-1">
						<h2 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
							{t('notifications.previous')}
						</h2>
					</div>

					<div class="flex flex-col gap-2.5">
						{#each previousList as notif (notif.id)}
							{@const conf = getIconConfig(notif.type)}
							<GlassCard
								class="p-4 transition-all hover:shadow-md {notif.readAt === null
									? 'border-primary/20'
									: 'opacity-85'}"
							>
								<div class="flex items-start gap-3.5">
									<div
										class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
										style="background: {conf.bg}; color: {conf.text};"
									>
										<span class="material-symbols-outlined text-2xl">{conf.icon}</span>
										{#if notif.readAt === null}
											<span
												class="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-surface"
												data-testid="unread-indicator"
											></span>
										{/if}
									</div>

									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-baseline justify-between gap-2">
											<h3 class="truncate text-sm font-bold text-on-surface">
												{notif.title}
											</h3>
											<time class="shrink-0 text-[11px] text-on-surface-variant">
												{formatTimestamp(notif.createdAt)}
											</time>
										</div>
										<p class="mb-3 text-xs leading-relaxed text-on-surface-variant">
											{notif.message}
										</p>

										<div class="flex items-center justify-between">
											<GlassButton
												variant="secondary"
												size="sm"
												class="min-h-[28px] rounded-full px-3 py-0.5 text-primary"
												onclick={() => handleAction(notif)}
												data-testid="btn-action-{notif.id}"
											>
												<span>{getActionLabel(notif.type)}</span>
												<span class="material-symbols-outlined text-sm">arrow_forward</span>
											</GlassButton>

											<div class="flex items-center gap-1">
												{#if notif.readAt === null}
													<GlassButton
														variant="icon"
														size="sm"
														class="h-7 min-h-[28px] w-7 min-w-[28px]"
														onclick={() => handleMarkAsRead(notif)}
														title="Tandai dibaca"
													>
														<span class="material-symbols-outlined text-base">check</span>
													</GlassButton>
												{/if}
												<GlassButton
													variant="icon"
													size="sm"
													class="hover:text-error h-7 min-h-[28px] w-7 min-w-[28px] text-on-surface-variant"
													onclick={() => handleDelete(notif.id)}
													title="Hapus"
												>
													<span class="material-symbols-outlined text-base">delete</span>
												</GlassButton>
											</div>
										</div>
									</div>
								</div>
							</GlassCard>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Footer Shortcut: Pengaturan Notifikasi -->
	<a
		href="/settings/notifications"
		class="mt-2 flex items-center justify-between rounded-2xl p-4 transition-all hover:shadow-xs active:scale-98"
		style="background: var(--glass-card-bg); border: 1px solid var(--glass-card-border);"
	>
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full text-primary"
				style="background: var(--glass-pill-bg);"
			>
				<span class="material-symbols-outlined text-xl">tune</span>
			</div>
			<div>
				<p class="text-sm font-semibold text-on-surface">
					{t('notifications.settingsShortcut')}
				</p>
				<p class="text-xs text-on-surface-variant">
					Sesuaikan pengingat harian, tagihan, dan batas anggaran
				</p>
			</div>
		</div>
		<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
	</a>
</div>
