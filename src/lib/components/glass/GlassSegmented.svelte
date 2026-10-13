<script lang="ts">
	interface Option {
		value: string;
		label: string;
		icon?: string;
	}

	interface Props {
		options: Option[];
		value: string;
		class?: string;
		onchange?: (val: string) => void;
	}

	let { options, value = $bindable(), class: className = '', onchange }: Props = $props();

	let activeIndex = $derived(
		Math.max(
			0,
			options.findIndex((opt) => opt.value === value)
		)
	);

	function select(val: string) {
		value = val;
		if (onchange) {
			onchange(val);
		}
	}
</script>

<div
	class="relative inline-flex w-full items-center rounded-full p-1 transition-all select-none {className}"
	style="
		background: var(--glass-pill-bg);
		backdrop-filter: blur(var(--glass-pill-blur));
		-webkit-backdrop-filter: blur(var(--glass-pill-blur));
		border: 1px solid var(--glass-pill-border);
		box-shadow: var(--glass-pill-shadow);
	"
	role="tablist"
>
	<!-- Sliding Pill Thumb Beranimasi & Kontras Tinggi -->
	{#if options.length > 0}
		<div
			class="pointer-events-none absolute top-1 bottom-1 rounded-full transition-transform duration-200 ease-out"
			style="
				left: 4px;
				width: calc((100% - 8px) / {options.length});
				transform: translateX({activeIndex * 100}%);
				background: var(--color-surface-container-lowest);
				border: 1px solid var(--color-outline-variant);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
			"
		></div>
	{/if}

	<!-- Tab Buttons -->
	{#each options as opt (opt.value)}
		{@const isActive = value === opt.value}
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			onclick={() => select(opt.value)}
			class="relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors duration-150 select-none {isActive
				? 'font-bold text-on-surface'
				: 'font-medium text-on-surface-variant hover:text-on-surface'}"
		>
			{#if opt.icon}
				<span class="material-symbols-outlined text-base">{opt.icon}</span>
			{/if}
			<span class="truncate">{opt.label}</span>
		</button>
	{/each}
</div>
