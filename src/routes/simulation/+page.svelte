<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ChevronLeft,
		Play,
		Pause,
		RotateCcw,
		Clock,
		Gauge,
		MapPin,
		Check,
		X,
		AlertTriangle,
		MousePointerClick,
		Navigation,
		MoreHorizontal,
		ChevronRight,
		PlusCircle,
		RefreshCw
	} from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ContextMenu } from 'bits-ui';

	import { gameClock, TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/game-clock.store';
	import {
		simulationUnits,
		resetUnits,
		issueSimCommand,
		applySimCommand,
		cancelSimCommand,
		appendToSimPath,
		resetApplySimPath
	} from '$lib/stores/simulation-units.store';
	import type { Vec2 } from '$lib/stores/simulation-units.store';
	import { startEngine, stopEngine, PIXELS_PER_KM } from '$lib/engine/simulation-engine';

	// ── 作战剧场尺寸（像素） ──
	const W = 800;
	const H = 450;
	const SCALE_BAR_PX = 50;
	const SCALE_BAR_KM = SCALE_BAR_PX / PIXELS_PER_KM;
	const U_W = 32;
	const U_H = 22;

	// 鼠标悬停坐标
	let hoverPos: Vec2 | null = $state(null);
	// 当前指令模式：reset = 重新设置路线，append = 追加路线节点
	type CommandType = 'reset' | 'append';
	let commandMode = $state<{ unitId: string; type: CommandType } | null>(null);

	// 上下文菜单状态
	let ctxMenuOpen = $state(false);
	let ctxMenuUnitId = $state<string | null>(null);
	let ctxVirtualAnchor: any = $state(null);

	function openUnitContextMenu(e: MouseEvent, unitId: string) {
		e.preventDefault();
		e.stopPropagation();
		ctxMenuUnitId = unitId;
		ctxVirtualAnchor = {
			getBoundingClientRect: () => ({
				width: 0, height: 0,
				top: e.clientY, bottom: e.clientY,
				left: e.clientX, right: e.clientX
			}),
			contextElement: document.body
		};
		ctxMenuOpen = true;
	}

	function startRouteCommand(type: CommandType) {
		if (!ctxMenuUnitId) return;
		commandMode = { unitId: ctxMenuUnitId, type };
		ctxMenuOpen = false;
	}

	function ctxGetOpen() { return ctxMenuOpen; }
	function ctxSetOpen(v: boolean) { ctxMenuOpen = v; }

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
		gameClock.update((c) => ({ ...c, currentDate: new Date('2026-01-01T00:00:00'), isPaused: true }));
		resetUnits();
		commandMode = null;
	}

	// ── 生命周期 ──

	onMount(() => {
		startEngine();
	});

	onDestroy(() => {
		stopEngine();
		gameClock.update((c) => ({ ...c, isPaused: true }));
	});

	// 待确认单位集合（响应式）
	const awaitingUnitIds = $derived(
		new Set($simulationUnits.filter((u) => u.isAwaitingConfirmation).map((u) => u.id))
	);

	// 指令模式时将鼠标切换为十字准星
	$effect(() => {
		if (commandMode) {
			document.body.style.cursor = 'crosshair';
		} else {
			document.body.style.cursor = '';
		}
		return () => { document.body.style.cursor = ''; };
	});

	// 绑定剧场 DOM 元素，通过 $effect 注册事件（避免 a11y 警告）
	let theaterEl: HTMLDivElement;

	$effect(() => {
		if (!theaterEl) return;
		function handleClick(e: MouseEvent) {
			if (!commandMode) return;
			const rect = theaterEl.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const { unitId, type } = commandMode;
			const isRunning = !$gameClock.isPaused;
			if (type === 'reset') {
				if (isRunning) {
					// 推演运行中：直接应用，无需确认
					resetApplySimPath(unitId, { x, y });
				} else {
					// 推演暂停：走 pendingPath 确认流程
					issueSimCommand(unitId, [{ x, y }]);
				}
				commandMode = null; // reset 模式单击一次即退出
			} else {
				// append 模式：直接追加节点，保持模式以允许继续点击
				appendToSimPath(unitId, { x, y });
				// commandMode 保持，让用户继续点击追加更多节点
			}
		}
		function handleMouseMove(e: MouseEvent) {
			const rect = theaterEl.getBoundingClientRect();
			hoverPos = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
		}
		function handleMouseLeave() {
			hoverPos = null;
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') commandMode = null;
		}
		theaterEl.addEventListener('click', handleClick);
		theaterEl.addEventListener('mousemove', handleMouseMove);
		theaterEl.addEventListener('mouseleave', handleMouseLeave);
		theaterEl.addEventListener('keydown', handleKeyDown);
		return () => {
			theaterEl.removeEventListener('click', handleClick);
			theaterEl.removeEventListener('mousemove', handleMouseMove);
			theaterEl.removeEventListener('mouseleave', handleMouseLeave);
			theaterEl.removeEventListener('keydown', handleKeyDown);
		};
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

		<div class="ml-auto flex items-center gap-3">
			<div class="flex items-center gap-1.5 font-mono text-sm text-stone-600">
				<Clock size={13} class="text-stone-400" />
				<span>{formatSimDate($gameClock.currentDate)}</span>
			</div>
			<span class="rounded-md px-2 py-0.5 font-mono text-xs {$gameClock.isPaused ? 'bg-stone-100 text-stone-400' : 'bg-green-50 text-green-700'}">
				{formatElapsed($gameClock.currentDate)}
			</span>
		</div>
	</header>

	<!-- ════ 控制栏 ════ -->
	<div
		class="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white/50 px-5 py-2.5"
		in:fly={{ y: -8, duration: 320, opacity: 0, delay: 60 }}
	>
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

		<button
			onclick={resetAll}
			title="重置推演"
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-all hover:border-stone-400 hover:text-stone-700"
		>
			<RotateCcw size={14} />
		</button>

		<div class="h-5 w-px bg-stone-200"></div>

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

		<div class="ml-auto flex items-center gap-2">
			{#if commandMode}
				<span class="flex items-center gap-1.5 text-xs font-medium text-amber-600">
					<MousePointerClick size={13} />
					{commandMode.type === 'reset' ? '点击剧场设置新路线终点（替换全部）' : '持续点击追加路线节点，Esc 结束'}
				</span>
				<button
					onclick={() => (commandMode = null)}
					class="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-500 hover:border-stone-400"
				>
					{commandMode.type === 'append' ? '完成' : '取消'}
				</button>
			{:else}
				<span class="h-2 w-2 rounded-full {$gameClock.isPaused ? 'bg-stone-300' : 'animate-pulse bg-green-400'}"></span>
				<span class="text-xs text-stone-500">{$gameClock.isPaused ? '已暂停' : '推演运行中'}</span>
			{/if}
		</div>
	</div>

	<!-- ════ 主内容区 ════ -->
	<div class="flex flex-1 flex-col items-center gap-4 overflow-auto p-4">

		<!-- ══ 指令确认栏（有待确认指令时显示） ══ -->
		{#each $simulationUnits.filter((u) => u.isAwaitingConfirmation) as unit (unit.id)}
			<div
				class="w-full max-w-[800px]"
				in:fly={{ y: -8, duration: 220, opacity: 0 }}
				out:fly={{ y: -8, duration: 160, opacity: 0 }}
			>
				<div class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm backdrop-blur-sm">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white">
						<AlertTriangle class="h-4 w-4 text-amber-500" />
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-stone-800">
							<span class="text-amber-600">收到新指令</span>
							<span class="ml-1.5 font-normal text-stone-500">— {unit.name}</span>
						</p>
						<div class="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
							<Navigation size={10} class="text-stone-400" />
							{#if unit.pendingPath.length > 0}
								{@const ep = unit.pendingPath[unit.pendingPath.length - 1]}
								<span class="font-mono">目标坐标 ({posKm(ep.x)}, {posKm(ep.y)}) km</span>
							{/if}
							<span class="text-stone-300">·</span>
							<span>是否执行？</span>
						</div>
					</div>

					<Separator orientation="vertical" class="mx-1 h-8" />

					<div class="flex shrink-0 items-center gap-2">
						<Button
							size="sm"
							class="h-8 gap-1.5 bg-stone-800 px-3 text-xs text-white hover:bg-stone-900"
							onclick={() => applySimCommand(unit.id)}
						>
							<Check size={13} />
							执行
						</Button>
						<Button
							variant="outline"
							size="sm"
							class="h-8 gap-1.5 border-stone-200 px-3 text-xs text-stone-600 hover:border-stone-400"
							onclick={() => cancelSimCommand(unit.id)}
						>
							<X size={13} />
							取消
						</Button>
					</div>
				</div>
			</div>
		{/each}

		<!-- ── 作战剧场 ── -->
		<div
			bind:this={theaterEl}
			class="relative shrink-0 overflow-hidden rounded-2xl border shadow-lg transition-all
				{commandMode ? 'border-amber-300 shadow-amber-100' : 'border-stone-300'}"
			style="width:{W}px; height:{H}px; background-color:#ede8da;"
			in:fly={{ y: 20, duration: 380, opacity: 0, delay: 120 }}
		>
			<!-- 格纹背景 -->
			<svg class="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
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

			<!-- 路径 SVG 层 -->
			<svg class="pointer-events-none absolute inset-0" width={W} height={H} viewBox="0 0 {W} {H}" aria-hidden="true">
				{#each $simulationUnits as unit (unit.id)}
					{@const isAwaiting = awaitingUnitIds.has(unit.id)}
					{@const color = unit.factionColor}

					<!-- 实线：正在执行的 targetPath -->
					{#if unit.targetPath.length > 0}
						<polyline
							points={[unit.position, ...unit.targetPath].map((p) => `${p.x},${p.y}`).join(' ')}
							fill="none"
							stroke={color}
							stroke-width="2"
							opacity="0.75"
						/>
						{@const last = unit.targetPath[unit.targetPath.length - 1]}
						<circle cx={last.x} cy={last.y} r="5" fill={color} opacity="0.7" />
						<circle cx={last.x} cy={last.y} r="9" fill="none" stroke={color} stroke-width="1.5" opacity="0.3" />
					{/if}

					<!-- 中间节点 -->
					{#each unit.targetPath as wp, j}
						{#if j < unit.targetPath.length - 1}
							<circle cx={wp.x} cy={wp.y} r="3" fill={color} opacity="0.4" />
						{/if}
					{/each}

					<!-- 虚线：pendingPath（待确认） -->
					{#if isAwaiting && unit.pendingPath.length > 0}
						{@const pendingEnd = unit.pendingPath[unit.pendingPath.length - 1]}
						<line
							x1={unit.position.x}
							y1={unit.position.y}
							x2={pendingEnd.x}
							y2={pendingEnd.y}
							stroke={color}
							stroke-width="2"
							stroke-dasharray="8 5"
							opacity="0.65"
						/>
						<!-- 橙色目标点 -->
						<circle cx={pendingEnd.x} cy={pendingEnd.y} r="6" fill="#f59e0b" opacity="0.85" />
						<circle cx={pendingEnd.x} cy={pendingEnd.y} r="11" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5" />
					{/if}
				{/each}

				<!-- 指令模式实时预览线 -->
				{#if commandMode && hoverPos}
					{@const _cmd = commandMode}
					{@const u = $simulationUnits.find((u) => u.id === _cmd.unitId)}
					{#if u}
						{@const previewFrom = _cmd.type === 'append' && u.targetPath.length > 0
							? u.targetPath[u.targetPath.length - 1]
							: u.position}
						<line
							x1={previewFrom.x} y1={previewFrom.y}
							x2={hoverPos.x}    y2={hoverPos.y}
							stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 4" opacity="0.7"
						/>
						<circle cx={hoverPos.x} cy={hoverPos.y} r="5" fill="#f59e0b" opacity="0.8" />
						<circle cx={hoverPos.x} cy={hoverPos.y} r="10" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.4" />
					{/if}
				{/if}
			</svg>

			<!-- 单位算子图标 -->
			{#each $simulationUnits as unit (unit.id)}
				{@const isAwaiting = awaitingUnitIds.has(unit.id)}
				<div
					class="pointer-events-none absolute select-none"
					style="left:{unit.position.x}px; top:{unit.position.y}px; transform:translate(-50%,-50%); will-change:left,top;"
				>
					{#if isAwaiting}
						<div class="animate-ping absolute -inset-3 rounded-full bg-amber-400 opacity-25"></div>
					{/if}

					<div
						class="flex items-center justify-center border-2 font-black text-[11px]"
						style="
							width:{U_W}px; height:{U_H}px;
							border-color:{isAwaiting ? '#f59e0b' : unit.factionColor};
							background:white;
							color:{isAwaiting ? '#f59e0b' : unit.factionColor};
							position:relative;
						"
					>
						{unitSymbol(unit.type)}
						<svg class="absolute inset-0" width={U_W} height={U_H} viewBox="0 0 {U_W} {U_H}" aria-hidden="true">
							{#if unit.type === 'infantry'}
								<line x1="2" y1="2" x2={U_W-2} y2={U_H-2} stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"/>
								<line x1={U_W-2} y1="2" x2="2" y2={U_H-2} stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"/>
							{:else if unit.type === 'armor'}
								<ellipse cx={U_W/2} cy={U_H/2} rx={U_W/2-4} ry={U_H/2-4} fill="none" stroke={unit.factionColor} stroke-width="1.5" opacity="0.6"/>
							{/if}
						</svg>
					</div>

					<div class="absolute left-1/2 -translate-x-1/2" style="bottom:100%; width:1.5px; height:8px; background:{unit.factionColor};"></div>

					<div
						class="mt-0.5 whitespace-nowrap rounded px-1 text-center text-[9px] font-semibold leading-tight"
						style="color:{isAwaiting ? '#b45309' : unit.factionColor}; background:rgba(255,255,255,0.9); outline:1px solid {isAwaiting ? '#f59e0b88' : unit.factionColor+'44'};"
					>
						{unit.name}{isAwaiting ? ' ⚠' : ''}
					</div>
				</div>
			{/each}

			<!-- 坐标悬浮标签 -->
			{#if hoverPos}
				<div class="pointer-events-none absolute bottom-10 left-3 rounded font-mono text-[10px] text-stone-500" style="background:rgba(255,255,255,0.8);padding:2px 6px;">
					({posKm(hoverPos.x)}, {posKm(hoverPos.y)}) km
				</div>
			{/if}

			<!-- 比例尺 -->
			<div class="absolute bottom-3 right-4 flex flex-col items-end gap-0.5">
				<div class="h-1 border-x border-b border-stone-500" style="width:{SCALE_BAR_PX}px;"></div>
				<span class="font-mono text-[10px] text-stone-500">{SCALE_BAR_KM} km</span>
			</div>

			<!-- 指令模式边框提示 -->
			{#if commandMode}
				<div class="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber-400/60" in:fade={{ duration: 150 }}></div>
				<div class="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
					{commandMode.type === 'reset' ? '点击设置新路线终点（替换全部路线）' : '连续点击追加节点 · Esc 结束'}
				</div>
			{:else if $gameClock.isPaused}
				<div class="absolute inset-0 flex items-center justify-center" style="background:rgba(255,255,255,0.12);">
					<span class="rotate-[-8deg] rounded-xl border-4 border-stone-400/40 px-8 py-3 font-bold tracking-[0.3em] text-stone-400/40" style="font-size:2.5rem;">暂停</span>
				</div>
			{/if}
		</div>

		<!-- ── 単位状态列表 ── -->
		<div
			class="w-full max-w-[800px] rounded-2xl border border-stone-200 bg-white/70 backdrop-blur-sm"
			in:fly={{ y: 16, duration: 350, opacity: 0, delay: 180 }}
		>
			<div class="flex items-center border-b border-stone-100 px-4 py-2.5">
				<span class="text-xs font-semibold uppercase tracking-wider text-stone-400">单位状态</span>
				<span class="ml-2 text-xs text-stone-400">
					{PIXELS_PER_KM} px/km · {W / PIXELS_PER_KM} km × {H / PIXELS_PER_KM} km
				</span>
				<div class="ml-auto flex items-center gap-3 text-[11px] text-stone-400">
					<span class="flex items-center gap-1">
						<svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#64748b" stroke-width="2"/></svg>
						执行中（实线）
					</span>
					<span class="flex items-center gap-1">
						<svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 3"/></svg>
						待确认（虚线）
					</span>
				</div>
			</div>
			<div class="divide-y divide-stone-50">
				{#each $simulationUnits as unit (unit.id)}
					{@const isAwaiting = unit.isAwaitingConfirmation}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex items-center gap-4 px-4 py-3"
						oncontextmenu={(e) => { e.preventDefault(); openUnitContextMenu(e, unit.id); }}
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-black"
							style="border-color:{isAwaiting ? '#f59e0b' : unit.factionColor}; color:{isAwaiting ? '#b45309' : unit.factionColor}; background:{isAwaiting ? '#fef9ee' : unit.factionColor+'15'};"
						>
							{unitSymbol(unit.type)}
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-2">
								<span class="text-sm font-semibold text-stone-700">{unit.name}</span>
								<span class="text-xs text-stone-400">{unitLabel(unit.type)}</span>
								{#if isAwaiting}
									<span class="text-xs font-medium text-amber-600">⚠ 有待确认指令</span>
								{/if}
							</div>
							<div class="mt-0.5 flex items-center gap-3 text-xs text-stone-500">
								<span class="flex items-center gap-1">
									<MapPin size={10} />
									({posKm(unit.position.x)}, {posKm(unit.position.y)}) km
								</span>
								<span>{unit.speed} km/h</span>
								<span class="font-mono text-stone-400">{displaySpeedPxPerSec(unit.speed)} px/s</span>
								{#if unit.targetPath.length === 0 && !isAwaiting}
									<span class="text-stone-400">已到达终点</span>
								{:else if unit.targetPath.length > 0}
									<span class="text-green-600">行进中 · {unit.targetPath.length} 节点剩余</span>
								{/if}
							</div>
						</div>

						<!-- 操作按钮 -->
						<div class="flex shrink-0 items-center gap-2">
							{#if isAwaiting}
								<Button
									size="sm"
									class="h-7 gap-1 bg-stone-800 px-2.5 text-xs text-white hover:bg-stone-900"
									onclick={() => applySimCommand(unit.id)}
								>
									<Check size={11} />执行
								</Button>
								<Button
									variant="outline"
									size="sm"
									class="h-7 gap-1 border-stone-200 px-2.5 text-xs text-stone-500 hover:border-stone-400"
									onclick={() => cancelSimCommand(unit.id)}
								>
									<X size={11} />取消
								</Button>
							{:else if commandMode?.unitId === unit.id}
								<span class="text-xs text-amber-600">
									{commandMode.type === 'reset' ? '点击剧场设置新终点' : '持续点击追加节点'}
								</span>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 gap-1 px-2 text-xs text-stone-500 hover:text-stone-700"
									onclick={() => { commandMode = null; }}
								>
									<X size={11} />完成
								</Button>
							{:else}
								<button
									class="flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2.5 text-xs text-stone-500 transition-all hover:border-stone-400 hover:text-stone-700"
									onclick={(e) => openUnitContextMenu(e, unit.id)}
								>
									<MoreHorizontal size={11} />
									路线指令
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="border-t border-stone-100 px-4 py-2 text-xs text-stone-400">
				右键单位行 / 点击「路线指令」→ 重新设置路线（暂停时需确认）或 绘制路线节点（直接追加） ·
				推演运行中路线修改直接生效，无需确认 · pendingPath 与 RAF 位移循环完全解耦
			</div>
		</div>
	</div>
</div>

<!-- 单位路线指令上下文菜单 -->
<ContextMenu.Root bind:open={ctxGetOpen, ctxSetOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="z-[9999] min-w-[160px] rounded-xl border border-stone-200 bg-white px-1 py-1.5 shadow-lg outline-none"
			customAnchor={ctxVirtualAnchor}
		>
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger
					class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 select-none outline-none focus-visible:outline-none data-highlighted:bg-stone-100"
				>
					<span class="flex items-center gap-2">
						<Navigation class="h-3.5 w-3.5 text-stone-500" />
						路线指令
					</span>
					<ChevronRight class="h-3.5 w-3.5 text-stone-400" />
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent
					class="z-[10000] min-w-[180px] rounded-xl border border-stone-200 bg-white px-1 py-1.5 shadow-lg outline-none"
				>
					<ContextMenu.Item
						class="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-700 select-none outline-none focus-visible:outline-none data-highlighted:bg-stone-100"
						onSelect={() => startRouteCommand('reset')}
					>
						<RefreshCw class="h-3.5 w-3.5 text-stone-500" />
						重新设置路线
						<span class="ml-auto text-[10px] text-stone-400">清空并重绘</span>
					</ContextMenu.Item>
					<ContextMenu.Item
						class="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-700 select-none outline-none focus-visible:outline-none data-highlighted:bg-stone-100"
						onSelect={() => startRouteCommand('append')}
					>
						<PlusCircle class="h-3.5 w-3.5 text-stone-500" />
						绘制路线节点
						<span class="ml-auto text-[10px] text-stone-400">继续追加</span>
					</ContextMenu.Item>
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>

