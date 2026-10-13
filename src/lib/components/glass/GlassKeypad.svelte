<script lang="ts">
	interface Props {
		mode?: 'currency' | 'pin';
		value?: string;
		maxLength?: number;
		onkeypress?: (key: string) => void;
		ondelete?: () => void;
		onsubmit?: () => void;
		class?: string;
	}

	let {
		mode = 'currency',
		value = $bindable(''),
		maxLength = mode === 'pin' ? 6 : 12,
		onkeypress,
		ondelete,
		onsubmit,
		class: className = ''
	}: Props = $props();

	function handleKey(key: string) {
		if (key === 'backspace') {
			if (value.length > 0) {
				value = value.slice(0, -1);
				if (ondelete) ondelete();
			}
			return;
		}

		if (key === '') return;

		if (value.length + key.length <= maxLength) {
			// Cegah leading zeros pada mode currency
			if (mode === 'currency') {
				if (value === '0' || value === '') {
					if (key === '0' || key === '00' || key === '000') {
						value = '0';
					} else {
						value = key;
					}
				} else {
					value += key;
				}
			} else {
				value += key;
			}
			if (onkeypress) onkeypress(key);
			if (value.length === maxLength && onsubmit) {
				onsubmit();
			}
		}
	}
</script>

<div class="grid grid-cols-3 gap-2.5 p-2 select-none {className}">
	<!-- Baris 1: 1, 2, 3 -->
	{#each ['1', '2', '3'] as key (key)}
		<button
			type="button"
			class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-2xl font-bold text-on-surface tabular-nums transition-all duration-150 active:scale-95"
			style="
				background: var(--glass-keypad-bg);
				backdrop-filter: blur(var(--glass-keypad-blur));
				-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
				border: 1px solid var(--glass-keypad-border);
				box-shadow: var(--glass-keypad-shadow);
			"
			onclick={() => handleKey(key)}
			data-testid="keypad-{key}"
		>
			{key}
		</button>
	{/each}

	<!-- Baris 2: 4, 5, 6 -->
	{#each ['4', '5', '6'] as key (key)}
		<button
			type="button"
			class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-2xl font-bold text-on-surface tabular-nums transition-all duration-150 active:scale-95"
			style="
				background: var(--glass-keypad-bg);
				backdrop-filter: blur(var(--glass-keypad-blur));
				-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
				border: 1px solid var(--glass-keypad-border);
				box-shadow: var(--glass-keypad-shadow);
			"
			onclick={() => handleKey(key)}
			data-testid="keypad-{key}"
		>
			{key}
		</button>
	{/each}

	<!-- Baris 3: 7, 8, 9 -->
	{#each ['7', '8', '9'] as key (key)}
		<button
			type="button"
			class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-2xl font-bold text-on-surface tabular-nums transition-all duration-150 active:scale-95"
			style="
				background: var(--glass-keypad-bg);
				backdrop-filter: blur(var(--glass-keypad-blur));
				-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
				border: 1px solid var(--glass-keypad-border);
				box-shadow: var(--glass-keypad-shadow);
			"
			onclick={() => handleKey(key)}
			data-testid="keypad-{key}"
		>
			{key}
		</button>
	{/each}

	<!-- Baris 4: (000 atau blank), 0, backspace -->
	{#if mode === 'currency'}
		<button
			type="button"
			class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-lg font-bold text-on-surface tabular-nums transition-all duration-150 active:scale-95"
			style="
				background: var(--glass-keypad-bg);
				backdrop-filter: blur(var(--glass-keypad-blur));
				-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
				border: 1px solid var(--glass-keypad-border);
				box-shadow: var(--glass-keypad-shadow);
			"
			onclick={() => handleKey('000')}
			data-testid="keypad-000"
		>
			000
		</button>
	{:else}
		<div class="flex h-14 items-center justify-center"></div>
	{/if}

	<button
		type="button"
		class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-2xl font-bold text-on-surface tabular-nums transition-all duration-150 active:scale-95"
		style="
			background: var(--glass-keypad-bg);
			backdrop-filter: blur(var(--glass-keypad-blur));
			-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
			border: 1px solid var(--glass-keypad-border);
			box-shadow: var(--glass-keypad-shadow);
		"
		onclick={() => handleKey('0')}
		data-testid="keypad-0"
	>
		0
	</button>

	<button
		type="button"
		class="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-on-surface transition-all duration-150 active:scale-95"
		style="
			background: var(--glass-keypad-bg);
			backdrop-filter: blur(var(--glass-keypad-blur));
			-webkit-backdrop-filter: blur(var(--glass-keypad-blur));
			border: 1px solid var(--glass-keypad-border);
			box-shadow: var(--glass-keypad-shadow);
		"
		onclick={() => handleKey('backspace')}
		data-testid="keypad-backspace"
		aria-label="Hapus digit"
	>
		<span class="material-symbols-outlined text-2xl">backspace</span>
	</button>
</div>
