<script lang="ts">
  import {
    currentBattle,
    selectedPlacedUnitId,
    selectedPlacedUnit,
    runtimePositions
  } from '$lib/stores/battle/battle-store';
  import { mods } from '$lib/registry/mod-registry.svelte';
  import { getSensorDefinition } from '$lib/registry/sensor-registry';
  import {
    Heart,
    Zap,
    Swords,
    Wrench,
    PlaneTakeoff,
    ShieldHalf,
    Gauge,
    Crosshair,
    MapPin,
    ChevronDown,
    ChevronUp,
    Target,
    Radio,
    Package
  } from '@lucide/svelte';
  import NatoSymbol from '../map/nato-symbol.svelte';
  import { fly } from 'svelte/transition';
  import type { UnitTemplate, Faction, PlacedUnit, FlexStats } from '$lib/types';

  // ── 折叠段 ──
  let basicExpanded = $state(true);
  let statusExpanded = $state(true);
  let sensorsExpanded = $state(false);
  let weaponsExpanded = $state(false);

  // ── 派生：从 battle 查找单位信息 ──
  let unitInfo = $derived(((): { unit: UnitTemplate; faction: Faction; placed: PlacedUnit } | null => {
    const battle = $currentBattle;
    const placedId = $selectedPlacedUnitId;
    if (!battle || !placedId) return null;
    const placed = battle.placedUnits.find((p) => p.id === placedId);
    if (!placed) return null;
    for (const faction of battle.factions) {
      const unit = faction.units.find((u) => u.id === placed!.unitId);
      if (unit) return { unit, faction, placed };
    }
    return null;
  })());

  let liveRt = $derived($selectedPlacedUnitId ? $runtimePositions[$selectedPlacedUnitId] : null);
  let liveHp = $derived(liveRt?.hp ?? unitInfo?.placed.hp ?? 0);
  let liveOrg = $derived(liveRt?.org ?? unitInfo?.placed.org ?? 0);
  let liveStatus = $derived(liveRt?.status ?? unitInfo?.placed.status ?? 'idle');
  let liveBehavior = $derived(liveRt?.behavior ?? unitInfo?.placed.behavior ?? 'aggressive');

  let maxHp = $derived(unitInfo?.placed.stats.maxHp ?? 100);
  let maxOrg = $derived(unitInfo?.placed.stats.maxOrg ?? 100);
  let hpPct = $derived(maxHp > 0 ? Math.min(100, (liveHp / maxHp) * 100) : 0);
  let orgPct = $derived(maxOrg > 0 ? Math.min(100, (liveOrg / maxOrg) * 100) : 0);

  // ── 航向计算 ──
  let heading = $derived(((): number | null => {
    const pos = liveRt ?? unitInfo?.placed;
    if (!pos || !pos.route || pos.route.length === 0) return null;
    const next = pos.route[0];
    const lat = pos.lat;
    const lng = pos.lng;
    const dLng = next[1] - lng;
    const dLat = next[0] - lat;
    const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    return Math.round((deg + 360) % 360);
  })());

  // ── 有效速度 ──
  let effectiveSpeed = $derived(((): number => {
    const pos = liveRt ?? unitInfo?.placed;
    return pos?.stats?.speed ?? 0;
  })());

  // ── 传感器列表 ──
  let sensorList = $derived(((): Array<{ id: string; name: string; range: number }> => {
    const sensorIds = liveRt?.sensorIds ?? unitInfo?.placed.sensorIds;
    if (!sensorIds || sensorIds.length === 0) return [];
    return sensorIds.map((sid) => {
      const def = getSensorDefinition(sid);
      return {
        id: sid,
        name: def?.id ?? sid,
        range: (def?.properties.range as number) ?? 0
      };
    });
  })());

  // ── 武器/组件列表 ──
  let weaponList = $derived(((): Array<{ id: string; label: string }> => {
    const unit = unitInfo?.unit;
    if (!unit?.components || unit.components.length === 0) return [];
    return unit.components.map((c) => ({
      id: c.id,
      label: mods.getLabel('component.' + c.id, c.id)
    }));
  })());

  // ── 关键属性行 ──
  function statRow(icon: any, label: string, value: number | string, color: string = 'text-foreground') {
    return { icon, label, value, color };
  }

  let combatRows = $derived(((): Array<ReturnType<typeof statRow>> => {
    const stats = unitInfo?.placed.stats ?? {};
    return [
      statRow(Swords, '软攻击', stats.softAttack ?? 0, 'text-orange-400'),
      statRow(Wrench, '硬攻击', stats.hardAttack ?? 0, 'text-zinc-400'),
      statRow(PlaneTakeoff, '空攻击', stats.airAttack ?? 0, 'text-sky-400'),
      statRow(ShieldHalf, '防御', stats.defense ?? 0, 'text-blue-400'),
      statRow(Gauge, '速度', (stats.speed ?? 0) + ' km/h', 'text-green-400'),
    ];
  })());

  const BEHAVIOR_LABELS: Record<string, string> = {
    aggressive: '进攻',
    defensive: '防守',
    cautious: '谨慎',
    hold: '死守'
  };
</script>

{#if unitInfo}
  <div
    class="unit-info-panel z-[800]"
    in:fly={{ x: 16, duration: 280, opacity: 0 }}
  >
    <!-- ── 标题区：北约图标 + 名称 ── -->
    <div class="flex items-center gap-3 border-b border-stone-700/50 px-3 py-3">
      <div class="flex-shrink-0 drop-shadow-md">
        <NatoSymbol
          natoCode={unitInfo.placed.natoCode ?? mods.getNatoCode(unitInfo.unit)}
          side={unitInfo.faction.side ?? 'blue'}
          size={44}
          color={unitInfo.faction.color}
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold leading-tight text-stone-100">{unitInfo.unit.name}</p>
        <div class="mt-0.5 flex items-center gap-1.5">
          <span
            class="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style="background: {unitInfo.faction.color};"
          ></span>
          <span class="truncate text-[11px] text-stone-400">
            {unitInfo.faction.name} · {mods.getLabel('branch.' + unitInfo.unit.branchId, unitInfo.unit.branchId)}
          </span>
        </div>
        <p class="mt-0.5 text-[10px] text-stone-500">
          {mods.getLabel('category.' + unitInfo.unit.categoryId, unitInfo.unit.categoryId)}
        </p>
      </div>
    </div>

    <div class="max-h-[calc(100vh-16rem)] overflow-y-auto">
      <!-- ═══ 基本信息段 ═══ -->
      <button class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-stone-400 hover:bg-stone-800/50" onclick={() => (basicExpanded = !basicExpanded)}>
        <Target class="size-3.5" />
        <span>基本信息</span>
        {#if basicExpanded}<ChevronUp class="ml-auto size-3 opacity-50" />{:else}<ChevronDown class="ml-auto size-3 opacity-50" />{/if}
      </button>
      {#if basicExpanded}
        <div class="flex flex-col gap-1 px-3 pb-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-stone-500">番号</span>
            <span class="font-mono text-stone-300">{unitInfo.unit.id}</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-stone-500">阵营</span>
            <span class="text-stone-300">{unitInfo.faction.name}</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-stone-500">军种</span>
            <span class="text-stone-300">{mods.getLabel('branch.' + unitInfo.unit.branchId, unitInfo.unit.branchId)}</span>
          </div>
          {#if heading !== null}
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-stone-500">航向</span>
              <span class="font-mono text-stone-300">{heading}°</span>
            </div>
          {/if}
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-stone-500">速度</span>
            <span class="font-mono text-stone-300">{effectiveSpeed} km/h</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <MapPin class="size-3 text-stone-600" />
            <span class="font-mono text-stone-500">{(liveRt ?? unitInfo.placed).lat.toFixed(4)}°, {(liveRt ?? unitInfo.placed).lng.toFixed(4)}°</span>
          </div>
        </div>
      {/if}

      <!-- ═══ 状态段 ═══ -->
      <button class="flex w-full items-center gap-2 border-t border-stone-700/50 px-3 py-2 text-xs font-medium text-stone-400 hover:bg-stone-800/50" onclick={() => (statusExpanded = !statusExpanded)}>
        <Heart class="size-3.5" />
        <span>状态</span>
        {#if statusExpanded}<ChevronUp class="ml-auto size-3 opacity-50" />{:else}<ChevronDown class="ml-auto size-3 opacity-50" />{/if}
      </button>
      {#if statusExpanded}
        <div class="flex flex-col gap-2 px-3 pb-3">
          <!-- 姿态 + 行为 -->
          <div class="flex items-center gap-2 text-[11px]">
            <span class="text-stone-500">姿态</span>
            <span class="rounded bg-stone-700/60 px-1.5 py-0.5 text-stone-200">{mods.getLabel('status.' + liveStatus, liveStatus)}</span>
            <span class="text-stone-500">· 行为</span>
            <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">{BEHAVIOR_LABELS[liveBehavior] ?? liveBehavior}</span>
          </div>

          <!-- HP 进度条 -->
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-stone-500">生命值</span>
              <span class="font-mono text-[10px] text-stone-400">{Math.round(liveHp)}/{maxHp}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-stone-700">
              <div
                class="h-2 rounded-full transition-all {hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'}"
                style="width:{hpPct}%;"
              ></div>
            </div>
          </div>

          <!-- Org 进度条 -->
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-stone-500">组织度</span>
              <span class="font-mono text-[10px] text-stone-400">{Math.round(liveOrg)}/{maxOrg}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-stone-700">
              <div
                class="h-2 rounded-full bg-amber-400 transition-all"
                style="width:{orgPct}%;"
              ></div>
            </div>
          </div>

          <!-- 战斗属性 -->
          {#each combatRows as row}
            <div class="flex items-center gap-2 text-[11px]">
              <span class="{row.color}"><row.icon class="size-3" /></span>
              <span class="text-stone-500">{row.label}</span>
              <span class="ml-auto font-mono text-stone-300">{row.value}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- ═══ 传感器段 ═══ -->
      {#if sensorList.length > 0}
        <button class="flex w-full items-center gap-2 border-t border-stone-700/50 px-3 py-2 text-xs font-medium text-stone-400 hover:bg-stone-800/50" onclick={() => (sensorsExpanded = !sensorsExpanded)}>
          <Radio class="size-3.5" />
          <span>传感器 ({sensorList.length})</span>
          {#if sensorsExpanded}<ChevronUp class="ml-auto size-3 opacity-50" />{:else}<ChevronDown class="ml-auto size-3 opacity-50" />{/if}
        </button>
        {#if sensorsExpanded}
          <div class="flex flex-col gap-1 px-3 pb-2">
            {#each sensorList as sensor}
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-stone-400">{sensor.name}</span>
                <span class="font-mono text-stone-500">{sensor.range} km</span>
              </div>
            {/each}
          </div>
        {/if}
      {/if}

      <!-- ═══ 武器段 ═══ -->
      {#if weaponList.length > 0}
        <button class="flex w-full items-center gap-2 border-t border-stone-700/50 px-3 py-2 text-xs font-medium text-stone-400 hover:bg-stone-800/50" onclick={() => (weaponsExpanded = !weaponsExpanded)}>
          <Package class="size-3.5" />
          <span>组件 ({weaponList.length})</span>
          {#if weaponsExpanded}<ChevronUp class="ml-auto size-3 opacity-50" />{:else}<ChevronDown class="ml-auto size-3 opacity-50" />{/if}
        </button>
        {#if weaponsExpanded}
          <div class="flex flex-col gap-1 px-3 pb-2">
            {#each weaponList as weapon}
              <div class="text-[11px] text-stone-400">{weapon.label}</div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .unit-info-panel {
    position: fixed;
    top: 3.75rem;
    right: 1.25rem;
    width: 260px;
    border-radius: 0.75rem;
    background: rgba(20, 20, 20, 0.94);
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .unit-info-panel :global(div)::-webkit-scrollbar {
    width: 3px;
  }
  .unit-info-panel :global(div)::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
</style>
