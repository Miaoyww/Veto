<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { zoom } from '$lib/stores/crisis/map-store';
	import { currentBattle, currentFaction, selectedPlacedUnit } from '$lib/stores/crisis/battle-store';
	import { gameClock } from '$lib/stores/crisis/game-clock.store';
	import { startEngine, stopEngine, resetEngineTimers } from '$lib/stores/crisis/simulation-engine';
	import { flushRuntimePositions } from '$lib/stores/crisis/battle-store';
	import ControlBar from '$lib/components/header/control-bar.svelte';

	
	

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

</script>

<div class="flex flex-col items-end gap-2">
	<div class="bg-background/75 backdrop-blur-md flex items-center gap-3 rounded-lg p-3 text-sm text-foreground">
		<ControlBar />

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
