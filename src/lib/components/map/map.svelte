<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import * as L from 'leaflet';
	import { coords, zoom } from '$lib/stores/map-store';
	import { ContextMenu, Portal } from 'bits-ui';
	import { CirclePlus, Trash2, Route, Target, Eye, ArrowRightLeft } from '@lucide/svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import {
		currentBattle,
		currentFactionId,
		interactionMode,
		pendingPlaceUnitId,
		placeUnit,
		removePlacedUnit,
		selectedPlacedUnitId,
		selectedPlacedUnit,
		addRoutePoint,
		clearRoute,
		updatePlacedUnit,
		addLog
	} from '$lib/stores/battle-store';
	import {
		BRANCH_LABELS,
		UNIT_STATUS_LABELS
	} from '$lib/types';
	import type { MilitaryUnit, PlacedUnit, Faction } from '$lib/types';

	let map: L.Map;
	let myOpen = $state(false);
	let contextLatLng: L.LatLng | null = $state(null);
	let contextPlacedUnitId: string | null = $state(null);

	let menuX = $state(0);
	let menuY = $state(0);

	let virtualAnchor: any = null;

	// 地图上的图层引用
	let markersLayer: L.LayerGroup;
	let routesLayer: L.LayerGroup;
	let rangesLayer: L.LayerGroup;

	function getOpen() {
		return myOpen;
	}

	function setOpen(newOpen: boolean) {
		myOpen = newOpen;
	}

	// 查找单位信息
	function findUnit(unitId: string): { unit: MilitaryUnit; faction: Faction } | null {
		const battle = $currentBattle;
		if (!battle) return null;
		for (const faction of battle.factions) {
			const unit = faction.units.find((u) => u.id === unitId);
			if (unit) return { unit, faction };
		}
		return null;
	}

	// 获取军种图标
	function getBranchIcon(branch: string, color: string): L.DivIcon {
		const icons: Record<string, string> = {
			army: '🪖',
			navy: '⚓',
			air_force: '✈️'
		};
		return L.divIcon({
			html: `<div style="
				background: ${color};
				border: 2px solid white;
				border-radius: 50%;
				width: 32px;
				height: 32px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 16px;
				box-shadow: 0 2px 6px rgba(0,0,0,0.4);
				cursor: pointer;
			">${icons[branch] || '⚔️'}</div>`,
			iconSize: [32, 32],
			iconAnchor: [16, 16],
			className: ''
		});
	}

	// 渲染所有地图元素
	function renderMapElements() {
		if (!map || !markersLayer) return;

		markersLayer.clearLayers();
		routesLayer.clearLayers();
		rangesLayer.clearLayers();

		const battle = $currentBattle;
		if (!battle) return;

		for (const placed of battle.placedUnits) {
			const info = findUnit(placed.unitId);
			if (!info) continue;

			const { unit, faction } = info;

			// 标记
			const marker = L.marker([placed.lat, placed.lng], {
				icon: getBranchIcon(unit.branch, faction.color),
				draggable: $interactionMode === 'select'
			});

			// 弹出窗口
			marker.bindPopup(`
				<div style="min-width: 150px;">
					<strong>${unit.name}</strong><br/>
					<span style="color: ${faction.color};">●</span> ${faction.name} · ${BRANCH_LABELS[unit.branch]}<br/>
					<small>状态: ${UNIT_STATUS_LABELS[placed.status]}</small>
				</div>
			`);

			// 点击选中
			marker.on('click', () => {
				selectedPlacedUnitId.set(placed.id);
			});

			// 拖拽结束更新位置
			marker.on('dragend', (e) => {
				const latlng = (e.target as L.Marker).getLatLng();
				updatePlacedUnit(placed.id, { lat: latlng.lat, lng: latlng.lng });
			});

			// 右键上下文菜单绑定
			marker.on('contextmenu', (e) => {
				L.DomEvent.stopPropagation(e);
				contextPlacedUnitId = placed.id;
			});

			markersLayer.addLayer(marker);

			// 高亮选中
			if (placed.id === $selectedPlacedUnitId) {
				const highlight = L.circleMarker([placed.lat, placed.lng], {
					radius: 20,
					color: faction.color,
					weight: 2,
					fillColor: faction.color,
					fillOpacity: 0.15,
					dashArray: '4 4'
				});
				markersLayer.addLayer(highlight);
			}

			// 行动路线
			if (placed.route.length > 0) {
				const routePoints: L.LatLngExpression[] = [
					[placed.lat, placed.lng],
					...placed.route
				];
				const polyline = L.polyline(routePoints, {
					color: faction.color,
					weight: 3,
					opacity: 0.7,
					dashArray: '8 6'
				});
				routesLayer.addLayer(polyline);

				// 路线终点箭头标记
				const lastPoint = placed.route[placed.route.length - 1];
				const endMarker = L.circleMarker([lastPoint[0], lastPoint[1]], {
					radius: 5,
					color: faction.color,
					fillColor: faction.color,
					fillOpacity: 0.8
				});
				routesLayer.addLayer(endMarker);
			}

			// 打击范围
			if (placed.strikeRadius > 0) {
				const circle = L.circle([placed.lat, placed.lng], {
					radius: placed.strikeRadius,
					color: faction.color,
					weight: 1,
					fillColor: faction.color,
					fillOpacity: 0.08,
					dashArray: '4 4'
				});
				rangesLayer.addLayer(circle);
			}
		}
	}

	// 响应式更新地图
	$effect(() => {
		// 读取依赖以触发响应
		$currentBattle;
		$selectedPlacedUnitId;
		$interactionMode;
		renderMapElements();
	});

	onMount(async () => {
		const readyMap = await waitForMapReady();

		markersLayer = L.layerGroup().addTo(readyMap);
		routesLayer = L.layerGroup().addTo(readyMap);
		rangesLayer = L.layerGroup().addTo(readyMap);

		readyMap.on('mousemove', (e) => {
			coords.set(e.latlng);
		});
		readyMap.on('zoomend', () => {
			zoom.set(readyMap.getZoom());
		});

		// 地图点击事件
		readyMap.on('click', (e) => {
			const mode = $interactionMode;
			const latlng = e.latlng;

			if (mode === 'place') {
				// 放置模式：将待放置单位放到地图上
				const unitId = $pendingPlaceUnitId;
				const factionId = $currentFactionId;
				if (unitId && factionId) {
					placeUnit(unitId, factionId, latlng.lat, latlng.lng);
					pendingPlaceUnitId.set(null);
					interactionMode.set('select');
				}
			} else if (mode === 'route') {
				// 路线模式：为选中单位添加路线点
				const placedId = $selectedPlacedUnitId;
				if (placedId) {
					addRoutePoint(placedId, latlng.lat, latlng.lng);
				}
			} else if (mode === 'strike') {
				// 打击范围模式：以点击位置到单位距离设置打击范围
				const placed = $selectedPlacedUnit;
				if (placed) {
					const dist = readyMap.distance([placed.lat, placed.lng], latlng);
					updatePlacedUnit(placed.id, { strikeRadius: Math.round(dist) });
					interactionMode.set('select');
				}
			} else {
				// 选择模式：点击空白处取消选中
				selectedPlacedUnitId.set(null);
			}
		});

		readyMap.on('contextmenu', async (e) => {
			contextLatLng = e.latlng;
			virtualAnchor = {
				getBoundingClientRect: () => ({
					width: 0,
					height: 0,
					top: e.originalEvent.clientY,
					bottom: e.originalEvent.clientY,
					left: e.originalEvent.clientX,
					right: e.originalEvent.clientX
				}),
				contextElement: document.body
			};

			const rect = (readyMap.getContainer() as HTMLDivElement).getBoundingClientRect();
			menuX = e.originalEvent.clientX - rect.left;
			menuY = e.originalEvent.clientY - rect.top;

			setOpen(true);
		});

		renderMapElements();
	});

	async function waitForMapReady() {
		while (!map) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		return map;
	}

	// 上下文菜单操作
	function handleDeletePlaced() {
		if (contextPlacedUnitId) {
			removePlacedUnit(contextPlacedUnitId);
			contextPlacedUnitId = null;
		} else if ($selectedPlacedUnitId) {
			removePlacedUnit($selectedPlacedUnitId);
		}
		setOpen(false);
	}

	function handleDrawRoute() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			interactionMode.set('route');
			addLog('进入路线绘制模式，点击地图添加路线点');
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleClearRoute() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			clearRoute(targetId);
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleSetStrikeRange() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			interactionMode.set('strike');
			addLog('进入打击范围模式，点击地图设置范围');
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleViewProperties() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleSetStatus(status: PlacedUnit['status']) {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			updatePlacedUnit(targetId, { status });
			addLog(`单位状态变更: ${UNIT_STATUS_LABELS[status]}`);
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}
</script>

<ContextMenu.Root bind:open={getOpen, setOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={virtualAnchor}
		>
			<!-- 查看属性 -->
			{#if $selectedPlacedUnitId || contextPlacedUnitId}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleViewProperties}
				>
					<Eye class="mr-2 size-4" />
					查看属性
				</ContextMenu.Item>

				<!-- 绘制路线 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleDrawRoute}
				>
					<Route class="mr-2 size-4" />
					绘制行动路线
				</ContextMenu.Item>

				<!-- 清除路线 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleClearRoute}
				>
					<ArrowRightLeft class="mr-2 size-4" />
					清除路线
				</ContextMenu.Item>

				<!-- 设置打击范围 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleSetStrikeRange}
				>
					<Target class="mr-2 size-4" />
					设置打击范围
				</ContextMenu.Item>

				<!-- 设置状态子菜单 -->
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						设置状态
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent
						class="z-100 w-[160px] rounded-xl border border-muted bg-background px-1 py-1.5 ring-0! shadow-popover ring-transparent!"
						sideOffset={10}
					>
						{#each (['idle', 'moving', 'attacking', 'defending', 'retreating'] as const) as status}
							<ContextMenu.Item
								class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
								onSelect={() => handleSetStatus(status)}
							>
								{UNIT_STATUS_LABELS[status]}
							</ContextMenu.Item>
						{/each}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>

				<!-- 删除 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal text-red-500 select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleDeletePlaced}
				>
					<Trash2 class="mr-2 size-4" />
					删除单位
				</ContextMenu.Item>
			{:else}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none opacity-50 focus-visible:outline-none"
					disabled
				>
					右键单位查看更多操作
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>

<div class="relative h-full w-full">
	<Map
		bind:instance={map}
		options={{
			center: [35, 105],
			zoom: $zoom,
			zoomControl: false
		}}
	>
		<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
	</Map>

	<!-- 交互模式提示 -->
	{#if $interactionMode !== 'select'}
		<div class="mode-banner">
			{#if $interactionMode === 'place'}
				📍 点击地图放置单位
			{:else if $interactionMode === 'route'}
				🗺️ 点击地图添加路线点 (右键结束)
			{:else if $interactionMode === 'strike'}
				🎯 点击地图设置打击范围
			{/if}
			<button class="cancel-btn" onclick={() => { interactionMode.set('select'); pendingPlaceUnitId.set(null); }}>
				取消 (Esc)
			</button>
		</div>
	{/if}
</div>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			interactionMode.set('select');
			pendingPlaceUnitId.set(null);
		}
	}}
/>

<style>
	.mode-banner {
		position: absolute;
		top: 80px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1001;
		background: rgba(0, 0, 0, 0.75);
		color: white;
		padding: 8px 20px;
		border-radius: 8px;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 12px;
		backdrop-filter: blur(4px);
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 4px 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.25);
	}
</style>
