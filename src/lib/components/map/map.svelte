<script lang="ts">
	import { onMount, tick, mount } from 'svelte';
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import * as L from 'leaflet';
	import { coords, zoom, mapFlyTo } from '$lib/stores/map-store';
	import { MapPin, Navigation, X, Target, AlertTriangle, Check } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import UnitContextMenu from './unit-context-menu.svelte';
	import MapContextMenu from './map-context-menu.svelte';
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
		selectedPlacedUnitId,
		selectedPlacedUnit,
		updatePlacedUnit,
		addLog,
		undo
	} from '$lib/stores/battle-store';
	import {
		pendingRoute,
		addPendingPoint,
		applyPendingRoute,
		cancelPendingRoute
	} from '$lib/stores/pending-route.store';
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
				mapMenuOpen = false;
				myOpen = true;
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
				// 路线模式：写入 pending 路线，不直接修改 battle-store
				if ($pendingRoute) {
					addPendingPoint(latlng.lat, latlng.lng);
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
		if (!pendingLayer) return;
		pendingLayer.clearLayers();
		const pr = $pendingRoute;
		if (!pr || pr.points.length === 0) return;

		const placed = $currentBattle?.placedUnits.find((p) => p.id === pr.placedId);
		const info = placed ? findUnit(placed.unitId) : null;

		// 起点：append 模式从现有路线末点开始，reset 或尴路线从单位位置开始
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
	{#if $interactionMode !== 'select'}
		<div class="absolute top-20 left-1/2 z-[1001] -translate-x-1/2">
			<div class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/90 px-4 py-2.5 shadow-md backdrop-blur-sm">
				{#if $interactionMode === 'place'}
					<MapPin class="h-4 w-4 text-stone-600" />
					<span class="text-sm text-stone-700">点击地图放置单位</span>
				{:else if $interactionMode === 'route'}
					<Navigation class="h-4 w-4 text-stone-600" />
				<span class="text-sm text-stone-700">
					{$pendingRoute?.type === 'reset' ? '改设路线' : '追加路线'}模式，已记录 {$pendingRoute?.points.length ?? 0} 个点，Esc 完成
				</span>
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

<!-- 路线指令待确认卡片（Esc 退出绘制后弹出） -->
{#if routeConfirmOpen && $pendingRoute}
	{@const pr = $pendingRoute}
	<div
		class="pointer-events-none fixed inset-0 z-[2000] flex items-end justify-center pb-8"
		in:fly={{ y: 16, duration: 220, opacity: 0 }}
		out:fly={{ y: 16, duration: 160, opacity: 0 }}
	>
		<div class="pointer-events-auto flex w-[440px] flex-col gap-3 rounded-2xl border border-amber-200 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
			<div class="flex items-start gap-3">
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
					<AlertTriangle class="h-4 w-4 text-amber-500" />
				</div>
				<div>
					<p class="text-sm font-semibold text-stone-800">路线指令已录入</p>
					<p class="mt-0.5 text-xs text-stone-500">
						单位 <span class="font-medium text-stone-700">{pr.unitName}</span> ·
						{pr.type === 'reset' ? '重置路线' : '追加路线'} ·
						共 <span class="font-medium text-stone-700">{pr.points.length}</span> 个新节点
					</p>
					<p class="mt-1.5 text-xs text-stone-400">是否更新该单位的行动路线？</p>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button
					class="rounded-lg border border-stone-200 px-4 py-1.5 text-sm text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-800"
					onclick={() => { routeConfirmOpen = false; cancelPendingRoute(); }}
				>
					放弃
				</button>
				<button
					class="flex items-center gap-1.5 rounded-lg bg-stone-800 px-4 py-1.5 text-sm text-white transition-colors hover:bg-stone-900"
					onclick={() => {
						applyPendingRoute();
						addLog(`路线更新: ${pr.unitName}，${pr.type === 'reset' ? '重置' : '追加'} ${pr.points.length} 个节点`);
						routeConfirmOpen = false;
					}}
				>
					<Check class="h-3.5 w-3.5" />
					确认更新
				</button>
			</div>
		</div>
	</div>
{/if}

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

