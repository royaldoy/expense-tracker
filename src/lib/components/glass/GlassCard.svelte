<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'regular' | 'opaque';
		glow?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		variant = 'regular',
		glow = true,
		class: className = '',
		onclick,
		children
	}: Props = $props();
</script>

{#if onclick}
	<button
		type="button"
		class="relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left transition-transform duration-150 select-none active:scale-[0.985] {className}"
		style="
			background: {variant === 'opaque' ? 'var(--glass-card-opaque-bg)' : 'var(--glass-card-bg)'};
			backdrop-filter: blur({variant === 'opaque'
			? 'var(--glass-card-opaque-blur)'
			: 'var(--glass-card-blur)'});
			-webkit-backdrop-filter: blur({variant === 'opaque'
			? 'var(--glass-card-opaque-blur)'
			: 'var(--glass-card-blur)'});
			border: 1px solid {variant === 'opaque'
			? 'var(--glass-card-opaque-border)'
			: 'var(--glass-card-border)'};
			box-shadow: {variant === 'opaque' ? 'var(--glass-card-opaque-shadow)' : 'var(--glass-card-shadow)'};
		"
		{onclick}
	>
		{#if glow && variant === 'regular'}
			<!-- Specular light edge catch di tepi atas -->
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px"
				style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);"
			></div>
		{/if}

		{#if children}
			{@render children()}
		{/if}
	</button>
{:else}
	<div
		class="relative overflow-hidden rounded-2xl transition-all duration-200 {className}"
		style="
			background: {variant === 'opaque' ? 'var(--glass-card-opaque-bg)' : 'var(--glass-card-bg)'};
			backdrop-filter: blur({variant === 'opaque'
			? 'var(--glass-card-opaque-blur)'
			: 'var(--glass-card-blur)'});
			-webkit-backdrop-filter: blur({variant === 'opaque'
			? 'var(--glass-card-opaque-blur)'
			: 'var(--glass-card-blur)'});
			border: 1px solid {variant === 'opaque'
			? 'var(--glass-card-opaque-border)'
			: 'var(--glass-card-border)'};
			box-shadow: {variant === 'opaque' ? 'var(--glass-card-opaque-shadow)' : 'var(--glass-card-shadow)'};
		"
	>
		{#if glow && variant === 'regular'}
			<!-- Specular light edge catch di tepi atas -->
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px"
				style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);"
			></div>
		{/if}

		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}
