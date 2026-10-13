<script lang="ts">
	import { onMount } from 'svelte';
	import { formatRupiah } from '$lib/domain/money';
	import { isMotionActive } from '$lib/utils/motion';

	export interface SplinePoint {
		date: string;
		value: number;
		label?: string;
	}

	interface Props {
		data: SplinePoint[];
		height?: number;
		color?: string;
		gradientId?: string;
		class?: string;
	}

	let {
		data = [],
		height = 140,
		color = 'var(--color-primary, #6366F1)',
		gradientId = 'spline-gradient',
		class: className = ''
	}: Props = $props();

	let activeIndex = $state<number | null>(null);

	const VIEW_WIDTH = 320;
	const VIEW_HEIGHT = 120;
	const PADDING_BOTTOM = 15;
	const PADDING_TOP = 15;
	const PLOT_HEIGHT = VIEW_HEIGHT - PADDING_BOTTOM - PADDING_TOP;

	let bounds = $derived.by(() => {
		if (data.length === 0) return { min: 0, max: 100000, range: 100000 };
		let min = Infinity;
		let max = -Infinity;
		for (const pt of data) {
			if (pt.value < min) min = pt.value;
			if (pt.value > max) max = pt.value;
		}
		if (min === max) {
			min = min - 50000;
			max = max + 50000;
		}
		return { min, max, range: Math.max(1, max - min) };
	});

	// Hitung koordinat (x, y) tiap titik data
	let points = $derived.by(() => {
		if (data.length === 0) return [];
		const step = data.length > 1 ? VIEW_WIDTH / (data.length - 1) : VIEW_WIDTH;

		return data.map((pt, i) => {
			const x = i * step;
			const ratio = (pt.value - bounds.min) / bounds.range;
			const y = PADDING_TOP + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
			return { x, y, pt, index: i };
		});
	});

	// Bangun smooth curve path string
	let pathData = $derived.by(() => {
		if (points.length < 2) {
			if (points.length === 1) {
				return {
					linePath: `M 0,${points[0].y} L ${VIEW_WIDTH},${points[0].y}`,
					areaPath: `M 0,${points[0].y} L ${VIEW_WIDTH},${points[0].y} L ${VIEW_WIDTH},${VIEW_HEIGHT} L 0,${VIEW_HEIGHT} Z`
				};
			}
			return { linePath: '', areaPath: '' };
		}

		let lineD = `M ${points[0].x},${points[0].y}`;

		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];

			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;

			lineD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
		}

		const areaD = `${lineD} L ${VIEW_WIDTH},${VIEW_HEIGHT} L 0,${VIEW_HEIGHT} Z`;

		return { linePath: lineD, areaPath: areaD };
	});

	let activePt = $derived(activeIndex !== null && points[activeIndex] ? points[activeIndex] : null);

	let clipWidth = $state(VIEW_WIDTH);

	onMount(() => {
		if (isMotionActive()) {
			clipWidth = 0;
			const timer = setTimeout(() => {
				clipWidth = VIEW_WIDTH;
			}, 30);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="relative w-full select-none {className}" style="height: {height}px;">
	{#if data.length === 0}
		<div class="flex h-full items-center justify-center text-xs text-on-surface-variant">
			Belum ada data tren
		</div>
	{:else}
		<svg
			viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
			class="h-full w-full overflow-visible"
			preserveAspectRatio="none"
			role="img"
			aria-label="Grafik Tren Kurva"
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={color} stop-opacity="0.35" />
					<stop offset="100%" stop-color={color} stop-opacity="0" />
				</linearGradient>
				<clipPath id="{gradientId}-reveal">
					<rect
						x="0"
						y="0"
						width={clipWidth}
						height={VIEW_HEIGHT}
						style="transition: width 500ms var(--motion-ease-standard, cubic-bezier(0.2, 0, 0, 1));"
					/>
				</clipPath>
			</defs>

			<g clip-path="url(#{gradientId}-reveal)">
				<!-- Area Fill -->
				{#if pathData.areaPath}
					<path d={pathData.areaPath} fill="url(#{gradientId})" />
				{/if}

				<!-- Line Stroke -->
				{#if pathData.linePath}
					<path
						d={pathData.linePath}
						fill="none"
						stroke={color}
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/if}
			</g>

			<!-- Active Point Indicator & Hitboxes with a11y -->
			{#each points as p (p.index)}
				{@const slotWidth = VIEW_WIDTH / points.length}
				<rect
					x={p.x - slotWidth / 2}
					y="0"
					width={slotWidth}
					height={VIEW_HEIGHT}
					fill="transparent"
					class="cursor-pointer"
					role="button"
					tabindex="0"
					aria-label="{p.pt.date}: {formatRupiah(p.pt.value)}"
					onmouseenter={() => (activeIndex = p.index)}
					onclick={() => (activeIndex = p.index)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (activeIndex = p.index)}
				/>
			{/each}

			{#if activePt}
				<line
					x1={activePt.x}
					y1="0"
					x2={activePt.x}
					y2={VIEW_HEIGHT}
					stroke="currentColor"
					stroke-dasharray="2 2"
					class="text-outline-variant/40"
				/>
				<circle
					cx={activePt.x}
					cy={activePt.y}
					r="4.5"
					fill="var(--color-surface, #FFFFFF)"
					stroke={color}
					stroke-width="2.5"
				/>
			{/if}
		</svg>

		<!-- Tooltip Display -->
		{#if activePt}
			<div
				class="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-surface-container-highest/90 px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md"
			>
				<span class="text-on-surface-variant">{activePt.pt.date}</span>
				<span class="font-semibold text-on-surface">{formatRupiah(activePt.pt.value)}</span>
			</div>
		{/if}
	{/if}
</div>
