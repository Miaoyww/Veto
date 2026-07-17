<script lang="ts">
  import { currentBattle, selectedPlacedUnitId } from '$lib/stores/battle/battle-store'
  import { mapFlyTo } from '$lib/stores/battle/map-store'
  import type { ActionLogEntry, MessageCategory } from '$lib/types'
  import { Swords, Navigation, Settings, Calendar, ChevronDown, ChevronUp } from '@lucide/svelte'
  import { fly } from 'svelte/transition'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'

  let collapsed = $state(true)

  const CATEGORIES: Array<{ key: MessageCategory | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'combat', label: '战斗' },
    { key: 'movement', label: '移动' },
    { key: 'system', label: '系统' },
    { key: 'event', label: '事件' }
  ]

  let activeFilter = $state<MessageCategory | 'all'>('all')

  const CATEGORY_COLORS: Record<MessageCategory, string> = {
    combat: 'text-rose-500',
    movement: 'text-emerald-500',
    system: 'text-muted-foreground',
    event: 'text-amber-500'
  }

  const CATEGORY_ACTIVE_CLASS: Record<string, string> = {
    combat: 'bg-rose-500/20 text-rose-400',
    movement: 'bg-emerald-500/20 text-emerald-400',
    system: 'bg-muted text-foreground',
    event: 'bg-amber-500/20 text-amber-400'
  }

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  let filteredLogs = $derived(
    ((battle) => {
      if (!battle) return []
      let logs = [...battle.actionLog].reverse()
      if (activeFilter !== 'all') {
        logs = logs.filter((l) => (l.category ?? 'system') === activeFilter)
      }
      return logs.slice(0, 50)
    })($currentBattle)
  )

  function handleLogClick(entry: ActionLogEntry): void {
    if (entry.location) {
      mapFlyTo.set({ lat: entry.location.lat, lng: entry.location.lng })
    }
    if (entry.sourceUnitId) {
      selectedPlacedUnitId.set(entry.sourceUnitId)
    } else if (entry.targetUnitId) {
      selectedPlacedUnitId.set(entry.targetUnitId)
    }
  }

  let combatCount = $derived(
    ((battle) => {
      if (!battle) return 0
      return battle.actionLog.filter((l) => (l.category ?? 'system') === 'combat').length
    })($currentBattle)
  )
</script>

<div
  class="fixed bottom-2 left-2 z-[900] rounded-t-lg shadow-[0_-4px_24px_rgba(0,0,0,0.4)] {collapsed ? 'w-auto min-w-[140px]' : 'w-[340px] max-w-[calc(100vw-2.5rem)]'}"
  in:fly={{ y: 24, duration: 320, opacity: 0 }}
>
  {#if collapsed}
    <Button
      variant="ghost"
      class="flex w-full items-center gap-2 rounded-t-lg border border-border bg-card/95 px-3 py-1.5 text-xs font-medium backdrop-blur"
      onclick={() => (collapsed = false)}
    >
      <span>消息日志</span>
      {#if combatCount > 0}
        <Badge variant="outline" class="border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] text-rose-400">
          {combatCount}
        </Badge>
      {/if}
      <ChevronUp class="ml-auto size-3 text-muted-foreground" />
    </Button>
  {:else}
    <div class="flex h-60 flex-col rounded-t-lg border border-border bg-card/95 backdrop-blur">
      <!-- 标题栏 + 过滤栏 合并为一行 -->
      <div class="flex items-center gap-2 px-3 py-1.5">
        <span class="text-xs font-medium text-foreground">消息日志</span>
        <div class="flex gap-0.5">
          {#each CATEGORIES as cat (cat.key)}
            <button
              class="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {activeFilter === cat.key
                ? (CATEGORY_ACTIVE_CLASS[cat.key] ?? 'bg-muted text-foreground')
                : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => (activeFilter = cat.key)}
            >
              {cat.label}
            </button>
          {/each}
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="ml-auto size-5 text-muted-foreground hover:text-foreground"
          onclick={() => (collapsed = true)}
        >
          <ChevronDown class="size-3.5" />
        </Button>
      </div>

      <!-- 日志列表 -->
      <div class="flex-1 overflow-y-auto border-t border-border">
        {#if filteredLogs.length === 0}
          <p class="px-3 py-4 text-center text-[11px] text-muted-foreground">暂无日志</p>
        {:else}
          {#each filteredLogs as entry (entry.id)}
            <button
              class="flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/60 {entry.read ? 'opacity-50' : ''}"
              onclick={() => handleLogClick(entry)}
            >
              <span class="mt-0.5 flex-shrink-0 {CATEGORY_COLORS[entry.category ?? 'system']}">
                {#if (entry.category ?? 'system') === 'combat'}
                  <Swords class="size-3" />
                {:else if (entry.category ?? 'system') === 'movement'}
                  <Navigation class="size-3" />
                {:else if (entry.category ?? 'system') === 'event'}
                  <Calendar class="size-3" />
                {:else}
                  <Settings class="size-3" />
                {/if}
              </span>
              <span class="flex-shrink-0 text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
              <span class="min-w-0 flex-1 truncate text-[11px] text-foreground">{entry.message}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
