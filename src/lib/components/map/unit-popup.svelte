<script lang="ts">
	import { BRANCH_LABELS, UNIT_STATUS_LABELS } from '$lib/types';
	import type { MilitaryUnit, PlacedUnit, Faction } from '$lib/types';
	import { Separator } from '$lib/components/ui/separator/index.js';

	let { unit, faction, placed }: { unit: MilitaryUnit; faction: Faction; placed: PlacedUnit } =
		$props();
</script>

<div class="min-w-44 py-0.5">
	<!-- 单位名称 -->
	<p class="text-sm font-semibold text-stone-900">{unit.name}</p>

	<!-- 阵营 & 军种 -->
	<div class="mt-1 flex items-center gap-1.5">
		<span class="inline-block h-2 w-2 rounded-full flex-shrink-0" style="background: {faction.color};"></span>
		<span class="text-xs text-stone-500">{faction.name} · {BRANCH_LABELS[unit.branch]}</span>
	</div>

	<Separator class="my-2" />

	<!-- 状态 & 坐标 -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between gap-4">
			<span class="text-xs text-stone-400">状态</span>
			<span class="text-xs font-medium text-stone-600">{UNIT_STATUS_LABELS[placed.status]}</span>
		</div>
		<div class="flex items-center justify-between gap-4">
			<span class="text-xs text-stone-400">坐标</span>
			<span class="font-mono text-xs text-stone-500">{placed.lat.toFixed(4)}°, {placed.lng.toFixed(4)}°</span>
		</div>
	</div>
</div>
