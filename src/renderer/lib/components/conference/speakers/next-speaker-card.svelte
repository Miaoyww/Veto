<script lang="ts">
  /**
   * next-speaker-card.svelte
   * ─────────────────────────
   * 可复用的「下一位发言人」卡片。
   *
   * 覆盖两种场景：
   *  - caucus 区：紧凑型，标签 + 名称内联
   *  - general debate 区：完整型，带时间徽章 + "发言"按钮 + 大号名称
   */
  import { Mic } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { formatTime } from '$lib/utils'

  interface Props {
    label: string
    delegationName: string
    allocatedTimeSec?: number
    showPrepareButton?: boolean
    onprepare?: () => void
    /** 当没有下一位时显示的提示文字 */
    exhaustedLabel?: string
    isExhausted?: boolean
  }

  let {
    label,
    delegationName,
    allocatedTimeSec,
    showPrepareButton = false,
    onprepare,
    exhaustedLabel,
    isExhausted = false
  }: Props = $props()

  const compact = $derived(!showPrepareButton)
</script>

{#if isExhausted && exhaustedLabel}
  <div class="text-sm text-muted-foreground">{exhaustedLabel}</div>
{:else}
  <div
    class="rounded-lg {compact ? 'border' : 'border-2'} border-amber-200 bg-amber-50/50 {compact
      ? 'p-3'
      : 'p-4'} dark:border-amber-800 dark:bg-amber-950/20"
    class:w-full={compact}
  >
    <div class="flex items-center gap-3">
      <span class="text-xs font-medium text-amber-700 dark:text-amber-400">{label}</span>
      {#if compact}
        <span class="text-sm font-semibold text-foreground">{delegationName}</span>
      {:else}
        <div class="flex-1"></div>
        <Badge variant="secondary" class="text-[10px]">{formatTime(allocatedTimeSec!)}</Badge>
        <div class="flex flex-col items-center">
          <Button
            size="sm"
            class="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
            onclick={() => onprepare?.()}
          >
            <Mic size={12} />
            准备发言
          </Button>
          <span class="select-none font-mono text-[10px] leading-none text-muted-foreground/40">
            Space
          </span>
        </div>
      {/if}
    </div>
    {#if !compact}
      <div class="mt-2 text-lg font-semibold text-foreground">{delegationName}</div>
    {/if}
  </div>
{/if}
