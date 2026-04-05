<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { zoom } from '$lib/stores/map-store';
	import { currentBattle, currentFaction, selectedPlacedUnit } from '$lib/stores/battle-store';
	import { simulationUnits, resetUnits } from '$lib/stores/simulation-units.store';
	import { gameClock } from '$lib/stores/game-clock.store';
	import { startEngine, stopEngine, resetEngineTimers } from '$lib/engine/simulation-engine';
	import { flushRuntimePositions } from '$lib/stores/battle-store';
	import ControlBar from '$lib/components/header/control-bar.svelte';

	type CommandType = 'reset' | 'append';
	let commandMode = $state<{ unitId: string; type: CommandType } | null>(null);

	const engagedUnits = $derived($simulationUnits.filter((u) => u.isEngaged));
	const firefightCount = $derived(Math.ceil(engagedUnits.length / 2));

	function onReset() {
		// 先将运行时位置写回 battles（保存当前推演状态）
		flushRuntimePositions();
		gameClock.update((c) => ({
			...c,
			currentDate: new Date('2026-01-01T00:00:00'),
			isPaused: true
		}));
		resetUnits();
		resetEngineTimers();
		commandMode = null;
	}

	onMount(() => startEngine());
	onDestroy(() => {
		stopEngine();
		gameClock.update((c) => ({ ...c, isPaused: true }));
	});

	let unitCount = $derived($currentBattle?.placedUnits.length ?? 0);

	let selectedUnitName = $derived.by(() => {
		const placed = $selectedPlacedUnit;
		const battle = $currentBattle;
		if (!placed || !battle) return '无';
		for (const f of battle.factions) {
			const u = f.units.find((u) => u.id === placed.unitId);
			if (u) return u.name;
		}
		return '无';
	});

	let currentFactionName = $derived($currentFaction?.name ?? '未选择');
</script>

<div class="flex flex-col items-end gap-2">
	<div class="bg-background/75 backdrop-blur-md flex items-center gap-3 rounded-lg p-3 text-sm text-foreground">
		<ControlBar bind:commandMode {engagedUnits} {firefightCount} {onReset} />

		<div class="flex flex-col gap-1">
			<div class="status-label">缩放级别</div>
			<div class="status-value">{$zoom}</div>
		</div>
		<div class="flex flex-col gap-1">
			<div class="status-label">单位数量</div>
			<div class="status-value">{unitCount}</div>
		</div>
		<div class="flex flex-col gap-1">
			<div class="status-label">选中单位</div>
			<div class="status-value">{selectedUnitName}</div>
		</div>
	</div>
</div>
