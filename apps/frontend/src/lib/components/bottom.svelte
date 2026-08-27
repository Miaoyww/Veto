<script lang="ts">
  import SettingsButton from '$lib/components/buttons/settings-button.svelte'
  import { Button } from '$lib/components/ui/button'
    import { leftBarPinned, unitsCardOpen, unitDragEnabled } from '$lib/classes/stores/battle/battle-ui-store'
  import {
    interactionMode,
    saveBattleWithToast,
    selectFaction,
    selectedPlacedUnitId,
    selectedPlacedUnit,
    autoAttackEnabled,
    clearRoute,
    updatePlacedUnit,
    addLog
  } from '$lib/classes/stores/battle/battle-store'
  import { Activity, Ruler, Save, Swords, Crosshair, X, Zap, Hand } from '@lucide/svelte'
  import { coords } from '$lib/classes/stores/battle/map-store'
  import { fly } from 'svelte/transition'

  let lat = $derived($coords.lat.toFixed(5))
  let lng = $derived($coords.lng.toFixed(5))

  function toggleLeftSidebar(): void {
    selectFaction('')
    leftBarPinned.update((prev: boolean) => !prev)
  }

  function handleAttackMode(): void {
    const mode = $interactionMode
    interactionMode.set(mode === 'attack' ? 'select' : 'attack')
  }

  function handleCancelTask(): void {
    const placedId = $selectedPlacedUnitId
    const placed = $selectedPlacedUnit
    if (!placedId || !placed) return
    const unitName = $selectedPlacedUnit?.unitId ?? '单位'
    clearRoute(placedId)
    updatePlacedUnit(placedId, { attackTargetId: undefined })
    addLog(`取消任务: ${unitName}`)
  }

  function toggleAutoAttack(): void {
    autoAttackEnabled.update((v) => !v)
  }

  function toggleUnitDrag(): void {
    unitDragEnabled.update((v) => !v)
  }
</script>

<div
  class="absolute right-5 bottom-5 left-5 z-10 flex items-center justify-center"
  in:fly={{ y: 8, duration: 320, opacity: 0, delay: 60 }}
>
  <div class="veto-card h-12 gap-2">
    <Button
      variant="ghost"
      size="icon"
      title="打开左侧栏"
      class={$leftBarPinned ? 'text-foreground' : ''}
      onclick={toggleLeftSidebar}
    >
      <Swords />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      title="测量距离 (M)"
      class={$interactionMode === 'measure' ? 'text-amber-500' : ''}
      onclick={() => interactionMode.set($interactionMode === 'measure' ? 'select' : 'measure')}
    >
      <Ruler />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      title="推演单位态势"
      class={$unitsCardOpen ? 'text-foreground' : ''}
      onclick={() => ($unitsCardOpen = !$unitsCardOpen)}
    >
      <Activity />
    </Button>
    <!-- Phase 9: 手动攻击 -->
    <Button
      variant="ghost"
      size="icon"
      title="手动攻击 (A)"
      class={$interactionMode === 'attack' ? 'text-rose-500' : ''}
      disabled={!$selectedPlacedUnitId}
      onclick={handleAttackMode}
    >
      <Crosshair />
    </Button>
    <!-- Phase 9: 取消任务 -->
    <Button
      variant="ghost"
      size="icon"
      title="取消任务 (X)"
      disabled={!$selectedPlacedUnitId}
      onclick={handleCancelTask}
    >
      <X />
    </Button>
    <!-- Phase 9: 自动索敌开关 -->
    <Button
      variant="ghost"
      size="icon"
      title={$autoAttackEnabled ? '自动攻击 (开启)' : '自动攻击 (关闭)'}
      class={$autoAttackEnabled ? 'text-amber-500' : ''}
      onclick={toggleAutoAttack}
    >
      <Zap />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      title={$unitDragEnabled ? '单位拖拽 (开启) (D)' : '单位拖拽 (关闭) (D)'}
      class={!$unitDragEnabled ? '' : 'text-amber-500'}
      onclick={toggleUnitDrag}
    >
      <Hand />
    </Button>
    <Button variant="ghost" size="icon" title="保存 (Ctrl+S)" onclick={saveBattleWithToast}>
      <Save />
    </Button>
    <div class="settings-wrap">
      <SettingsButton />
    </div>
  </div>

  <div class="veto-card absolute right-0 h-12">
    <span class="font-mono text-xs text-muted-foreground">{lat}, {lng}</span>
  </div>
</div>
