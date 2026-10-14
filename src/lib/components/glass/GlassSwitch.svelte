<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
		'aria-label'?: string;
		'data-testid'?: string;
		class?: string;
	}

	let {
		checked = $bindable(false),
		disabled = false,
		onchange,
		'aria-label': ariaLabel,
		'data-testid': dataTestId,
		class: className = ''
	}: Props = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={ariaLabel}
	data-testid={dataTestId}
	{disabled}
	onclick={toggle}
	class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 {checked
		? 'bg-primary'
		: 'bg-surface-container-highest'} {className}"
>
	<span
		class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-[var(--motion-ease-spring,cubic-bezier(0.34,1.35,0.64,1))] {checked
			? 'translate-x-5'
			: 'translate-x-0'}"
	></span>
</button>
