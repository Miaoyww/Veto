<script lang="ts">
  /**
   * waiting-speaker-list.svelte
   * ──────────────────────────────
   * 可复用的「等待发言队列」组件 —— 显示排队中的发言人列表。
   *
   * 覆盖三种场景：
   *  - caucus ready / active 区：「剩余发言」简单列表
   *  - general debate 区：「发言队列」增强列表（序号 + 删除 + 空状态）
   */
  import { Users, Trash2 } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { formatTime } from '$lib/classes/formatters/time-formater'

  interface Speaker {
    id: string
    seatName: string
    allocatedTimeSec: number
  }

  interface Props {
    title: string
    speakers: Speaker[]
    showIndex?: boolean
    showDelete?: boolean
    disabled?: boolean
    emptyMessage?: string
    ondelete?: (id: string) => void
  }

  let {
    title,
    speakers,
    showIndex = false,
    showDelete = false,
    disabled = false,
    emptyMessage,
    ondelete
  }: Props = $props()
</script>

<div class="rounded-lg border bg-card">
  <div class="flex items-center gap-2 px-4 py-{showDelete ? '3' : '2'}">
    <Users size={14} class="text-muted-foreground" />
    <span class="text-sm font-medium text-foreground">{title} ({speakers.length})</span>
  </div>

  {#if speakers.length === 0 && emptyMessage}
    <div class="px-4 pb-4 text-center text-xs text-muted-foreground">{emptyMessage}</div>
  {:else}
    <div class="divide-y">
      {#each speakers as entry, i}
        <div class="flex items-center gap-3 px-4 py-{showDelete ? '2.5' : '2'}">
          {#if showIndex}
            <span class="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
          {/if}
          <span class="min-w-0 flex-1 text-sm text-foreground">{entry.seatName}</span>
          <Badge variant="secondary" class="ml-auto text-[10px]">{formatTime(entry.allocatedTimeSec)}</Badge>
          {#if showDelete}
            <Button
              size="sm"
              variant="ghost"
              class="h-7 text-xs text-muted-foreground hover:text-red-500"
              {disabled}
              onclick={() => ondelete?.(entry.id)}
            >
              <Trash2 size={12} />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
