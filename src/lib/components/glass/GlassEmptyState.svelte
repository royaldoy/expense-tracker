<script lang="ts">
	import type { Snippet } from 'svelte';
	import GlassButton from './GlassButton.svelte';

	interface Props {
		icon: string;
		title: string;
		description: string;
		actionLabel?: string;
		actionHref?: string;
		onaction?: () => void;
		extra?: Snippet;
	}

	let { icon, title, description, actionLabel, actionHref, onaction, extra }: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center px-6 py-12 text-center"
	data-testid="empty-state"
>
	<!-- Circular Frosted Icon Container -->
	<div
		class="mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-inner"
		style="
			background: var(--glass-card-bg);
			border: 1px solid var(--glass-card-border);
		"
	>
		<span class="material-symbols-outlined text-3xl text-on-surface-variant">
			{icon}
		</span>
	</div>

	<!-- Title -->
	<h3 class="mb-1 text-base font-bold tracking-tight text-on-surface">
		{title}
	</h3>

	<!-- Description -->
	<p class="mb-6 max-w-[260px] text-xs leading-relaxed text-on-surface-variant">
		{description}
	</p>

	<!-- Call to Action Button -->
	{#if actionLabel}
		{#if actionHref}
			<a href={actionHref}>
				<GlassButton variant="primary" size="md">
					<span class="material-symbols-outlined text-lg">add</span>
					<span>{actionLabel}</span>
				</GlassButton>
			</a>
		{:else if onaction}
			<GlassButton variant="primary" size="md" onclick={onaction}>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>{actionLabel}</span>
			</GlassButton>
		{/if}
	{/if}

	{#if extra}
		<div class="mt-4">
			{@render extra()}
		</div>
	{/if}
</div>
