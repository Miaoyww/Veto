<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Play, Pause, Gauge, AlertTriangle, Clock } from '@lucide/svelte';
	import { gameClock, TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/crisis/game-clock.store';
	import { currentBattle, runtimePositions } from '$lib/stores/crisis/battle-store';
	import { onMount, onDestroy } from 'svelte';
	import { startEngine, stopEngine } from '$lib/stores/crisis/simulation-engine';

	onMount(() => startEngine());
	onDestroy(() => {
		stopEngine();
		gameClock.update((c) => ({ ...c, isPaused: true }));
	});

	type CommandType = 'reset' | 'append';
	const engagedCount = $derived(Object.values($runtimePositions).filter((p) => p.isEngaged).length);
	const firefightCount = $derived(Math.ceil(engagedCount / 2));

	function togglePause() {
		gameClock.update((c) => ({ ...c, isPaused: !c.isPaused }));
	}

	function setTimeScale(scale: number) {
		gameClock.update((c) => ({ ...c, timeScale: scale }));
	}

	/** 战局中保存的自定义流速（不在预设档位中时显示） */
	const savedCustomScale = $derived(
		$currentBattle?.timeScale != null &&
			!(TIME_SCALES as readonly number[]).includes($currentBattle.timeScale)
			? $currentBattle.timeScale
			: null
	);

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
</script>

<div
	class="flex shrink-0 items-center gap-3 px-5"
	in:fly={{ y: -8, duration: 320, opacity: 0, delay: 60 }}
>
	<!-- 右侧状态区 -->
	<div class="ml-auto flex items-center gap-2">
		{#if engagedCount >= 2}
			<span
				class="flex animate-pulse items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
			>
				<AlertTriangle size={11} />
				检测到 {firefightCount} 处交火中
			</span>
		{/if}
		<span
			class="h-2 w-2 rounded-full {$gameClock.isPaused
				? 'bg-stone-300 dark:bg-stone-600'
				: 'animate-pulse bg-green-400'}"
		></span>
		<span class="text-xs text-muted-foreground"
			>{$gameClock.isPaused ? '已暂停' : '推演运行中'}</span
		>
		<Separator orientation="vertical" class="h-4" />
	</div>
	<!-- 播放 / 暂停 -->
	<Button
		onclick={togglePause}
		title={$gameClock.isPaused ? '开始推演' : '暂停推演'}
		variant="outline"
		size="icon"
		class="h-9 w-9 shrink-0 rounded-full border-2 transition-all
			{$gameClock.isPaused
			? 'border-stone-300 bg-white text-stone-600 hover:border-stone-500 hover:text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-400 dark:hover:text-stone-200'
			: 'border-green-400 bg-green-50 text-green-700 shadow-sm shadow-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:shadow-green-900/30 dark:hover:bg-green-900/50'}"
	>
		{#if $gameClock.isPaused}
			<Play size={15} />
		{:else}
			<Pause size={15} />
		{/if}
	</Button>

	<Separator orientation="vertical" class="h-5" />

	<!-- 流速选择 -->
	<div class="flex items-center gap-1.5">
		<Gauge size={13} class="text-muted-foreground" />
		{#each TIME_SCALES as scale}
			<Button
				onclick={() => setTimeScale(scale)}
				variant={$gameClock.timeScale === scale ? 'default' : 'outline'}
				size="sm"
				class="h-7 rounded-lg px-2.5 text-xs font-medium
					{$gameClock.timeScale === scale
					? 'border-stone-700 bg-stone-800 text-white shadow-sm hover:bg-stone-900 dark:border-stone-500 dark:bg-stone-700'
					: 'border-stone-200 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-300'}"
			>
				{TIME_SCALE_LABELS[scale]}
			</Button>
		{/each}
		{#if savedCustomScale !== null}
			<Button
				onclick={() => setTimeScale(savedCustomScale)}
				variant={$gameClock.timeScale === savedCustomScale ? 'default' : 'outline'}
				size="sm"
				class="h-7 rounded-lg px-2.5 text-xs font-medium
					{$gameClock.timeScale === savedCustomScale
					? 'border-stone-700 bg-stone-800 text-white shadow-sm hover:bg-stone-900 dark:border-stone-500 dark:bg-stone-700'
					: 'border-stone-200 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-300'}"
			>
				{savedCustomScale}秒/秒
			</Button>
		{/if}
	</div>

	<!-- 时间显示 -->
	<div class="flex items-center gap-1.5 font-mono text-sm text-stone-600 dark:text-stone-400">
		<Clock size={13} class="text-muted-foreground" />
		<span>{formatSimDate($gameClock.currentDate)}</span>
	</div>
	<span
		class="rounded-md px-2 py-0.5 font-mono text-xs {$gameClock.isPaused
			? 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500'
			: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-400'}"
	>
		{formatElapsed($gameClock.currentDate)}
	</span>
</div>
