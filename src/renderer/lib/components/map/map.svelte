<script lang="ts">
  import { onMount, mount } from 'svelte'
  import { get } from 'svelte/store'
  import { Map, TileLayer } from 'sveaflet'
  import * as L from 'leaflet'
  import { coords, zoom, mapFlyTo } from '$lib/stores/battle/map-store'
  import { gameClock } from '$lib/engine/game-clock.store'
  import { getContactDisplayRadius, isUnitConfirmed } from '$lib/registry/sensor-registry'
  import UnitContextMenu from './context-menus/unit-context-menu.svelte'
  import MapContextMenu from './context-menus/map-context-menu.svelte'
  import UnitPopup from './cards/floating/unit-popup.svelte'
  import FacilityPopup from './cards/facility-popup.svelte'
  import MeasureCard from './cards/floating/measure-card.svelte'
  import InteractionModeHint from './cards/floating/interaction-mode-hint.svelte'
  import RouteConfirmCard from './cards/floating/route-confirm-card.svelte'
  import { routeConfirmOpen } from '$lib/stores/battle/battle-ui-store'
  import {
    currentBattle,
    currentFactionId,
    interactionMode,
    pendingPlaceUnitId,
    placeUnit,
    selectedPlacedUnitId,
    addRoutePoint,
    updatePlacedUnit,
    addLog,
    runtimePositions
  } from '$lib/stores/battle/battle-store'
  import {
    pendingRoute,
    addPendingPoint,
    cancelPendingRoute
  } from '$lib/stores/battle/route.store'
  import type { UnitTemplate, PlacedUnit, Faction, FacilityType } from '$lib/types'
  import { getNatoIcon } from '$lib/utils/unit-icon'
  import { getMilSymbolSVG, getMilSymbolAnchor } from '$lib/utils/milsymbol-utils'
  import { fly } from 'svelte/transition'

  /** 设施类型 → 北约 7 字符功能代码（兼容现有 milsymbol 管线） */
  const FACILITY_NATO_CODES: Record<FacilityType, string> = {
    fortress: 'GUCFS--',          // Ground Unit, Combat, Fortification
    trench_network: 'GUCE---',    // Ground Unit, Combat, Earthworks
    supply_depot: 'GUCS---',      // Ground Unit, Combat, Supply
    railway_hub: 'GURRH---',      // Ground Unit, Rail, Railhead
    airfield: 'AA------',         // Air, Airfield
    artillery_position: 'GCFS---',// Ground, Combat, Field Artillery
    command_post: 'GUGPHQ--',     // Ground Unit, Ground, Command Post HQ
    hospital: 'GUH-----'          // Ground Unit, Hospital/Medical
  }

  function getFacilityIcon(facilityType: FacilityType): L.DivIcon {
    const natoCode = FACILITY_NATO_CODES[facilityType] ?? 'GU------'
    const svg = getMilSymbolSVG(natoCode, 'neutral', 28, undefined, { fillColor: 'rgba(100,100,100,0.2)', iconColor: '#555' })
    const anchor = getMilSymbolAnchor(natoCode, 'neutral', 28)
    return L.divIcon({
      html: `<div style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))">${svg}</div>`,
      className: 'facility-marker-icon',
      iconSize: [anchor.x * 2, anchor.y * 2],
      iconAnchor: [anchor.x, anchor.y]
    })
  }

  let map = $state<L.Map>(null!)
  let myOpen = $state(false)
  let contextPlacedUnitId: string | null = $state(null)

  // 空白处右键菜单
  let mapMenuOpen = $state(false)
  let mapVirtualAnchor: any = $state(null)

  let virtualAnchor: any = $state(null)

  // 打击目标状态（由 StrikeCard 拥有，通过 bind 同步供 InteractionModeHint 使用）
  let strikePendingTarget: { lat: number; lng: number } | null = $state(null)

  // 地图上的图层引用
  let facilitiesLayer: L.LayerGroup
  let markersLayer: L.LayerGroup
  let routesLayer: L.LayerGroup
  let rangesLayer: L.LayerGroup
  let pendingLayer: L.LayerGroup
  let contactsLayer: L.LayerGroup
  const markersMap: Record<string, L.Marker> = {}
  /** 各单位行动路线 polyline 引用（快速路径更新用） */
  const routePolylinesMap: Record<string, L.Polyline> = {}
  /** 各单位攻击射程圆圈引用（快速路径方址更新用） */
  const attackRangeCirclesMap: Record<string, L.Circle> = {}
  /** 上一次渲染图标时的 hp/org/status 缓存（避免每帧重建 DivIcon） */
  const iconStateCache: Record<string, { hp: number; org: number; status: string }> = {}

  // 构建单位 Popup 内容节点
  function createPopupElement(
    unit: UnitTemplate,
    faction: Faction,
    placed: PlacedUnit
  ): HTMLElement {
    const el = document.createElement('div')
    mount(UnitPopup, { target: el, props: { unit, faction, placed } })
    return el
  }

  // 查找单位信息
  function findUnit(unitId: string): { unit: UnitTemplate; faction: Faction } | null {
    const battle = $currentBattle
    if (!battle) return null
    for (const faction of battle.factions) {
      const unit = faction.units.find((u) => u.id === unitId)
      if (unit) return { unit, faction }
    }
    return null
  }

  // 渲染所有地图元素
  function renderMapElements() {
    if (!map || !markersLayer) return

    markersLayer.clearLayers()
    routesLayer.clearLayers()
    rangesLayer.clearLayers()
    facilitiesLayer.clearLayers()
    for (const key in markersMap) delete markersMap[key]
    for (const key in routePolylinesMap) delete routePolylinesMap[key]
    for (const key in attackRangeCirclesMap) delete attackRangeCirclesMap[key]

    const battle = $currentBattle
    if (!battle) return

    // ── 设施标记 ──
    const facilities = battle.facilities ?? []
    for (const facility of facilities) {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: getFacilityIcon(facility.type),
        interactive: true
      })
      marker.bindTooltip(facility.name, {
        direction: 'top',
        offset: [0, -16],
        className: 'facility-tooltip'
      })
      const popupEl = document.createElement('div')
      mount(FacilityPopup, { target: popupEl, props: { facility } })
      marker.bindPopup(popupEl, { maxWidth: 240 })
      facilitiesLayer.addLayer(marker)
    }

    for (const placed of battle.placedUnits) {
      const info = findUnit(placed.unitId)
      if (!info) continue

      const { unit, faction } = info

      // Phase 3 FOW：战争迷雾开启时隐藏未确认的敌方单位
      const selFactionId = $currentFactionId
      if (battle.fogOfWar && selFactionId && faction.id !== selFactionId) {
        if (!isUnitConfirmed(battle.factionContacts, selFactionId, placed.id)) {
          continue
        }
      }

      // 标记
      const marker = L.marker([placed.lat, placed.lng], {
        icon: getNatoIcon(unit, faction, placed, placed.id === $selectedPlacedUnitId),
        draggable: $interactionMode === 'select'
      })

      // 弹出窗口
      marker.bindPopup(createPopupElement(unit, faction, placed))

      // 点击选中（attack 模式下点击敌方单位 = 设置攻击目标）
      marker.on('click', () => {
        const mode = $interactionMode
        if (mode === 'attack') {
          const attackerId = $selectedPlacedUnitId
          if (attackerId && attackerId !== placed.id) {
            updatePlacedUnit(attackerId, { attackTargetId: placed.id })
            addLog(
              `指定攻击目标: ${info.unit.name}`,
              { category: 'combat', sourceUnitId: attackerId, targetUnitId: placed.id, location: { lat: placed.lat, lng: placed.lng } }
            )
            interactionMode.set('select')
          }
        } else {
          selectedPlacedUnitId.set(placed.id)
        }
      })

      // 拖拽结束更新位置
      marker.on('dragend', (e) => {
        const latlng = (e.target as L.Marker).getLatLng()
        updatePlacedUnit(
          placed.id,
          { lat: latlng.lat, lng: latlng.lng },
          `移动单位: ${info.unit.name}`
        )
        // 同步更新 runtimePositions，防止引擎用旧坐标覆盖回拖拽位置
        runtimePositions.update((pos) => {
          if (!pos[placed.id]) return pos
          return { ...pos, [placed.id]: { ...pos[placed.id], lat: latlng.lat, lng: latlng.lng } }
        })
        addLog(`移动单位: ${info.unit.name} → (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`)
      })

      // 右键上下文菜单绑定
      marker.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e)
        contextPlacedUnitId = placed.id
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
        }
        mapMenuOpen = false
        myOpen = true
      })

      markersMap[placed.id] = marker
      markersLayer.addLayer(marker)

      // 行动路线
      if (placed.route.length > 0) {
        const routePoints: L.LatLngExpression[] = [[placed.lat, placed.lng], ...placed.route]
        const polyline = L.polyline(routePoints, {
          color: faction.color,
          weight: 3,
          opacity: 0.7
        })
        routesLayer.addLayer(polyline)
        // 存储引用，供快速路径更新
        routePolylinesMap[placed.id] = polyline

        // 路线终点箭头标记
        const lastPoint = placed.route[placed.route.length - 1]
        const endMarker = L.circleMarker([lastPoint[0], lastPoint[1]], {
          radius: 5,
          color: faction.color,
          fillColor: faction.color,
          fillOpacity: 0.8
        })
        routesLayer.addLayer(endMarker)
      }

      // 攻击射程圆圈（仅选中时可见）
      if (placed.stats.attackRange > 0) {
        const isSelected = placed.id === $selectedPlacedUnitId
        const attackCircle = L.circle([placed.lat, placed.lng], {
          radius: placed.stats.attackRange * 1000, // km → meters
          color: faction.color,
          weight: isSelected ? 1 : 0,
          fillColor: faction.color,
          fillOpacity: isSelected ? 0.04 : 0,
          opacity: isSelected ? 1 : 0,
          dashArray: '6 4'
        })
        rangesLayer.addLayer(attackCircle)
        attackRangeCirclesMap[placed.id] = attackCircle
      }

      // 打击范围
      if (placed.strikeRadius > 0) {
        const center = placed.strikeTarget
          ? ([placed.strikeTarget.lat, placed.strikeTarget.lng] as L.LatLngExpression)
          : ([placed.lat, placed.lng] as L.LatLngExpression)
        const circle = L.circle(center, {
          radius: placed.strikeRadius,
          color: faction.color,
          weight: 1,
          fillColor: faction.color,
          fillOpacity: 0.08,
          dashArray: '4 4'
        })
        rangesLayer.addLayer(circle)
        // 从单位到打击目标的连线
        if (placed.strikeTarget) {
          const line = L.polyline(
            [
              [placed.lat, placed.lng],
              [placed.strikeTarget.lat, placed.strikeTarget.lng]
            ],
            { color: faction.color, weight: 1, opacity: 0.5, dashArray: '4 4' }
          )
          rangesLayer.addLayer(line)
          const dot = L.circleMarker([placed.strikeTarget.lat, placed.strikeTarget.lng], {
            radius: 4,
            color: faction.color,
            fillColor: faction.color,
            fillOpacity: 0.9
          })
          rangesLayer.addLayer(dot)
        }
      }
    }
  }

  // 响应式更新地图（结构性重建：添加/删除单位、切换互动模式时触发）
  $effect(() => {
    // 读取依赖以触发响应
    $currentBattle
    $selectedPlacedUnitId
    $interactionMode
    renderMapElements()
  })

  // 快速路径：推演运行时仅更新 marker 位置和路线，不重建 DOM
  $effect(() => {
    const positions = $runtimePositions
    if (!map || !markersLayer) return

    for (const [id, pos] of Object.entries(positions)) {
      // 更新 marker 位置
      const marker = markersMap[id]
      if (marker) {
        marker.setLatLng([pos.lat, pos.lng])

        // 同步更新攻击射程圆圈位置
        const atkCircle = attackRangeCirclesMap[id]
        if (atkCircle) atkCircle.setLatLng([pos.lat, pos.lng])

        // 更新图标（HP/Org 进度条 + status 变化时）
        const hpR = Math.round(pos.hp)
        const orgR = Math.round(pos.org)
        const cached = iconStateCache[id]
        if (!cached || cached.hp !== hpR || cached.org !== orgR || cached.status !== pos.status) {
          iconStateCache[id] = { hp: hpR, org: orgR, status: pos.status }
          const battle = get(currentBattle)
          const placed = battle?.placedUnits.find((p) => p.id === id)
          if (placed) {
            const info = findUnit(placed.unitId)
            if (info) {
              marker.setIcon(
                getNatoIcon(
                  info.unit,
                  info.faction,
                  { ...placed, hp: pos.hp, org: pos.org, status: pos.status },
                  placed.id === $selectedPlacedUnitId
                )
              )
            }
          }
        }
      }

      // 更新路线 polyline（或在到达终点时移除）
      if (pos.route.length === 0) {
        const poly = routePolylinesMap[id]
        if (poly) {
          routesLayer.removeLayer(poly)
          delete routePolylinesMap[id]
        }
      } else {
        const routePoints: L.LatLngExpression[] = [[pos.lat, pos.lng], ...pos.route]
        const poly = routePolylinesMap[id]
        if (poly) {
          poly.setLatLngs(routePoints)
        } else {
          // 首次创建（runtimePositions 初始化后 markersMap 可能还没有对应 polyline）
          const battle = get(currentBattle)
          const placed = battle?.placedUnits.find((p) => p.id === id)
          if (placed) {
            const faction = battle?.factions.find((f) =>
              f.units.some((u) => u.id === placed.unitId)
            )
            const color = faction?.color ?? '#888'
            const newPoly = L.polyline(routePoints, { color, weight: 3, opacity: 0.7 })
            routesLayer.addLayer(newPoly)
            routePolylinesMap[id] = newPoly
          }
        }
      }
    }
  })

  // 响应外部定位请求
  $effect(() => {
    const pos = $mapFlyTo
    if (!pos || !map) return
    map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 10), { duration: 1 })
    Promise.resolve().then(() => mapFlyTo.set(null))
  })

  onMount(async () => {
    const readyMap = await waitForMapReady()

    facilitiesLayer = L.layerGroup().addTo(readyMap)
    markersLayer = L.layerGroup().addTo(readyMap)
    routesLayer = L.layerGroup().addTo(readyMap)
    rangesLayer = L.layerGroup().addTo(readyMap)
    pendingLayer = L.layerGroup().addTo(readyMap)
    contactsLayer = L.layerGroup().addTo(readyMap)

    readyMap.on('mousemove', (e) => {
      coords.set(e.latlng)
    })
    readyMap.on('zoomend', () => {
      zoom.set(readyMap.getZoom())
    })

    // 地图点击事件
    readyMap.on('click', (e) => {
      const mode = $interactionMode
      const latlng = e.latlng

      if (mode === 'place') {
        // 放置模式：将待放置单位放到地图上
        const unitId = $pendingPlaceUnitId
        const factionId = $currentFactionId
        if (unitId && factionId) {
          placeUnit(unitId, factionId, latlng.lat, latlng.lng)
          pendingPlaceUnitId.set(null)
          interactionMode.set('select')
        }
      } else if (mode === 'route') {
        if ($pendingRoute) {
          // 推演运行中：写入 pending，不立刻提交
          addPendingPoint(latlng.lat, latlng.lng)
        } else {
          // 推演暂停：直接写入路线
          const placedId = $selectedPlacedUnitId
          if (placedId) addRoutePoint(placedId, latlng.lat, latlng.lng)
        }
      } else if (mode === 'select') {
        // 选择模式：点击空白处取消选中
        selectedPlacedUnitId.set(null)
      }
      // strike 模式由 StrikeCard 内部监听处理
    })

    readyMap.on('contextmenu', (e) => {
      e.originalEvent.preventDefault()
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
      }
      myOpen = false
      mapMenuOpen = true
    })

    renderMapElements()
  })

  async function waitForMapReady() {
    while (!map) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return map
  }

  // 监听路线模式退出：当 pending 有节点时弹出确认卡片
  let _prevInteractionMode: string = 'select'
  $effect(() => {
    const mode = $interactionMode
    if (_prevInteractionMode === 'route' && mode !== 'route') {
      if ($pendingRoute && $pendingRoute.points.length > 0) {
        routeConfirmOpen.set(true)
      } else {
        cancelPendingRoute()
      }
    }
    _prevInteractionMode = mode
  })

  // Leaflet pending 虚线实时渲染
  $effect(() => {
    // 先读取响应式依赖（必须在任何 return 之前），否则 Svelte 5 无法追踪
    const pr = $pendingRoute
    const battle = $currentBattle
    if (!pendingLayer) return
    pendingLayer.clearLayers()
    if (!pr || pr.points.length === 0) return

    const placed = battle?.placedUnits.find((p) => p.id === pr.placedId)
    const startPoint: [number, number] =
      pr.type === 'append' && placed && placed.route.length > 0
        ? placed.route[placed.route.length - 1]
        : [placed?.lat ?? pr.points[0][0], placed?.lng ?? pr.points[0][1]]

    const allPoints: [number, number][] = [startPoint, ...pr.points]

    L.polyline(allPoints, {
      color: '#f59e0b',
      weight: 3,
      opacity: 0.85,
      dashArray: '10 6'
    }).addTo(pendingLayer)

    for (let i = 1; i < allPoints.length; i++) {
      const [lat, lng] = allPoints[i]
      const isLast = i === allPoints.length - 1
      L.circleMarker([lat, lng], {
        radius: isLast ? 7 : 4,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: isLast ? 0.9 : 0.5,
        weight: 2
      }).addTo(pendingLayer)
    }
  })

  // ── 侦察接触渲染（Phase 3）──
  $effect(() => {
    const battle = $currentBattle
    const factionId = $currentFactionId
    if (!contactsLayer) return

    contactsLayer.clearLayers()

    if (!battle || !factionId) return
    const contacts = battle.factionContacts?.[factionId]
    if (!contacts || contacts.length === 0) return

    const clock = get(gameClock)
    const simTimeMs = clock.currentDate.getTime()

    for (const contact of contacts) {
      // confirmed 级不渲染接触圆圈（真实单位已可见）
      if (contact.identityLevel === 'confirmed') continue

      const displayRadius = getContactDisplayRadius(contact, simTimeMs)
      const radiusMeters = displayRadius * 1000 // km → meters

      // 颜色按识别等级
      const color = contact.identityLevel === 'estimated_size' ? '#eab308' : '#f97316'
      const fillColor = contact.identityLevel === 'estimated_size' ? '#fef08a' : '#fed7aa'

      // 不确定性圆圈
      L.circle([contact.position.lat, contact.position.lng], {
        radius: radiusMeters,
        color,
        weight: 1.5,
        fillColor,
        fillOpacity: 0.15,
        dashArray: '8 4'
      }).addTo(contactsLayer)

      // 中心标记
      const label = contact.identityLevel === 'activity' ? '?' : '!'
      L.circleMarker([contact.position.lat, contact.position.lng], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 1
      })
        .bindTooltip(label, { direction: 'center', className: 'contact-marker-tooltip' })
        .addTo(contactsLayer)
    }
  })
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
<MapContextMenu bind:open={mapMenuOpen} virtualAnchor={mapVirtualAnchor} />

<div class="relative z-0 h-full w-full" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
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
<RouteConfirmCard bind:open={$routeConfirmOpen} />

<!-- 测量距离浮动卡片 -->
<MeasureCard {map} />
