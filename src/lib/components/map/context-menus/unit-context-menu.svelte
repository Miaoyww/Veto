<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import {
		Eye,
		LocateFixed,
		Route,
		RefreshCw,
		PlusCircle,
		ChevronRight,
		Eraser,
		Target,
		Activity,
		Trash2,
		Check
	} from '@lucide/svelte';
	import { UNIT_STATUS_LABELS } from '$lib/types';
	import type { PlacedUnit } from '$lib/types';
	import * as L from 'leaflet';
	import {
		currentBattle,
		selectedPlacedUnitId,
		interactionMode,
		clearRoute,
		updatePlacedUnit,
		removePlacedUnit,
		removeUnit,
		addLog,
		runtimePositions
	} from '$lib/stores/battle-store';
	import { gameClock } from '$lib/stores/game-clock.store';
	import { startPendingRoute } from '$lib/stores/pending-route.store';

	interface Props {
		open: boolean;
		virtualAnchor: any;
		contextUnitId: string | null;
		map: L.Map;
		markersMap: Record<string, L.Marker>;
	}

	let {
		open = $bindable(false),
		virtualAnchor,
		contextUnitId = $bindable(null),
		map,
		markersMap
	}: Props = $props();

	const STATUS_LIST = ['idle', 'moving', 'attacking', 'defending', 'retreating'] as const;

	let currentStatus = $derived(
		$currentBattle?.placedUnits.find((u) => u.id === (contextUnitId || $selectedPlacedUnitId))
			?.status
	);

	let hasUnit = $derived(!!(contextUnitId || $selectedPlacedUnitId));

	let isDestroyed = $derived(
		(() => {
			const id = contextUnitId || $selectedPlacedUnitId;
			if (!id) return false;
			const rt = $runtimePositions[id];
			if (rt) return rt.status === 'destroyed' || rt.hp <= 0;
			return currentStatus === 'destroyed';
		})()
	);

	/** 只有能远程打击的单位（陆军导弹分队、海军、空军轰炸机）才有"设置打击目标"菜单项 */
	let canSetStrikeTarget = $derived(
		(() => {
			const id = contextUnitId || $selectedPlacedUnitId;
			if (!id || isDestroyed) return false;
			const placed = $currentBattle?.placedUnits.find((p) => p.id === id);
			if (!placed) return false;
			const unit = $currentBattle?.factions.flatMap((f) => f.units).find((u) => u.id === placed.unitId);
			if (!unit) return false;
			if (unit.branch === 'army') return unit.missiles.length > 0;
			if (unit.branch === 'navy') return true; // 海军舰艇/潜艇均可打击
			if (unit.branch === 'air_force') return unit.bombers.length > 0;
			return false;
		})()
	);

	function getOpen() {
		return open;
	}

	function setOpen(v: boolean) {
		open = v;
	}

	function handleViewProperties() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			const marker = markersMap[targetId];
			if (marker) marker.openPopup();
		}
		contextUnitId = null;
		open = false;
	}

	function handleLocateUnit() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			const placed = $currentBattle?.placedUnits.find((u) => u.id === targetId);
			if (placed && map) {
				map.flyTo([placed.lat, placed.lng], Math.max(map.getZoom(), 8), { duration: 1 });
			}
			selectedPlacedUnitId.set(targetId);
		}
		contextUnitId = null;
		open = false;
	}

	function handleResetRoute() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			const placed = $currentBattle?.placedUnits.find((p) => p.id === targetId);
			const unitName =
				$currentBattle?.factions.flatMap((f) => f.units).find((u) => u.id === placed?.unitId)
					?.name ?? '单位';
			if (!$gameClock.isPaused) {
				// 推演运行中：pending 预设流程，Esc 后再确认
				startPendingRoute(targetId, unitName, 'reset');
				addLog('路线改设指令已录入，绘制完成后确认生效');
			} else {
				// 推演暂停：直接清除旧路线，点击即生效
				clearRoute(targetId);
				addLog('已清除路线，点击地图直接添加新路线点');
			}
			interactionMode.set('route');
		}
		contextUnitId = null;
		open = false;
	}

	function handleAppendRoute() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			const placed = $currentBattle?.placedUnits.find((p) => p.id === targetId);
			const unitName =
				$currentBattle?.factions.flatMap((f) => f.units).find((u) => u.id === placed?.unitId)
					?.name ?? '单位';
			if (!$gameClock.isPaused) {
				// 推演运行中：pending 预设流程
				startPendingRoute(targetId, unitName, 'append');
				addLog('路线追加指令已录入，绘制完成后确认生效');
			} else {
				// 推演暂停：点击即追加
				addLog('点击地图直接追加路线节点');
			}
			interactionMode.set('route');
		}
		contextUnitId = null;
		open = false;
	}

	function handleClearRoute() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			const placed = $currentBattle?.placedUnits.find((p) => p.id === targetId);
			const unitName =
				$currentBattle?.factions.flatMap((f) => f.units).find((u) => u.id === placed?.unitId)
					?.name ?? '单位';
			clearRoute(targetId);
			addLog(`清除路线: ${unitName}`);
		}
		contextUnitId = null;
		open = false;
	}

	function handleSetStrikeRange() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			interactionMode.set('strike');
			addLog('点击地图选择打击目标位置');
		}
		contextUnitId = null;
		open = false;
	}

	function handleSetStatus(status: PlacedUnit['status']) {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			updatePlacedUnit(targetId, { status }, `单位状态变更: ${UNIT_STATUS_LABELS[status]}`);
			addLog(`单位状态变更: ${UNIT_STATUS_LABELS[status]}`);
		}
		contextUnitId = null;
		open = false;
	}

	function handleDeletePlaced() {
		const targetId = contextUnitId || $selectedPlacedUnitId;
		if (targetId) {
			const placed = $currentBattle?.placedUnits.find((u) => u.id === targetId);
			if (placed) {
				removeUnit(placed.factionId, placed.unitId);
			}
		}
		contextUnitId = null;
		open = false;
	}
</script>

<ContextMenu.Root bind:open={getOpen, setOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={virtualAnchor}
		>
			{#if hasUnit}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleViewProperties}
				>
					<Eye class="mr-2 size-4" />
					查看属性
				</ContextMenu.Item>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleLocateUnit}
				>
					<LocateFixed class="mr-2 size-4" />
					定位单位
				</ContextMenu.Item>

				<div hidden={isDestroyed}>
					<!-- 路线指令 -->
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger
							class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 data-highlighted:bg-muted data-[state=open]:bg-muted"
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
							<ContextMenu.Item
								class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal text-destructive select-none focus-visible:outline-none data-highlighted:bg-muted"
								onSelect={handleClearRoute}
							>
								<Eraser class="mr-2 size-4" />
								清除路线
							</ContextMenu.Item>
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
					<!-- 设置打击目标（仅导弹/海军/轰炸机单位） -->
					{#if canSetStrikeTarget}
					<ContextMenu.Item
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 data-highlighted:bg-muted"
						onSelect={handleSetStrikeRange}
					>
						<Target class="mr-2 size-4" />
						设置打击目标
					</ContextMenu.Item>
					{/if}

					<!-- 设置状态子菜单 -->
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger
							class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 data-highlighted:bg-muted data-[state=open]:bg-muted"
						>
							<Activity class="mr-2 size-4" />
							设置状态
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent
							class="z-100 w-[160px] rounded-xl border border-muted bg-background px-1 py-1.5 ring-0! shadow-popover ring-transparent!"
							sideOffset={10}
						>
							{#each STATUS_LIST as status}
								<ContextMenu.Item
									class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
									onSelect={() => handleSetStatus(status)}
								>
									<Check
										class="mr-2 size-4 {currentStatus === status ? 'opacity-100' : 'opacity-0'}"
									/>
									{UNIT_STATUS_LABELS[status]}
								</ContextMenu.Item>
							{/each}
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
				</div>

				<!-- 删除单位 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal text-red-500 select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleDeletePlaced}
				>
					<Trash2 class="mr-2 size-4" />
					删除单位
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
