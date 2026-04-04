<script lang="ts">
	import { onMount, tick, mount } from 'svelte';
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import * as L from 'leaflet';
	import { coords, zoom, mapFlyTo } from '$lib/stores/map-store';
	import { ContextMenu, Portal } from 'bits-ui';
	import { CirclePlus, Trash2, Route, Target, Eye, ArrowRightLeft, MapPin, Navigation, X, Activity, UserPlus, LocateFixed } from '@lucide/svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import UnitPopup from './unit-popup.svelte';
	import StrikeCard from './strike-card.svelte';
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
		addLog,
		undo
	} from '$lib/stores/battle-store';
	import { leftBarPinned } from '$lib/stores/sidebar-store';
	import {
		BRANCH_LABELS,
		UNIT_STATUS_LABELS
	} from '$lib/types';
	import type { MilitaryUnit, PlacedUnit, Faction } from '$lib/types';

	let map: L.Map;
	let myOpen = $state(false);
	let contextPlacedUnitId: string | null = $state(null);

	// 空白处右键菜单
	let mapMenuOpen = $state(false);
	let mapVirtualAnchor: any = $state(null);

	let virtualAnchor: any = $state(null);

	// 打击目标浮动卡片
	let strikeDialogOpen = $state(false);
	let strikePendingUnitId: string | null = $state(null);
	let strikePendingTarget: { lat: number; lng: number } | null = $state(null);
	let strikePendingRadius = $state(5000);
	let strikePreviewCircle: L.Circle | null = null;
	// 鼠标跟踪
	let strikeMouseX = $state(0);
	let strikeMouseY = $state(0);
	let strikePinnedX = $state(0);
	let strikePinnedY = $state(0);
	let strikeHoverMarker: L.CircleMarker | null = null;

	// 地图上的图层引用
	let markersLayer: L.LayerGroup;
	let routesLayer: L.LayerGroup;
	let rangesLayer: L.LayerGroup;
	const markersMap: Record<string, L.Marker> = {};

	function getOpen() {
		return myOpen;
	}

	function setOpen(newOpen: boolean) {
		myOpen = newOpen;
	}

	// 构建单位 Popup 内容节点
	function createPopupElement(unit: MilitaryUnit, faction: Faction, placed: PlacedUnit): HTMLElement {
		const el = document.createElement('div');
		mount(UnitPopup, { target: el, props: { unit, faction, placed } });
		return el;
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
		for (const key in markersMap) delete markersMap[key];

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
			marker.bindPopup(createPopupElement(unit, faction, placed));

			// 点击选中
			marker.on('click', () => {
				selectedPlacedUnitId.set(placed.id);
			});

			// 拖拽结束更新位置
			marker.on('dragend', (e) => {
				const latlng = (e.target as L.Marker).getLatLng();
				updatePlacedUnit(placed.id, { lat: latlng.lat, lng: latlng.lng }, `移动单位: ${info.unit.name}`);
				addLog(`移动单位: ${info.unit.name} → (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`);
			});

			// 右键上下文菜单绑定
			marker.on('contextmenu', (e) => {
				L.DomEvent.stopPropagation(e);
				contextPlacedUnitId = placed.id;
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
				setOpen(true);
			});

			markersMap[placed.id] = marker;
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
				const center = placed.strikeTarget
					? ([placed.strikeTarget.lat, placed.strikeTarget.lng] as L.LatLngExpression)
					: ([placed.lat, placed.lng] as L.LatLngExpression);
				const circle = L.circle(center, {
					radius: placed.strikeRadius,
					color: faction.color,
					weight: 1,
					fillColor: faction.color,
					fillOpacity: 0.08,
					dashArray: '4 4'
				});
				rangesLayer.addLayer(circle);
				// 从单位到打击目标的连线
				if (placed.strikeTarget) {
					const line = L.polyline(
						[[placed.lat, placed.lng], [placed.strikeTarget.lat, placed.strikeTarget.lng]],
						{ color: faction.color, weight: 1, opacity: 0.5, dashArray: '4 4' }
					);
					rangesLayer.addLayer(line);
					const dot = L.circleMarker([placed.strikeTarget.lat, placed.strikeTarget.lng], {
						radius: 4,
						color: faction.color,
						fillColor: faction.color,
						fillOpacity: 0.9
					});
					rangesLayer.addLayer(dot);
				}
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

	// 响应外部定位请求
	$effect(() => {
		const pos = $mapFlyTo;
		if (!pos || !map) return;
		map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 10), { duration: 1 });
		Promise.resolve().then(() => mapFlyTo.set(null));
	});

	onMount(async () => {
		const readyMap = await waitForMapReady();

		markersLayer = L.layerGroup().addTo(readyMap);
		routesLayer = L.layerGroup().addTo(readyMap);
		rangesLayer = L.layerGroup().addTo(readyMap);

		readyMap.on('mousemove', (e) => {
			coords.set(e.latlng);
			strikeMouseX = e.originalEvent.clientX;
			strikeMouseY = e.originalEvent.clientY;

			if ($interactionMode === 'strike') {
				if (!strikePendingTarget) {
					// 阶段1：红点跟随光标
					if (!strikeHoverMarker) {
						strikeHoverMarker = L.circleMarker(e.latlng, {
							radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2
						}).addTo(readyMap);
					} else {
						strikeHoverMarker.setLatLng(e.latlng);
					}
				} else {
					// 阶段2：鼠标到目标距离实时更新半径
					const dist = readyMap.distance(
						[strikePendingTarget.lat, strikePendingTarget.lng],
						e.latlng
					);
					if (dist > 100) strikePendingRadius = Math.round(dist);
				}
			} else if (strikeHoverMarker && !strikePendingTarget) {
				strikeHoverMarker.remove();
				strikeHoverMarker = null;
			}
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
				const placedId = $selectedPlacedUnitId;
				if (placedId) {
					if (!strikePendingTarget) {
						// 阶段1 → 阶段2：第一次点击，选定目标坐标，卡片开始跟随鼠标
						strikePendingUnitId = placedId;
						strikePendingTarget = { lat: latlng.lat, lng: latlng.lng };
						strikePendingRadius = 5000;
						if (strikeHoverMarker) { strikeHoverMarker.remove(); strikeHoverMarker = null; }
						strikeHoverMarker = L.circleMarker([latlng.lat, latlng.lng], {
							radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2
						}).addTo(readyMap);
					} else {
						// 阶段2 → 阶段3：第二次点击，固定卡片
						const CARD_W = 256, CARD_H = 220;
						const cx = e.originalEvent.clientX, cy = e.originalEvent.clientY;
						let px = cx + 16;
						let py = cy - CARD_H / 2;
						if (px + CARD_W > window.innerWidth - 8) px = cx - CARD_W - 16;
						if (py < 8) py = 8;
						if (py + CARD_H > window.innerHeight - 8) py = window.innerHeight - CARD_H - 8;
						strikePinnedX = px;
						strikePinnedY = py;
						strikeDialogOpen = true;
						interactionMode.set('select');
					}
				}
			} else {
				// 选择模式：点击空白处取消选中
				selectedPlacedUnitId.set(null);
			}
		});

		readyMap.on('contextmenu', (e) => {
			e.originalEvent.preventDefault();
			// 空白处右键：打开地图菜单
			mapVirtualAnchor = {
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
			mapMenuOpen = true;
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
			addLog('点击地图选择打击目标位置');
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleCancelStrike() {
		strikeDialogOpen = false;
		strikePendingTarget = null;
		strikePendingUnitId = null;
		interactionMode.set('select');
		if (strikeHoverMarker) { strikeHoverMarker.remove(); strikeHoverMarker = null; }
	}

	function handleConfirmStrike() {
		if (strikePendingUnitId && strikePendingTarget) {
			updatePlacedUnit(strikePendingUnitId, {
				strikeTarget: strikePendingTarget,
				strikeRadius: strikePendingRadius
			}, '设置打击目标');
			addLog(
				`设置打击目标 (${strikePendingTarget.lat.toFixed(3)}°N, ${strikePendingTarget.lng.toFixed(3)}°E)，半径 ${(strikePendingRadius / 1000).toFixed(1)} km`
			);
		}
		strikeDialogOpen = false;
		strikePendingUnitId = null;
		strikePendingTarget = null;
		if (strikeHoverMarker) { strikeHoverMarker.remove(); strikeHoverMarker = null; }
	}

	// 路线完成日志：当交互模式从 route 切换到其他模式时记录
	let _prevInteractionMode: string = 'select';
	$effect(() => {
		const mode = $interactionMode;
		if (_prevInteractionMode === 'route' && mode !== 'route') {
			const placed = $selectedPlacedUnit;
			if (placed && placed.route.length > 0) {
				const routeInfo = findUnit(placed.unitId);
				addLog(`完成行动路线: ${routeInfo?.unit.name ?? ''}，共 ${placed.route.length} 个节点`);
			}
		}
		_prevInteractionMode = mode;
	});

	// 打击目标预览圆：阶段2和3都显示，跟随半径变化
	$effect(() => {
		if (strikePendingTarget && map) {
			const { lat, lng } = strikePendingTarget;
			const r = strikePendingRadius;
			if (!strikePreviewCircle) {
				strikePreviewCircle = L.circle([lat, lng], {
					radius: r,
					color: '#ef4444',
					weight: 2,
					fillColor: '#ef4444',
					fillOpacity: 0.12,
					dashArray: '6 4'
				}).addTo(map);
			} else {
				strikePreviewCircle.setRadius(r);
			}
		} else {
			if (strikePreviewCircle) {
				strikePreviewCircle.remove();
				strikePreviewCircle = null;
			}
		}
	});

	function handleViewProperties() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			selectedPlacedUnitId.set(targetId);
			const marker = markersMap[targetId];
			if (marker) {
				marker.openPopup();
			}
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleLocateUnit() {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			const placed = $currentBattle?.placedUnits.find((u) => u.id === targetId);
			if (placed && map) {
				map.flyTo([placed.lat, placed.lng], Math.max(map.getZoom(), 8), { duration: 1 });
			}
			selectedPlacedUnitId.set(targetId);
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	function handleSetStatus(status: PlacedUnit['status']) {
		const targetId = contextPlacedUnitId || $selectedPlacedUnitId;
		if (targetId) {
			updatePlacedUnit(targetId, { status }, `单位状态变更: ${UNIT_STATUS_LABELS[status]}`);
			addLog(`单位状态变更: ${UNIT_STATUS_LABELS[status]}`);
		}
		contextPlacedUnitId = null;
		setOpen(false);
	}

	// 空白处右键：选择势力后打开左侧栏并切换势力
	function handleSelectFactionForNewUnit(factionId: string) {
		currentFactionId.set(factionId);
		leftBarPinned.set(true);
		mapMenuOpen = false;
	}
</script>

<!-- 单位处右键菜单 -->
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

				<!-- 定位单位 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleLocateUnit}
				>
					<LocateFixed class="mr-2 size-4" />
					定位单位
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

				<!-- 设置打击目标 -->
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={handleSetStrikeRange}
				>
					<Target class="mr-2 size-4" />
					设置打击目标
				</ContextMenu.Item>

				<!-- 设置状态子菜单 -->
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						<Activity class="mr-2 size-4" />
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

<!-- 空白处右键菜单 -->
<ContextMenu.Root bind:open={mapMenuOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={mapVirtualAnchor}
		>
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
								onSelect={() => handleSelectFactionForNewUnit(faction.id)}
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
		<div class="absolute top-20 left-1/2 z-[1001] -translate-x-1/2">
			<div class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/90 px-4 py-2.5 shadow-md backdrop-blur-sm">
				{#if $interactionMode === 'place'}
					<MapPin class="h-4 w-4 text-stone-600" />
					<span class="text-sm text-stone-700">点击地图放置单位</span>
				{:else if $interactionMode === 'route'}
					<Navigation class="h-4 w-4 text-stone-600" />
					<span class="text-sm text-stone-700">点击地图添加路线点（右键结束）</span>
				{:else if $interactionMode === 'strike'}
					<Target class="h-4 w-4 text-stone-600" />
					<span class="text-sm text-stone-700">
						{strikePendingTarget ? '再次点击地图确认打击半径' : '点击地图选择打击目标位置'}
					</span>
				{/if}
				<div class="mx-1 h-4 w-px bg-stone-200"></div>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 gap-1.5 px-2 text-xs text-stone-500 hover:text-stone-800"
					onclick={() => { interactionMode.set('select'); pendingPlaceUnitId.set(null); }}
				>
					<X class="h-3 w-3" />
					取消
					<Kbd.Root class="ml-0.5 text-[10px]">Esc</Kbd.Root>
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- 打击目标浮动卡片 -->
{#if strikePendingTarget}
	<StrikeCard
		phase={strikeDialogOpen ? 'pinned' : 'tracking'}
		target={strikePendingTarget}
		bind:radius={strikePendingRadius}
		x={strikeDialogOpen ? strikePinnedX : strikeMouseX + 18}
		y={strikeDialogOpen ? strikePinnedY : strikeMouseY - 18}
		oncancel={handleCancelStrike}
		onconfirm={handleConfirmStrike}
	/>
{/if}

<svelte:window
	onkeydown={(e) => {
		if (e.ctrlKey && e.key === 'z') {
			const target = e.target as HTMLElement;
			if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
				e.preventDefault();
				undo();
			}
			return;
		}
		if (e.key === 'Escape') {
			if (strikePendingTarget) {
				handleCancelStrike();
			} else {
				interactionMode.set('select');
				pendingPlaceUnitId.set(null);
			}
		}
	}}
/>

