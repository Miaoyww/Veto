<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { UserPlus, Route, RefreshCw, PlusCircle, ChevronRight } from '@lucide/svelte';
	import {
		currentBattle,
		currentFactionId,
		selectedPlacedUnitId,
		interactionMode,
		addLog
	} from '$lib/stores/battle-store';
	import { leftBarPinned } from '$lib/stores/sidebar-store';
	import { startPendingRoute } from '$lib/stores/pending-route.store';

	interface Props {
		open: boolean;
		virtualAnchor: any;
	}

	let {
		open = $bindable(false),
		virtualAnchor
	}: Props = $props();

	function getOpen() {
		return open;
	}

	function setOpen(v: boolean) {
		open = v;
	}

	function handleSelectFaction(factionId: string) {
		currentFactionId.set(factionId);
		leftBarPinned.set(true);
		open = false;
	}

	function handleResetRoute() {
		const unitId = $selectedPlacedUnitId;
		if (unitId) {
			const unitName = $currentBattle?.factions
				.flatMap((f) => f.units)
				.find((u) => $currentBattle?.placedUnits.find((p) => p.id === unitId)?.unitId === u.id)?.name ?? '单位';
			startPendingRoute(unitId, unitName, 'reset');
			interactionMode.set('route');
			addLog('进入路线改设模式，点击地图添加新路线点');
		}
		open = false;
	}

	function handleAppendRoute() {
		const unitId = $selectedPlacedUnitId;
		if (unitId) {
			const unitName = $currentBattle?.factions
				.flatMap((f) => f.units)
				.find((u) => $currentBattle?.placedUnits.find((p) => p.id === unitId)?.unitId === u.id)?.name ?? '单位';
			startPendingRoute(unitId, unitName, 'append');
			interactionMode.set('route');
			addLog('进入路线追加模式，点击地图追加路线点');
		}
		open = false;
	}
</script>

<ContextMenu.Root bind:open={getOpen, setOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={virtualAnchor}
		>
			{#if $selectedPlacedUnitId}
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						<Route class="mr-2 size-4" />
						路线指令
						<ChevronRight class="ml-auto size-4 opacity-50" />
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent
						class="z-[10000] w-[200px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
						sideOffset={10}
					>
						<ContextMenu.Item
							class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
							onSelect={handleResetRoute}
						>
							<RefreshCw class="mr-2 size-4" />
							重新设置路线
							<span class="ml-auto text-xs opacity-50">清空并重绘</span>
						</ContextMenu.Item>
						<ContextMenu.Item
							class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
							onSelect={handleAppendRoute}
						>
							<PlusCircle class="mr-2 size-4" />
							绘制路线节点
							<span class="ml-auto text-xs opacity-50">继续追加</span>
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
			{/if}

			{#if $currentBattle && $currentBattle.factions.length > 0}
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						<UserPlus class="mr-2 size-4" />
						新建单位
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent
						class="z-[10000] w-[180px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
						sideOffset={10}
					>
						{#each $currentBattle.factions as faction (faction.id)}
							<ContextMenu.Item
								class="rounded-button flex h-9 items-center gap-2 py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
								onSelect={() => handleSelectFaction(faction.id)}
							>
								<span class="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style="background: {faction.color};"></span>
								{faction.name}
							</ContextMenu.Item>
						{/each}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
			{:else}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none opacity-50 focus-visible:outline-none"
					disabled
				>
					暂无阵营，请先创建阵营
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
