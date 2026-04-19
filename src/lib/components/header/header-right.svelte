<script lang="ts">
	import { zoom } from '$lib/stores/crisis/map-store';
	import { currentBattle, selectedPlacedUnit } from '$lib/stores/crisis/battle-store';
	import ControlBar from '$lib/components/header/control-bar.svelte';
	import { cn, type WithElementRef } from '$lib/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { InputType } from 'jszip';

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

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;
	let { class: className }: Props = $props();
</script>

<div class={cn('flex flex-col items-end', className)}>
	<div
		class="rounded-t-xl rounded-bl-xl border-b border-white/5 bg-background/80 p-2 shadow-lg backdrop-blur-md"
	>
		<ControlBar />
	</div>

	<div
		class="-mt-[1px] flex gap-4 rounded-tl-none rounded-b-xl border-t border-white/10 bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-md"
	>
		<div class="flex flex-col gap-0.5">
			<div class="status-label text-[10px] tracking-wider uppercase opacity-60">缩放</div>
			<div class="status-value font-mono text-xs">{$zoom}</div>
		</div>

		<div class="flex flex-col gap-0.5">
			<div class="status-label text-[10px] tracking-wider uppercase opacity-60">单位</div>
			<div class="status-value font-mono text-xs">{unitCount}</div>
		</div>

		<div class="flex flex-col gap-0.5">
			<div class="status-label text-[10px] tracking-wider uppercase opacity-60">选中</div>
			<div class="status-value text-xs font-medium text-blue-400">{selectedUnitName}</div>
		</div>
	</div>
</div>
