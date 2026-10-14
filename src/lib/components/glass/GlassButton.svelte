<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type GlassButtonVariant =
		'primary' | 'secondary' | 'icon' | 'destructive' | 'text' | 'danger' | 'ghost';

	export type GlassButtonSize = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: GlassButtonVariant;
		size?: GlassButtonSize;
		loading?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		type = 'button',
		class: className = '',
		style: customStyle = '',
		onclick,
		children,
		...restProps
	}: Props = $props();

	// Canonical resolution (aliasing backward-compatible variants)
	const resolvedVariant = $derived.by(() => {
		if (variant === 'danger') return 'destructive';
		if (variant === 'ghost') return 'text';
		return variant;
	});

	// Standard sizes for text/content buttons
	const standardSizeClasses: Record<GlassButtonSize, string> = {
		sm: 'px-3 py-1.5 text-xs font-semibold rounded-xl min-h-[32px]',
		md: 'px-5 py-2.5 text-sm font-semibold rounded-2xl min-h-[44px]',
		lg: 'px-6 py-3.5 text-base font-bold rounded-2xl min-h-[52px]'
	};

	// Symmetrical circular sizes for icon variant
	const iconSizeClasses: Record<GlassButtonSize, string> = {
		sm: 'h-8 w-8 min-h-[32px] min-w-[32px] p-0 rounded-full text-sm',
		md: 'h-10 w-10 min-h-[40px] min-w-[40px] p-0 rounded-full text-base',
		lg: 'h-12 w-12 min-h-[48px] min-w-[48px] p-0 rounded-full text-lg'
	};

	const variantStyles: Record<string, string> = {
		primary:
			'background: linear-gradient(180deg, var(--color-primary-container, #0070eb) 0%, var(--color-primary, #0058bc) 100%); color: var(--color-on-primary, #ffffff); border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 14px -2px rgba(0, 88, 188, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.45);',
		secondary:
			'background: var(--glass-btn-secondary-bg); border: 1px solid var(--glass-btn-secondary-border); color: var(--color-on-surface); box-shadow: var(--glass-btn-secondary-shadow);',
		icon: 'background: var(--glass-btn-secondary-bg); border: 1px solid var(--glass-btn-secondary-border); color: var(--color-on-surface); box-shadow: var(--glass-btn-secondary-shadow);',
		destructive:
			'background: linear-gradient(180deg, #d32f2f 0%, var(--color-expense, #bc000a) 100%); color: var(--color-on-expense, #ffffff); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px -2px rgba(188, 0, 10, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35);',
		text: 'background: transparent; border: 1px solid transparent; color: var(--color-on-surface-variant); box-shadow: none;'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	aria-busy={loading ? 'true' : undefined}
	{onclick}
	{...restProps}
	class="inline-flex cursor-pointer items-center justify-center gap-2 transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 ease-[var(--motion-ease-spring,cubic-bezier(0.34,1.35,0.64,1))] select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-hidden active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 {resolvedVariant ===
	'icon'
		? iconSizeClasses[size]
		: standardSizeClasses[size]} {resolvedVariant === 'text'
		? 'hover:bg-surface-container/50 hover:text-on-surface'
		: resolvedVariant === 'icon' || resolvedVariant === 'secondary'
			? 'hover:bg-surface-container/40'
			: 'hover:brightness-105'} {loading ? 'pointer-events-none' : ''} {className}"
	style="{variantStyles[resolvedVariant]} {customStyle}"
>
	{#if loading}
		<svg
			class="h-4 w-4 shrink-0 animate-spin text-current"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
