<script lang="ts">
	export interface HeaderAction {
		icon: string;
		label: string;
		onclick?: () => void;
		href?: string;
		badgeCount?: number;
		activeIndicator?: boolean;
		testId?: string;
	}

	interface Props {
		title: string;
		actions?: HeaderAction[];
		class?: string;
	}

	let { title, actions = [], class: className = '' }: Props = $props();

	// Aturan: maksimal dua tombol ikon
	let visibleActions = $derived(actions.slice(0, 2));
</script>

<header class="flex items-center justify-between pt-2 select-none {className}">
	<!-- Judul Besar Tanpa Subjudul -->
	<h1 class="text-2xl font-bold tracking-tight text-on-surface">
		{title}
	</h1>

	<!-- Maksimal 2 Tombol Ikon -->
	{#if visibleActions.length > 0}
		<div class="flex items-center gap-2">
			{#each visibleActions as action (action.label)}
				{#if action.href}
					<a
						href={action.href}
						class="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant shadow-xs transition-transform hover:bg-surface-container active:scale-90"
						style="background: var(--glass-pill-bg); border: 1px solid var(--glass-pill-border);"
						aria-label={action.label}
						data-testid={action.testId}
					>
						<span class="material-symbols-outlined text-xl">{action.icon}</span>

						{#if action.badgeCount && action.badgeCount > 0}
							<span
								class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"
								data-testid="notifications-unread-badge"
							>
								<span
									class="bg-error absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
								></span>
								<span class="bg-error relative inline-flex h-2.5 w-2.5 rounded-full"></span>
							</span>
						{/if}

						{#if action.activeIndicator}
							<span
								class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-surface"
								style="background: var(--color-primary);"
								data-testid="filter-active-indicator"
							></span>
						{/if}
					</a>
				{:else}
					<button
						type="button"
						class="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant shadow-xs transition-transform hover:bg-surface-container active:scale-90"
						style="background: var(--glass-pill-bg); border: 1px solid var(--glass-pill-border);"
						onclick={action.onclick}
						aria-label={action.label}
						data-testid={action.testId}
					>
						<span class="material-symbols-outlined text-xl">{action.icon}</span>

						{#if action.badgeCount && action.badgeCount > 0}
							<span
								class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"
								data-testid="notifications-unread-badge"
							>
								<span
									class="bg-error absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
								></span>
								<span class="bg-error relative inline-flex h-2.5 w-2.5 rounded-full"></span>
							</span>
						{/if}

						{#if action.activeIndicator}
							<span
								class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-surface"
								style="background: var(--color-primary);"
								data-testid="filter-active-indicator"
							></span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</header>
