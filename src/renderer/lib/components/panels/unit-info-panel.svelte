<script lang="ts">
  import {
    currentBattle,
    selectedPlacedUnitId,
    selectedPlacedUnit,
    runtimePositions
  } from '$lib/stores/battle/battle-store'
  import { mods } from '$lib/registry/mod-registry.svelte'
  import { getSensorDefinition } from '$lib/registry/sensor-registry'
  import {
    Heart,
    Zap,
    Swords,
    Wrench,
    PlaneTakeoff,
    ShieldHalf,
    Gauge,
    MapPin,
    Target,
    Radio,
    Package
  } from '@lucide/svelte'
  import NatoSymbol from '../map/nato-symbol.svelte'
  import { fly } from 'svelte/transition'
  import * as Card from '$lib/components/ui/card'
  import * as Accordion from '$lib/components/ui/accordion'
  import { Badge } from '$lib/components/ui/badge'
  import { Separator } from '$lib/components/ui/separator'
  import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '$lib/components/ui/empty'
  import type { UnitTemplate, Faction, PlacedUnit } from '$lib/types'

  // ── 派生：从 battle 查找单位信息 ──
  let unitInfo = $derived(((): { unit: UnitTemplate; faction: Faction; placed: PlacedUnit } | null => {
    const battle = $currentBattle
    const placedId = $selectedPlacedUnitId
    if (!battle || !placedId) return null
    const placed = battle.placedUnits.find((p) => p.id === placedId)
    if (!placed) return null
    for (const faction of battle.factions) {
      const unit = faction.units.find((u) => u.id === placed!.unitId)
      if (unit) return { unit, faction, placed }
    }
    return null
  })())

  let liveRt = $derived($selectedPlacedUnitId ? $runtimePositions[$selectedPlacedUnitId] : null)
  let liveHp = $derived(liveRt?.hp ?? unitInfo?.placed.hp ?? 0)
  let liveOrg = $derived(liveRt?.org ?? unitInfo?.placed.org ?? 0)
  let liveStatus = $derived(liveRt?.status ?? unitInfo?.placed.status ?? 'idle')
  let liveBehavior = $derived(liveRt?.behavior ?? unitInfo?.placed.behavior ?? 'aggressive')

  let maxHp = $derived(unitInfo?.placed.stats.maxHp ?? 100)
  let maxOrg = $derived(unitInfo?.placed.stats.maxOrg ?? 100)
  let hpPct = $derived(maxHp > 0 ? Math.min(100, (liveHp / maxHp) * 100) : 0)
  let orgPct = $derived(maxOrg > 0 ? Math.min(100, (liveOrg / maxOrg) * 100) : 0)

  // ── 航向 ──
  let heading = $derived(((): number | null => {
    const pos = liveRt ?? unitInfo?.placed
    if (!pos || !pos.route || pos.route.length === 0) return null
    const next = pos.route[0]
    const dLng = next[1] - pos.lng
    const dLat = next[0] - pos.lat
    const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI
    return Math.round((deg + 360) % 360)
  })())

  let effectiveSpeed = $derived(((): number => {
    const pos = liveRt ?? unitInfo?.placed
    return pos?.stats?.speed ?? 0
  })())

  // ── 传感器 ──
  let sensorList = $derived(((): Array<{ id: string; name: string; range: number }> => {
    const sensorIds = liveRt?.sensorIds ?? unitInfo?.placed.sensorIds
    if (!sensorIds || sensorIds.length === 0) return []
    return sensorIds.map((sid) => {
      const def = getSensorDefinition(sid)
      return { id: sid, name: def?.id ?? sid, range: (def?.properties.range as number) ?? 0 }
    })
  })())

  // ── 组件 ──
  let weaponList = $derived(((): Array<{ id: string; label: string }> => {
    const unit = unitInfo?.unit
    if (!unit?.components || unit.components.length === 0) return []
    return unit.components.map((c) => ({
      id: c.id,
      label: mods.getLabel('component.' + c.id, c.id)
    }))
  })())

  // ── 战斗属性行 ──
  function statRow(icon: any, label: string, value: number | string, color: string = 'text-foreground') {
    return { icon, label, value, color }
  }

  let combatRows = $derived(((): Array<ReturnType<typeof statRow>> => {
    const stats = unitInfo?.placed.stats ?? {}
    return [
      statRow(Swords, '软攻击', stats.softAttack ?? 0, 'text-orange-400'),
      statRow(Wrench, '硬攻击', stats.hardAttack ?? 0, 'text-zinc-400'),
      statRow(PlaneTakeoff, '空攻击', stats.airAttack ?? 0, 'text-sky-400'),
      statRow(ShieldHalf, '防御', stats.defense ?? 0, 'text-blue-400'),
      statRow(Gauge, '速度', (stats.speed ?? 0) + ' km/h', 'text-green-400'),
    ]
  })())

  const BEHAVIOR_LABELS: Record<string, string> = {
    aggressive: '进攻',
    defensive: '防守',
    cautious: '谨慎',
    hold: '死守'
  }
</script>

<div class="unit-info-panel" in:fly={{ x: 16, duration: 280, opacity: 0 }}>
  {#if unitInfo}
    <!-- 标题区 -->
    <Card.CardHeader class="pb-2">
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0 drop-shadow-md">
          <NatoSymbol
            natoCode={unitInfo.placed.natoCode ?? mods.getNatoCode(unitInfo.unit)}
            side={unitInfo.faction.side ?? 'blue'}
            size={40}
            color={unitInfo.faction.color}
          />
        </div>
        <div class="min-w-0 flex-1">
          <Card.CardTitle class="text-sm">{unitInfo.unit.name}</Card.CardTitle>
          <div class="mt-1 flex items-center gap-1.5">
            <span
              class="inline-block h-2 w-2 flex-shrink-0 rounded-full"
              style="background: {unitInfo.faction.color};"
            ></span>
            <span class="truncate text-[11px] text-muted-foreground">
              {unitInfo.faction.name} · {mods.getLabel('branch.' + unitInfo.unit.branchId, unitInfo.unit.branchId)}
            </span>
          </div>
          <Card.CardDescription class="mt-0.5 text-[10px]">
            {mods.getLabel('category.' + unitInfo.unit.categoryId, unitInfo.unit.categoryId)}
          </Card.CardDescription>
        </div>
      </div>
    </Card.CardHeader>

    <!-- 折叠段 -->
    <div class="overflow-y-auto">
      <Accordion.Root type="multiple" value={['basic', 'status']}>
        <!-- 基本信息 -->
        <Accordion.Item value="basic">
          <Accordion.Trigger class="px-3 py-2 text-xs">
            <Target class="size-3.5" />
            <span class="ml-2">基本信息</span>
          </Accordion.Trigger>
          <Accordion.Content class="px-3 pb-2">
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">番号</span>
                <span class="font-mono text-foreground">{unitInfo.unit.id}</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">阵营</span>
                <span class="text-foreground">{unitInfo.faction.name}</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">军种</span>
                <span class="text-foreground">{mods.getLabel('branch.' + unitInfo.unit.branchId, unitInfo.unit.branchId)}</span>
              </div>
              {#if heading !== null}
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-muted-foreground">航向</span>
                  <span class="font-mono text-foreground">{heading}°</span>
                </div>
              {/if}
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">速度</span>
                <span class="font-mono text-foreground">{effectiveSpeed} km/h</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">坐标</span>
                <span class="font-mono text-muted-foreground">{(liveRt ?? unitInfo.placed).lat.toFixed(4)}°, {(liveRt ?? unitInfo.placed).lng.toFixed(4)}°</span>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- 状态 -->
        <Accordion.Item value="status">
          <Accordion.Trigger class="px-3 py-2 text-xs">
            <Heart class="size-3.5" />
            <span class="ml-2">状态</span>
          </Accordion.Trigger>
          <Accordion.Content class="px-3 pb-3">
            <div class="flex flex-col gap-2">
              <!-- 姿态 + 行为 -->
              <div class="flex items-center gap-2 text-[11px]">
                <span class="text-muted-foreground">姿态</span>
                <Badge variant="secondary" class="text-[10px]">{mods.getLabel('status.' + liveStatus, liveStatus)}</Badge>
                <span class="text-muted-foreground">· 行为</span>
                <Badge variant="outline" class="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400">{BEHAVIOR_LABELS[liveBehavior] ?? liveBehavior}</Badge>
              </div>

              <!-- HP -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-muted-foreground">生命值</span>
                  <span class="font-mono text-[10px] text-foreground">{Math.round(liveHp)}/{maxHp}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-2 rounded-full transition-all {hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'}"
                    style="width:{hpPct}%;"
                  ></div>
                </div>
              </div>

              <!-- Org -->
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-muted-foreground">组织度</span>
                  <span class="font-mono text-[10px] text-foreground">{Math.round(liveOrg)}/{maxOrg}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-amber-400 transition-all" style="width:{orgPct}%;"></div>
                </div>
              </div>

              <!-- 战斗属性 -->
              {#each combatRows as row}
                <div class="flex items-center gap-2 text-[11px]">
                  <span class={row.color}><row.icon class="size-3" /></span>
                  <span class="text-muted-foreground">{row.label}</span>
                  <span class="ml-auto font-mono text-foreground">{row.value}</span>
                </div>
              {/each}
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- 传感器 -->
        {#if sensorList.length > 0}
          <Accordion.Item value="sensors">
            <Accordion.Trigger class="px-3 py-2 text-xs">
              <Radio class="size-3.5" />
              <span class="ml-2">传感器 ({sensorList.length})</span>
            </Accordion.Trigger>
            <Accordion.Content class="px-3 pb-2">
              <div class="flex flex-col gap-1">
                {#each sensorList as sensor}
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-foreground">{sensor.name}</span>
                    <span class="font-mono text-muted-foreground">{sensor.range} km</span>
                  </div>
                {/each}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        {/if}

        <!-- 组件 -->
        {#if weaponList.length > 0}
          <Accordion.Item value="weapons">
            <Accordion.Trigger class="px-3 py-2 text-xs">
              <Package class="size-3.5" />
              <span class="ml-2">组件 ({weaponList.length})</span>
            </Accordion.Trigger>
            <Accordion.Content class="px-3 pb-2">
              <div class="flex flex-col gap-1">
                {#each weaponList as weapon}
                  <div class="text-[11px] text-foreground">{weapon.label}</div>
                {/each}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        {/if}
      </Accordion.Root>
    </div>
  {:else}
    <Empty class="flex-1">
      <EmptyContent>
        <EmptyTitle class="text-sm">未选中单位</EmptyTitle>
        <EmptyDescription class="text-xs">点击地图上的单位以查看详情</EmptyDescription>
      </EmptyContent>
    </Empty>
  {/if}
</div>

<style>
  .unit-info-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
