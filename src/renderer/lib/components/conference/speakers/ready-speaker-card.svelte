<script lang="ts">
  /**
   * ready-speaker-card.svelte
   * ─────────────────────────
   * 可复用的「即将发言」卡片 —— 显示已准备就绪的发言人，提供开始计时/取消按钮。
   */
  import { Play, Trash2 } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { formatTime } from '$lib/utils'

  interface Props {
    delegationName: string
    allocatedTimeSec: number
    onstart?: () => void
    oncancel?: () => void
  }

  let { delegationName, allocatedTimeSec, onstart, oncancel }: Props = $props()
</script>

<div
  class="rounded-lg border-2 border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-700 dark:bg-amber-950/30"
>
  <div class="text-sm font-medium text-amber-700 dark:text-amber-400">即将发言</div>
  <div class="mt-1 text-2xl font-bold text-foreground">
    {delegationName}
  </div>
  <div class="mt-1 font-mono text-lg text-muted-foreground">
    {formatTime(allocatedTimeSec)}
  </div>
  <div class="mt-4 flex items-center justify-center gap-2">
    <Button
      size="sm"
      class="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
      onclick={() => onstart?.()}
    >
      <Play size={12} />
      开始计时
    </Button>
    <Button
      size="sm"
      variant="ghost"
      class="h-8 text-xs text-muted-foreground"
      onclick={() => oncancel?.()}
    >
      <Trash2 size={12} class="mr-1" />
      取消
    </Button>
  </div>
</div>
