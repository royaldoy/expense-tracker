<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		width?: string;
		height?: string;
		rounded?: string;
		delayMs?: number;
		class?: string;
	}

	let {
		width = 'w-full',
		height = 'h-4',
		rounded = 'rounded-xl',
		delayMs = 150,
		class: className = ''
	}: Props = $props();

	let isVisible = $state(false);

	onMount(() => {
		if (delayMs <= 0) {
			isVisible = true;
			return;
		}
		const timer = setTimeout(() => {
			isVisible = true;
		}, delayMs);
		return () => clearTimeout(timer);
	});
</script>

{#if isVisible}
	<div
		class="animate-pulse select-none {width} {height} {rounded} {className}"
		style="
			background: var(--color-surface-container-high);
			border: 1px solid var(--color-outline-variant);
		"
		aria-hidden="true"
	></div>
{/if}
