<script lang="ts">
  import { currentBattle, selectedPlacedUnitId } from '$lib/stores/battle/battle-store';
  import { mapFlyTo } from '$lib/stores/battle/map-store';
  import type { ActionLogEntry, MessageCategory } from '$lib/types';
  import { Swords, Navigation, Settings, Calendar, ChevronDown, ChevronUp, X } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  // ── 面板开关 ──
  let collapsed = $state(false);
  let showBubble = $state(true);
  let showPopup = $state(false);

  // ── 过滤 ──
  const CATEGORIES: Array<{ key: MessageCategory | 'all'; label: string; icon: any }> = [
    { key: 'all', label: '全部', icon: null },
    { key: 'combat', label: '战斗', icon: Swords },
    { key: 'movement', label: '移动', icon: Navigation },
    { key: 'system', label: '系统', icon: Settings },
    { key: 'event', label: '事件', icon: Calendar }
  ];

  let activeFilter = $state<MessageCategory | 'all'>('all');

  const CATEGORY_COLORS: Record<MessageCategory, string> = {
    combat: 'text-rose-500',
    movement: 'text-emerald-500',
    system: 'text-stone-400',
    event: 'text-amber-500'
  };

  const CATEGORY_BG: Record<MessageCategory, string> = {
    combat: 'bg-rose-500/10',
    movement: 'bg-emerald-500/10',
    system: 'bg-stone-500/10',
    event: 'bg-amber-500/10'
  };

  // ── 格式化时间 ──
  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ── 过滤后的日志列表 ──
  let filteredLogs = $derived(
    ((battle) => {
      if (!battle) return [];
      let logs = [...battle.actionLog].reverse();
      if (activeFilter !== 'all') {
        logs = logs.filter((l) => (l.category ?? 'system') === activeFilter);
      }
      return logs.slice(0, 50);
    })($currentBattle)
  );

  // ── 点击日志：定位到事发位置 ──
  function handleLogClick(entry: ActionLogEntry) {
    if (entry.location) {
      mapFlyTo.set({ lat: entry.location.lat, lng: entry.location.lng });
    }
    if (entry.sourceUnitId) {
      selectedPlacedUnitId.set(entry.sourceUnitId);
    } else if (entry.targetUnitId) {
      selectedPlacedUnitId.set(entry.targetUnitId);
    }
  }
</script>

<div
  class="message-log-container {collapsed ? 'collapsed' : ''}"
  in:fly={{ y: 24, duration: 320, opacity: 0 }}
>
  {#if collapsed}
    <!-- ── 折叠状态：仅标题栏 ── -->
    <button
      class="flex w-full items-center gap-2 rounded-t-lg bg-stone-900/90 px-3 py-1.5 text-xs font-medium text-stone-300 backdrop-blur"
      onclick={() => (collapsed = false)}
    >
      <Swords class="size-3.5 text-amber-400" />
      <span>消息日志</span>
      {#if $currentBattle}
        {@const combatCount = $currentBattle.actionLog.filter((l) => (l.category ?? 'system') === 'combat').length}
        {#if combatCount > 0}
          <span class="rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-400">{combatCount}</span>
        {/if}
      {/if}
      <ChevronUp class="ml-auto size-3 opacity-50" />
    </button>
  {:else}
    <!-- ── 展开状态 ── -->
    <div class="flex flex-col rounded-t-lg bg-stone-900/90 backdrop-blur">
      <!-- 标题栏 -->
      <div class="flex items-center gap-2 border-b border-stone-700/50 px-3 py-1.5">
        <Swords class="size-3.5 text-amber-400" />
        <span class="text-xs font-medium text-stone-300">消息日志</span>
        <div class="ml-auto flex items-center gap-1">
          <!-- 气泡开关 -->
          <button
            title="地图气泡"
            class="rounded px-1.5 py-0.5 text-[10px] {showBubble ? 'bg-amber-500/20 text-amber-400' : 'text-stone-500'}"
            onclick={() => (showBubble = !showBubble)}
          >
            ☐ 气泡
          </button>
          <!-- 弹窗开关 -->
          <button
            title="重要消息弹窗"
            class="rounded px-1.5 py-0.5 text-[10px] {showPopup ? 'bg-amber-500/20 text-amber-400' : 'text-stone-500'}"
            onclick={() => (showPopup = !showPopup)}
          >
            ☐ 弹窗
          </button>
          <!-- 收起 -->
          <button class="ml-1 rounded p-0.5 text-stone-500 hover:text-stone-300" onclick={() => (collapsed = true)}>
            <ChevronDown class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- 过滤栏 -->
      <div class="flex gap-0.5 border-b border-stone-700/50 px-2 py-1">
        {#each CATEGORIES as cat}
          <button
            class="rounded px-2 py-0.5 text-[10px] font-medium transition-colors {activeFilter === cat.key
              ? cat.key === 'combat'
                ? 'bg-rose-500/20 text-rose-400'
                : cat.key === 'movement'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : cat.key === 'event'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-stone-500/20 text-stone-300'
              : 'text-stone-500 hover:text-stone-300'}"
            onclick={() => (activeFilter = cat.key)}
          >
            {cat.label}
          </button>
        {/each}
      </div>

      <!-- 日志列表 -->
      <div class="max-h-[180px] overflow-y-auto">
        {#if filteredLogs.length === 0}
          <p class="px-3 py-4 text-center text-[11px] text-stone-600">暂无日志</p>
        {:else}
          {#each filteredLogs as entry (entry.id)}
            <button
              class="flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-stone-800/60 {entry.read ? 'opacity-50' : ''}"
              onclick={() => handleLogClick(entry)}
            >
              <!-- 类别图标 -->
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
              <!-- 时间 -->
              <span class="flex-shrink-0 text-[10px] text-stone-600">{formatTime(entry.timestamp)}</span>
              <!-- 消息内容 -->
              <span class="min-w-0 flex-1 truncate text-[11px] text-stone-300">{entry.message}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .message-log-container {
    position: fixed;
    bottom: 4.5rem;
    left: 1.25rem;
    z-index: 900;
    width: 340px;
    max-width: calc(100vw - 2.5rem);
    border-radius: 0.75rem 0.75rem 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  }

  .message-log-container.collapsed {
    width: auto;
    min-width: 140px;
  }

  /* 自定义滚动条 */
  .message-log-container :global(div)::-webkit-scrollbar {
    width: 3px;
  }
  .message-log-container :global(div)::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
</style>
