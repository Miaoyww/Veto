<script lang="ts">
	import { onMount, tick, mount } from 'svelte';
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import * as L from 'leaflet';
	import { coords, zoom, mapFlyTo } from '$lib/stores/map-store';
	import UnitContextMenu from './unit-context-menu.svelte';
	import MapContextMenu from './map-context-menu.svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import UnitPopup from './unit-popup.svelte';
	import StrikeCard from './strike-card.svelte';
	import InteractionModeHint from './interaction-mode-hint.svelte';
	import RouteConfirmCard from './route-confirm-card.svelte';
	import {
		currentBattle,
		currentFactionId,
		interactionMode,
		pendingPlaceUnitId,
		placeUnit,
		selectedPlacedUnitId,
		selectedPlacedUnit,
		addRoutePoint,
		updatePlacedUnit,
		addLog,
		undo
	} from '$lib/stores/battle-store';
	import { gameClock } from '$lib/stores/game-clock.store';
	import {
		pendingRoute,
		addPendingPoint,
		cancelPendingRoute
	} from '$lib/stores/pending-route.store';
	import type { MilitaryUnit, PlacedUnit, Faction, NatoUnitType, UnitSide } from '$lib/types';
	import { getMilSymbolSVG, getMilSymbolAnchor } from '$lib/utils/milsymbol-utils';

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

	// 待确认路线确认卡开关
	let routeConfirmOpen = $state(false);

	// 地图上的图层引用
	let markersLayer: L.LayerGroup;
	let routesLayer: L.LayerGroup;
	let rangesLayer: L.LayerGroup;
	let pendingLayer: L.LayerGroup;
	const markersMap: Record<string, L.Marker> = {};

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

	// 从 MilitaryUnit 推导北约单位类型
	function deriveNatoType(unit: MilitaryUnit): NatoUnitType {
		if (unit.branch === 'navy') return 'navy';
		if (unit.branch === 'air_force') return 'aviation';
		// 陆军：按主力组成决定类型
		const armorCount = unit.armor.reduce((s, c) => s + c.count, 0);
		const infantryCount = unit.infantry.reduce((s, c) => s + c.count, 0);
		const missileCount = unit.missiles.reduce((s, c) => s + c.count, 0);
		if (missileCount > armorCount && missileCount > infantryCount) return 'artillery';
		if (armorCount > 0 && infantryCount > 0) return 'mechanized';
		if (armorCount > infantryCount) return 'armor';
		return 'infantry';
	}

	// 生成北约风格 DivIcon（含 HP/Org 进度条）—— 使用 milsymbol 标准符号
	function getNatoIcon(
		unit: MilitaryUnit,
		faction: Faction,
		placed: PlacedUnit,
		selected: boolean
	): L.DivIcon {
		const side: UnitSide = faction.side ?? 'blue';
		const natoType: NatoUnitType = placed.natoType ?? deriveNatoType(unit);

		// milsymbol 生成符号 SVG（size=35 适合地图标记，使用阵营颜色）
		const symSvg = getMilSymbolSVG(natoType, side, 35, faction.color);
		const anchor = getMilSymbolAnchor(natoType, side, 35);

		// 进度条
		const hpPct = placed.maxHp > 0 ? Math.max(0, Math.min(1, placed.hp / placed.maxHp)) : 1;
		const orgPct = placed.maxOrg > 0 ? Math.max(0, Math.min(1, placed.org / placed.maxOrg)) : 1;
		const hpW = Math.round(56 * hpPct);
		const orgW = Math.round(56 * orgPct);
		const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';

		// 选中高亮环
		const selRing = selected
			? `<div style="position:absolute;inset:0;border-radius:4px;box-shadow:0 0 0 3px rgba(59,130,246,0.7);pointer-events:none;"></div>`
			: '';

		const html = `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;position:relative;">
			${selRing}
			<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));">
				${symSvg}
			</div>
			<div style="width:56px;height:4px;background:rgba(0,0,0,0.18);border-radius:2px;margin-top:2px;overflow:hidden;">
				<div style="width:${hpW}px;height:4px;background:${hpColor};border-radius:2px;"></div>
			</div>
			<div style="width:56px;height:4px;background:rgba(0,0,0,0.18);border-radius:2px;margin-top:2px;overflow:hidden;">
				<div style="width:${orgW}px;height:4px;background:#eab308;border-radius:2px;"></div>
			</div>
		</div>`;

		return L.divIcon({
			html,
			iconSize: [anchor.x * 2, anchor.y * 2 + 12],
			iconAnchor: [anchor.x, anchor.y],
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
				icon: getNatoIcon(unit, faction, placed, placed.id === $selectedPlacedUnitId),
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
				mapMenuOpen = false;
				myOpen = true;
			});

			markersMap[placed.id] = marker;
			markersLayer.addLayer(marker);

			// 行动路线
			if (placed.route.length > 0) {
				const routePoints: L.LatLngExpression[] = [
					[placed.lat, placed.lng],
					...placed.route
				];
				const polyline = L.polyline(routePoints, {
					color: faction.color,
					weight: 3,
					opacity: 0.7
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
		pendingLayer = L.layerGroup().addTo(readyMap);

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
				if ($pendingRoute) {
					// 推演运行中：写入 pending，不立刻提交
					addPendingPoint(latlng.lat, latlng.lng);
				} else {
					// 推演暂停：直接写入路线
					const placedId = $selectedPlacedUnitId;
					if (placedId) addRoutePoint(placedId, latlng.lat, latlng.lng);
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
			myOpen = false;
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

	// 监听路线模式退出：当 pending 有节点时弹出确认卡片
	let _prevInteractionMode: string = 'select';
	$effect(() => {
		const mode = $interactionMode;
		if (_prevInteractionMode === 'route' && mode !== 'route') {
			if ($pendingRoute && $pendingRoute.points.length > 0) {
				routeConfirmOpen = true;
			} else {
				cancelPendingRoute();
			}
		}
		_prevInteractionMode = mode;
	});

	// Leaflet pending 虚线实时渲染
	$effect(() => {
		// 先读取响应式依赖（必须在任何 return 之前），否则 Svelte 5 无法追踪
		const pr = $pendingRoute;
		const battle = $currentBattle;
		if (!pendingLayer) return;
		pendingLayer.clearLayers();
		if (!pr || pr.points.length === 0) return;

		const placed = battle?.placedUnits.find((p) => p.id === pr.placedId);
		const startPoint: [number, number] =
			pr.type === 'append' && placed && placed.route.length > 0
				? placed.route[placed.route.length - 1]
				: [placed?.lat ?? pr.points[0][0], placed?.lng ?? pr.points[0][1]];

		const allPoints: [number, number][] = [startPoint, ...pr.points];

		L.polyline(allPoints, {
			color: '#f59e0b',
			weight: 3,
			opacity: 0.85,
			dashArray: '10 6'
		}).addTo(pendingLayer);

		for (let i = 1; i < allPoints.length; i++) {
			const [lat, lng] = allPoints[i];
			const isLast = i === allPoints.length - 1;
			L.circleMarker([lat, lng], {
				radius: isLast ? 7 : 4,
				color: '#f59e0b',
				fillColor: '#f59e0b',
				fillOpacity: isLast ? 0.9 : 0.5,
				weight: 2
			}).addTo(pendingLayer);
		}
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
</script>

<!-- 单位处右键菜单 -->
<UnitContextMenu
	bind:open={myOpen}
	bind:contextUnitId={contextPlacedUnitId}
	{virtualAnchor}
	{map}
	{markersMap}
/>

<!-- 空白处右键菜单 -->
<MapContextMenu
	bind:open={mapMenuOpen}
	virtualAnchor={mapVirtualAnchor}
/>

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
	<InteractionModeHint {strikePendingTarget} />
</div>

<!-- 路线指令待确认卡片（Esc 退出绘制后弹出） -->
<RouteConfirmCard bind:open={routeConfirmOpen} />

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

