<script lang="ts">
	import { onMount } from 'svelte';
	import { formatRupiah } from '$lib/domain/money';
	import { isMotionActive } from '$lib/utils/motion';

	export interface DonutItem {
		id: string;
		name: string;
		amount: number;
		percentage: number;
		color: string;
		icon?: string;
	}

	interface Props {
		items: DonutItem[];
		totalAmount: number;
		centerLabel?: string;
		size?: number;
		selectedId?: string | null;
		onselect?: (id: string | null) => void;
	}

	let {
		items = [],
		totalAmount = 0,
		centerLabel = 'Total',
		size = 200,
		selectedId = $bindable(null),
		onselect
	}: Props = $props();

	// SVG circle geometry: r = 58, cx = 80, cy = 80
	const RADIUS = 58;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~364.42

	// Hitung offset segmen bertingkat
	let segments = $derived.by(() => {
		if (items.length === 0 || totalAmount <= 0) {
			return [];
		}

		let currentAccumulated = 0;
		return items.map((item) => {
			const itemRatio = Math.max(0, item.amount / totalAmount);
			const strokeLength = itemRatio * CIRCUMFERENCE;
			// Stroke dasharray: [panjang segmen, sisa keliling]
			const dashArray = `${strokeLength} ${CIRCUMFERENCE - strokeLength}`;
			// Stroke dashoffset: diputar mundur sesuai posisi akumulasi
			const dashOffset = -currentAccumulated * CIRCUMFERENCE;

			currentAccumulated += itemRatio;

			return {
				...item,
				dashArray,
				dashOffset
			};
		});
	});

	let activeItem = $derived(selectedId ? items.find((it) => it.id === selectedId) : null);

	let revealProgress = $state(1);

	onMount(() => {
		if (isMotionActive()) {
			revealProgress = 0;
			const timer = setTimeout(() => {
				revealProgress = 1;
			}, 30);
			return () => clearTimeout(timer);
		}
	});

	function handleSegmentClick(id: string) {
		if (selectedId === id) {
			selectedId = null;
			onselect?.(null);
		} else {
			selectedId = id;
			onselect?.(id);
		}
	}
</script>

<div
	class="relative flex flex-col items-center justify-center select-none"
	style="width: {size}px; height: {size}px;"
>
	<svg
		viewBox="0 0 160 160"
		class="h-full w-full -rotate-90 transform overflow-visible"
		role="img"
		aria-label="Distribusi Grafik Donut"
	>
		<!-- Background Track Ring -->
		<circle
			cx="80"
			cy="80"
			r={RADIUS}
			fill="none"
			stroke="currentColor"
			stroke-width="18"
			class="text-outline-variant/15 dark:text-outline-variant/25"
		/>

		<!-- Data Segments -->
		{#if segments.length > 0}
			{#each segments as seg (seg.id)}
				<circle
					cx="80"
					cy="80"
					r={RADIUS}
					fill="none"
					stroke={seg.color}
					stroke-width={selectedId === seg.id ? 22 : 18}
					stroke-dasharray={seg.dashArray}
					stroke-dashoffset={seg.dashOffset + (1 - revealProgress) * CIRCUMFERENCE}
					stroke-linecap="butt"
					class="cursor-pointer hover:opacity-90"
					style="opacity: {selectedId && selectedId !== seg.id
						? 0.4
						: 1}; transition: stroke-dashoffset 500ms var(--motion-ease-standard, cubic-bezier(0.2, 0, 0, 1)), opacity 200ms ease; filter: {selectedId ===
					seg.id
						? 'drop-shadow(0 0 6px ' + seg.color + ')'
						: 'none'};"
					role="button"
					tabindex="0"
					aria-label="{seg.name} {seg.percentage}%"
					onclick={() => handleSegmentClick(seg.id)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSegmentClick(seg.id)}
				/>
			{/each}
		{/if}
	</svg>

	<!-- Center Hole Content -->
	<div
		class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
	>
		<span class="text-[11px] font-medium tracking-wider text-on-surface-variant uppercase">
			{activeItem ? activeItem.name : centerLabel}
		</span>
		<span class="text-sm font-bold tracking-tight text-on-surface tabular-nums">
			{formatRupiah(activeItem ? activeItem.amount : totalAmount)}
		</span>
		{#if activeItem}
			<span class="mt-0.5 text-[10px] font-semibold text-primary">
				{activeItem.percentage}%
			</span>
		{/if}
	</div>
</div>
