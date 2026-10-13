<script lang="ts">
	import { onMount } from 'svelte';
	import { formatRupiah } from '$lib/domain/money';
	import { isMotionActive } from '$lib/utils/motion';

	export interface BarPoint {
		date: string;
		income: number;
		expense: number;
		label?: string;
	}

	interface Props {
		data: BarPoint[];
		height?: number;
		class?: string;
	}

	let { data = [], height = 150, class: className = '' }: Props = $props();

	let activeIndex = $state<number | null>(null);

	const VIEW_WIDTH = 320;
	const VIEW_HEIGHT = 120;
	const PADDING_BOTTOM = 20;
	const PADDING_TOP = 10;
	const PLOT_HEIGHT = VIEW_HEIGHT - PADDING_BOTTOM - PADDING_TOP;

	let maxVal = $derived.by(() => {
		if (data.length === 0) return 100000;
		let max = 0;
		for (const d of data) {
			if (d.income > max) max = d.income;
			if (d.expense > max) max = d.expense;
		}
		return max > 0 ? max : 100000;
	});

	let barWidth = $derived.by(() => {
		if (data.length === 0) return 8;
		const available = VIEW_WIDTH / data.length;
		return Math.min(12, Math.max(3, available * 0.35));
	});

	let activePoint = $derived(activeIndex !== null && data[activeIndex] ? data[activeIndex] : null);

	let clipHeight = $state(VIEW_HEIGHT);

	onMount(() => {
		if (isMotionActive()) {
			clipHeight = 0;
			const timer = setTimeout(() => {
				clipHeight = VIEW_HEIGHT;
			}, 30);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="relative w-full select-none {className}" style="height: {height}px;">
	{#if data.length === 0}
		<div class="flex h-full items-center justify-center text-xs text-on-surface-variant">
			Belum ada data arus kas
		</div>
	{:else}
		<svg
			viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
			class="h-full w-full overflow-visible"
			preserveAspectRatio="none"
			role="img"
			aria-label="Grafik Batang Arus Kas"
		>
			<defs>
				<clipPath id="cashflow-bar-reveal">
					<rect
						x="0"
						y={VIEW_HEIGHT - clipHeight}
						width={VIEW_WIDTH}
						height={clipHeight}
						style="transition: height 450ms var(--motion-ease-decelerate, cubic-bezier(0, 0, 0.2, 1)), y 450ms var(--motion-ease-decelerate, cubic-bezier(0, 0, 0.2, 1));"
					/>
				</clipPath>
			</defs>

			<!-- Horizontal Gridlines -->
			<line
				x1="0"
				y1={PADDING_TOP}
				x2={VIEW_WIDTH}
				y2={PADDING_TOP}
				stroke="currentColor"
				stroke-dasharray="3 3"
				class="text-outline-variant/15"
			/>
			<line
				x1="0"
				y1={PADDING_TOP + PLOT_HEIGHT / 2}
				x2={VIEW_WIDTH}
				y2={PADDING_TOP + PLOT_HEIGHT / 2}
				stroke="currentColor"
				stroke-dasharray="3 3"
				class="text-outline-variant/15"
			/>
			<line
				x1="0"
				y1={PADDING_TOP + PLOT_HEIGHT}
				x2={VIEW_WIDTH}
				y2={PADDING_TOP + PLOT_HEIGHT}
				stroke="currentColor"
				class="text-outline-variant/30"
			/>

			<!-- Bars per Point -->
			{#each data as pt, idx (pt.date ?? idx)}
				{@const slotWidth = VIEW_WIDTH / data.length}
				{@const centerX = slotWidth * idx + slotWidth / 2}
				{@const incH = Math.max(2, (pt.income / maxVal) * PLOT_HEIGHT)}
				{@const expH = Math.max(2, (pt.expense / maxVal) * PLOT_HEIGHT)}
				{@const incY = PADDING_TOP + PLOT_HEIGHT - incH}
				{@const expY = PADDING_TOP + PLOT_HEIGHT - expH}

				<g clip-path="url(#cashflow-bar-reveal)">
					<!-- Income Bar (Green) -->
					{#if pt.income > 0}
						<rect
							x={centerX - barWidth - 1}
							y={incY}
							width={barWidth}
							height={incH}
							rx="2"
							fill="var(--color-income, #006E28)"
							style="opacity: {activeIndex === null || activeIndex === idx ? 0.9 : 0.35};"
						/>
					{/if}

					<!-- Expense Bar (Red) -->
					{#if pt.expense > 0}
						<rect
							x={centerX + 1}
							y={expY}
							width={barWidth}
							height={expH}
							rx="2"
							fill="var(--color-expense, #BC000A)"
							style="opacity: {activeIndex === null || activeIndex === idx ? 0.9 : 0.35};"
						/>
					{/if}
				</g>

				<!-- Transparent Hitbox for Tap/Hover with a11y -->
				<rect
					x={slotWidth * idx}
					y="0"
					width={slotWidth}
					height={VIEW_HEIGHT}
					fill="transparent"
					class="cursor-pointer"
					role="button"
					tabindex="0"
					aria-label="{pt.date}: Masuk {formatRupiah(pt.income)}, Keluar {formatRupiah(pt.expense)}"
					onmouseenter={() => (activeIndex = idx)}
					onclick={() => (activeIndex = idx)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (activeIndex = idx)}
				/>
			{/each}
		</svg>

		<!-- Tooltip Header Overlay -->
		{#if activePoint}
			<div
				class="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-surface-container-highest/90 px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md"
			>
				<span class="text-on-surface-variant">{activePoint.date}</span>
				<span class="font-semibold text-income">+{formatRupiah(activePoint.income)}</span>
				<span class="font-semibold text-expense">-{formatRupiah(activePoint.expense)}</span>
			</div>
		{/if}
	{/if}
</div>
