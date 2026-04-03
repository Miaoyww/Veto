<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Plus,
		Settings,
		SquareArrowOutUpRight,
		RefreshCcw,
		PanelLeft,
		PanelsTopLeft,
		ArrowLeft
	} from '@lucide/svelte';
	import SidebarTrigger from '$lib/components/ui/sidebar/sidebar-trigger.svelte';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import MapTypeButton from '$lib/components/buttons/map-type-button.svelte';
	import { zoom } from '$lib/stores/map-store';
	import { leftBarPinned } from '$lib/stores/sidebar-store';
	import {
		currentBattle,
		currentFaction,
		selectedPlacedUnit,
		interactionMode
	} from '$lib/stores/battle-store';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;
	let { class: className, ...restProps }: Props = $props();

	function togglePin() {
		leftBarPinned.update((prev) => !prev);
	}

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

<div class={cn('absolute top-5 right-5 left-5 z-1000 flex justify-between', className)}>
	<!--左-->
	<div class="blur-backdrop flex items-center gap-3 rounded-lg p-3">
		<a
			href="/"
			class="-ml-1 inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-200/50 hover:text-stone-900"
			title="返回首页"
		>
			<ArrowLeft class="h-5 w-5" />
		</a>
		<Separator orientation="vertical" class="h-6" />
		<Button
			variant="ghost"
			class="cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white"
			size="icon"
			onclick={togglePin}
			title="切换侧边栏固定"
		>
			<PanelsTopLeft />
		</Button>
		<div class="flex gap-2">
			<MapTypeButton>标准</MapTypeButton>
			<MapTypeButton>地形</MapTypeButton>
			<MapTypeButton>卫星</MapTypeButton>
		</div>
		{#if $currentBattle}
			<Separator orientation="vertical" class="h-6" />
			<span class="text-sm font-medium text-stone-700">{$currentBattle.name}</span>
		{/if}
	</div>
	<!--右-->
	<div class="blur-backdrop flex items-center gap-3 rounded-lg p-3 text-sm text-stone-900">
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
		<div class="flex flex-col gap-1">
			<div class="status-label">当前阵营</div>
			<div class="status-value">{currentFactionName}</div>
		</div>
	</div>
</div>
