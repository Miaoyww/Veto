<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { ChevronLeft, Play, Pause, RotateCcw, Clock, Gauge, MapPin } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	import { gameClock, TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/game-clock.store';
	import { simulationUnits, DEMO_UNITS_INITIAL, resetUnits } from '$lib/stores/simulation-units.store';
	import { startEngine, stopEngine, PIXELS_PER_KM } from '$lib/engine/simulation-engine';

	// ── 作战剧场尺寸（像素） ──
	const W = 800;
	const H = 450;
	// 1 km = 5 px → 比例尺标注：50px = 10km
	const SCALE_BAR_PX = 50;
	const SCALE_BAR_KM = SCALE_BAR_PX / PIXELS_PER_KM;

	// 单位图标半尺寸（图标 32×22 px，NATO 约 3:2 比例）
	const U_W = 32;
	const U_H = 22;

	// 初始完整路径（含起点），用于绘制背景虚线路线
	const fullPaths = DEMO_UNITS_INITIAL.map((u) => [u.position, ...u.targetPath]);

	// ── 工具函数 ──

	function formatSimDate(d: Date): string {
		const Y = d.getFullYear();
		const M = String(d.getMonth() + 1).padStart(2, '0');
		const D = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const m = String(d.getMinutes()).padStart(2, '0');
		const s = String(d.getSeconds()).padStart(2, '0');
		return `${Y}-${M}-${D} ${h}:${m}:${s}`;
	}

	const SIM_START = new Date('2026-01-01T00:00:00').getTime();
	function formatElapsed(d: Date): string {
		const totalSec = Math.floor((d.getTime() - SIM_START) / 1000);
		const hh = Math.floor(totalSec / 3600);
		const mm = Math.floor((totalSec % 3600) / 60);
		const ss = totalSec % 60;
		return `T+${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
	}

	function unitSymbol(type: string): string {
		if (type === 'infantry') return '步';
		if (type === 'armor') return '甲';
		return '空';
	}

	function unitLabel(type: string): string {
		if (type === 'infantry') return '步兵';
		if (type === 'armor') return '装甲';
		return '空军';
	}

	function posKm(px: number): string {
		return (px / PIXELS_PER_KM).toFixed(1);
	}

	function unitStatus(unit: (typeof $simulationUnits)[number]): string {
		if (unit.targetPath.length === 0) return '已到达终点';
		return `行进中 → 第${DEMO_UNITS_INITIAL.find((u) => u.id === unit.id)!.targetPath.length - unit.targetPath.length + 1}节点`;
	}

	// 显速：实际像素/秒
	function displaySpeedPxPerSec(speedKmh: number): string {
		const pxPerSec = (speedKmh * $gameClock.timeScale * PIXELS_PER_KM) / 3600;
		return pxPerSec.toFixed(1);
	}

	// ── 控制操作 ──

	function togglePause() {
		gameClock.update((c) => ({ ...c, isPaused: !c.isPaused }));
	}

	function setTimeScale(scale: number) {
		gameClock.update((c) => ({ ...c, timeScale: scale }));
	}

	function resetAll() {
		gameClock.update((c) => ({
			...c,
			currentDate: new Date('2026-01-01T00:00:00'),
			isPaused: true
		}));
		resetUnits();
	}

	// ── 生命周期 ──

	onMount(() => {
		startEngine();
	});

	onDestroy(() => {
		stopEngine();
		gameClock.update((c) => ({ ...c, isPaused: true }));
	});
</script>

<div class="flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-100 to-stone-200">
	<!-- ════ 顶部导航栏 ════ -->
	<header
		class="flex h-13 shrink-0 items-center gap-3 border-b border-stone-200 bg-white/70 px-5 backdrop-blur-sm"
		in:fly={{ y: -12, duration: 300, opacity: 0 }}
	>
		<button
			onclick={() => goto('/')}
			class="flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-800"
		>
			<ChevronLeft size={15} />
			返回
		</button>

		<div class="h-4 w-px bg-stone-200"></div>

		<span class="text-sm font-semibold text-stone-700">时间-位移同步引擎 · 演示</span>

		<!-- 推演时钟（右侧，等宽字体） -->
		<div class="ml-auto flex items-center gap-3">
			<div class="flex items-center gap-1.5 font-mono text-sm text-stone-600">
				<Clock size={13} class="text-stone-400" />
				<span>{formatSimDate($gameClock.currentDate)}</span>
			</div>
			<span
				class="rounded-md px-2 py-0.5 font-mono text-xs {$gameClock.isPaused
					? 'bg-stone-100 text-stone-400'
					: 'bg-green-50 text-green-700'}"
			>
				{formatElapsed($gameClock.currentDate)}
			</span>
		</div>
	</header>

	<!-- ════ 控制栏 ════ -->
	<div
		class="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white/50 px-5 py-2.5"
		in:fly={{ y: -8, duration: 320, opacity: 0, delay: 60 }}
	>
		<!-- 开始 / 暂停 -->
		<button
			onclick={togglePause}
			title={$gameClock.isPaused ? '开始推演' : '暂停推演'}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all
				{$gameClock.isPaused
				? 'border-stone-300 bg-white text-stone-600 hover:border-stone-500 hover:text-stone-800'
				: 'border-green-400 bg-green-50 text-green-700 shadow-sm shadow-green-200 hover:bg-green-100'}"
		>
			{#if $gameClock.isPaused}
				<Play size={15} />
			{:else}
				<Pause size={15} />
			{/if}
		</button>

		<!-- 重置 -->
		<button
			onclick={resetAll}
			title="重置推演"
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-all hover:border-stone-400 hover:text-stone-700"
		>
			<RotateCcw size={14} />
		</button>

		<!-- 分隔线 -->
		<div class="h-5 w-px bg-stone-200"></div>

		<!-- 流速档位 -->
		<div class="flex items-center gap-1.5">
			<Gauge size={13} class="text-stone-400" />
			{#each TIME_SCALES as scale}
				<button
					onclick={() => setTimeScale(scale)}
					class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all
						{$gameClock.timeScale === scale
						? 'border-stone-700 bg-stone-800 text-white shadow-sm'
						: 'border-stone-200 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700'}"
				>
					{TIME_SCALE_LABELS[scale]}
				</button>
			{/each}
		</div>

		<!-- 运行状态指示 -->
		<div class="ml-auto flex items-center gap-2">
			<span
				class="h-2 w-2 rounded-full {$gameClock.isPaused ? 'bg-stone-300' : 'animate-pulse bg-green-400'}"
			></span>
			<span class="text-xs text-stone-500">{$gameClock.isPaused ? '已暂停' : '推演运行中'}</span>
		</div>
	</div>

	<!-- ════ 主内容区 ════ -->
	<div class="flex flex-1 flex-col items-center gap-4 overflow-auto p-4">
		<!-- ── 作战剧场 ── -->
		<div
			class="relative shrink-0 overflow-hidden rounded-2xl border border-stone-300 shadow-lg"
			style="width:{W}px; height:{H}px; background-color:#ede8da;"
			in:fly={{ y: 20, duration: 380, opacity: 0, delay: 120 }}
		>
			<!-- 地图格纹背景 -->
			<svg
				class="pointer-events-none absolute inset-0"
				width={W}
				height={H}
				aria-hidden="true"
			>
				<defs>
					<pattern id="grid-major" width="40" height="40" patternUnits="userSpaceOnUse">
						<path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,90,60,0.12)" stroke-width="1" />
					</pattern>
					<pattern id="grid-minor" width="8" height="8" patternUnits="userSpaceOnUse">
						<path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(100,90,60,0.06)" stroke-width="0.5" />
					</pattern>
				</defs>
				<rect width={W} height={H} fill="url(#grid-minor)" />
				<rect width={W} height={H} fill="url(#grid-major)" />
			</svg>

			<!-- 单位路径（背景虚线） + 路径节点 -->
			<svg
				class="pointer-events-none absolute inset-0"
				width={W}
				height={H}
				viewBox="0 0 {W} {H}"
				aria-hidden="true"
			>
				{#each fullPaths as path, i}
					{@const color = DEMO_UNITS_INITIAL[i].factionColor}
					{#if path.length > 1}
						<polyline
							points={path.map((p) => `${p.x},${p.y}`).join(' ')}
							fill="none"
							stroke={color}
							stroke-width="1.5"
							stroke-dasharray="6 4"
							opacity="0.35"
						/>
					{/if}
					{#each path as wp, j}
						<circle cx={wp.x} cy={wp.y} r={j === 0 ? 5 : 4} fill={color} opacity={j === 0 ? 0.6 : 0.4} />
					{/each}
				{/each}

				<!-- 剩余路径高亮（当前位置 → 下一节点） -->
				{#each $simulationUnits as unit}
					{#if unit.targetPath.length > 0}
						<line
							x1={unit.position.x}
							y1={unit.position.y}
							x2={unit.targetPath[0].x}
							y2={unit.targetPath[0].y}
							stroke={unit.factionColor}
							stroke-width="2"
							opacity="0.7"
						/>
					{/if}
				{/each}
			</svg>

			<!-- 单位算子图标 -->
			{#each $simulationUnits as unit (unit.id)}
				<div
					class="pointer-events-none absolute select-none"
					style="
						left: {unit.position.x}px;
						top:  {unit.position.y}px;
						transform: translate(-50%, -50%);
						will-change: left, top;
					"
				>
					<!-- NATO 风格方框 -->
					<div
						class="flex items-center justify-center border-2 font-black text-[11px]"
						style="
							width: {U_W}px;
							height: {U_H}px;
							border-color: {unit.factionColor};
							background: white;
							color: {unit.factionColor};
							position: relative;
						"
					>
						{unitSymbol(unit.type)}
						<!-- 步兵：对角十字线；装甲：椭圆弧 -->
						<svg
							class="absolute inset-0"
							width={U_W}
							height={U_H}
							viewBox="0 0 {U_W} {U_H}"
							aria-hidden="true"
						>
							{#if unit.type === 'infantry'}
								<line
									x1="2" y1="2" x2={U_W - 2} y2={U_H - 2}
									stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"
								/>
								<line
									x1={U_W - 2} y1="2" x2="2" y2={U_H - 2}
									stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"
								/>
							{:else if unit.type === 'armor'}
								<ellipse
									cx={U_W / 2} cy={U_H / 2}
									rx={U_W / 2 - 4} ry={U_H / 2 - 4}
									fill="none" stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"
								/>
							{/if}
						</svg>
					</div>

					<!-- 旗杆 -->
					<div
						class="absolute left-1/2 -translate-x-1/2 -translate-y-full"
						style="bottom: 100%; width: 1.5px; height: 8px; background: {unit.factionColor};"
					></div>

					<!-- 单位名标签 -->
					<div
						class="mt-0.5 whitespace-nowrap rounded px-1 text-center text-[9px] font-semibold leading-tight"
						style="
							color: {unit.factionColor};
							background: rgba(255,255,255,0.85);
							outline: 1px solid {unit.factionColor}44;
						"
					>
						{unit.name}
					</div>
				</div>
			{/each}

			<!-- 比例尺 -->
			<div class="absolute bottom-3 right-4 flex flex-col items-end gap-0.5">
				<div class="flex items-center gap-0">
					<div class="h-1 border-x border-b border-stone-500" style="width: {SCALE_BAR_PX}px;"></div>
				</div>
				<span class="font-mono text-[10px] text-stone-500">{SCALE_BAR_KM} km</span>
			</div>

			<!-- 推演状态水印 -->
			{#if $gameClock.isPaused}
				<div
					class="absolute inset-0 flex items-center justify-center"
					style="background: rgba(255,255,255,0.15);"
				>
					<span
						class="rotate-[-8deg] rounded-xl border-4 border-stone-400/40 px-8 py-3 font-bold tracking-[0.3em] text-stone-400/40"
						style="font-size: 2.5rem;"
					>
						暂停
					</span>
				</div>
			{/if}
		</div>

		<!-- ── 单位状态列表 ── -->
		<div
			class="w-full max-w-[800px] rounded-2xl border border-stone-200 bg-white/70 backdrop-blur-sm"
			in:fly={{ y: 16, duration: 350, opacity: 0, delay: 180 }}
		>
			<div class="border-b border-stone-100 px-4 py-2.5">
				<span class="text-xs font-semibold uppercase tracking-wider text-stone-400">单位状态</span>
				<span class="ml-2 text-xs text-stone-400">
					比例尺 {PIXELS_PER_KM} px/km · 剧场 {W / PIXELS_PER_KM} km × {H / PIXELS_PER_KM} km
				</span>
			</div>
			<div class="divide-y divide-stone-50">
				{#each $simulationUnits as unit (unit.id)}
					{@const isArrived = unit.targetPath.length === 0}
					<div class="flex items-center gap-4 px-4 py-3">
						<!-- 类型色块 -->
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-black"
							style="border-color: {unit.factionColor}; color: {unit.factionColor}; background: {unit.factionColor}15;"
						>
							{unitSymbol(unit.type)}
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-2">
								<span class="text-sm font-semibold text-stone-700">{unit.name}</span>
								<span class="text-xs text-stone-400">{unitLabel(unit.type)}</span>
							</div>
							<div class="mt-0.5 flex items-center gap-3 text-xs text-stone-500">
								<span class="flex items-center gap-1">
									<MapPin size={10} />
									({posKm(unit.position.x)}, {posKm(unit.position.y)}) km
								</span>
								<span>速度 {unit.speed} km/h</span>
								<span class="font-mono text-stone-400">
									显速 {displaySpeedPxPerSec(unit.speed)} px/s
								</span>
							</div>
						</div>

						<!-- 状态 -->
						<div
							class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium {isArrived
								? 'bg-stone-100 text-stone-400'
								: 'bg-green-50 text-green-700'}"
						>
							{unitStatus(unit)}
						</div>
					</div>
				{/each}
			</div>

			<!-- 引擎说明 -->
			<div class="border-t border-stone-100 px-4 py-2 text-xs text-stone-400">
				引擎：每帧推进 <span class="font-mono text-stone-500">Δ推演秒 = Δ真实ms ÷ 1000 × timeScale</span>，
				位移 = (speed ÷ 3600) × Δ推演秒 × {PIXELS_PER_KM} px/km
			</div>
		</div>
	</div>
</div>
