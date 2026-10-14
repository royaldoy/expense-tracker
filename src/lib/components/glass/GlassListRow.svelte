<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		leadingIcon?: string;
		leadingIconBg?: string;
		trailingValue?: string;
		trailingValueColor?: 'income' | 'expense' | 'default';
		chevron?: boolean;
		showDivider?: boolean;
		onclick?: () => void;
		leadingSnippet?: Snippet;
		trailingSnippet?: Snippet;
		class?: string;
	}

	let {
		title,
		subtitle,
		leadingIcon,
		leadingIconBg = 'var(--color-primary-container)',
		trailingValue,
		trailingValueColor = 'default',
		chevron = false,
		showDivider = true,
		onclick,
		leadingSnippet,
		trailingSnippet,
		class: className = ''
	}: Props = $props();
</script>

{#if onclick}
	<button
		type="button"
		class="relative flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container/30 active:bg-surface-container/60 {className}"
		{onclick}
	>
		<!-- Leading Section -->
		<div class="flex items-center gap-3 overflow-hidden">
			{#if leadingSnippet}
				{@render leadingSnippet()}
			{:else if leadingIcon}
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {leadingIconBg};"
				>
					<span class="material-symbols-outlined text-xl">{leadingIcon}</span>
				</div>
			{/if}

			<div class="min-w-0">
				<p class="truncate text-sm font-semibold text-on-surface">
					{title}
				</p>
				{#if subtitle}
					<p class="truncate text-xs text-on-surface-variant">
						{subtitle}
					</p>
				{/if}
			</div>
		</div>

		<!-- Trailing Section -->
		<div class="flex shrink-0 items-center gap-2">
			{#if trailingSnippet}
				{@render trailingSnippet()}
			{:else if trailingValue}
				<span
					class="text-sm font-bold tabular-nums"
					style="color: {trailingValueColor === 'income'
						? 'var(--color-income)'
						: trailingValueColor === 'expense'
							? 'var(--color-expense)'
							: 'var(--color-on-surface)'};"
				>
					{trailingValue}
				</span>
			{/if}

			{#if chevron}
				<span class="material-symbols-outlined text-lg text-outline">chevron_right</span>
			{/if}
		</div>

		{#if showDivider}
			<div
				class="pointer-events-none absolute inset-x-4 bottom-0 h-px"
				style="background: var(--color-surface-container-highest);"
			></div>
		{/if}
	</button>
{:else}
	<div
		class="relative flex items-center justify-between gap-3 px-4 py-3.5 transition-colors {className}"
	>
		<!-- Leading Section -->
		<div class="flex items-center gap-3 overflow-hidden">
			{#if leadingSnippet}
				{@render leadingSnippet()}
			{:else if leadingIcon}
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
					style="background: {leadingIconBg};"
				>
					<span class="material-symbols-outlined text-xl">{leadingIcon}</span>
				</div>
			{/if}

			<div class="min-w-0">
				<p class="truncate text-sm font-semibold text-on-surface">
					{title}
				</p>
				{#if subtitle}
					<p class="truncate text-xs text-on-surface-variant">
						{subtitle}
					</p>
				{/if}
			</div>
		</div>

		<!-- Trailing Section -->
		<div class="flex shrink-0 items-center gap-2">
			{#if trailingSnippet}
				{@render trailingSnippet()}
			{:else if trailingValue}
				<span
					class="text-sm font-bold tabular-nums"
					style="color: {trailingValueColor === 'income'
						? 'var(--color-income)'
						: trailingValueColor === 'expense'
							? 'var(--color-expense)'
							: 'var(--color-on-surface)'};"
				>
					{trailingValue}
				</span>
			{/if}

			{#if chevron}
				<span class="material-symbols-outlined text-lg text-outline">chevron_right</span>
			{/if}
		</div>

		{#if showDivider}
			<div
				class="pointer-events-none absolute inset-x-4 bottom-0 h-px"
				style="background: var(--color-surface-container-highest);"
			></div>
		{/if}
	</div>
{/if}
