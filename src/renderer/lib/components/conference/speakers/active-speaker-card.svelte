<script lang="ts">
  /**
   * active-speaker-card.svelte
   * ──────────────────────────
   * 可复用的「正在发言」卡片 —— 显示当前发言人名称、倒计时、发言控制按钮。
   */
  import SpeakerControls from '$lib/components/conference/speakers/speaker-controls.svelte'
  import { formatTime } from '$lib/utils'
  import type { YieldType } from '$lib/types-conference'

  interface Props {
    delegationName: string
    remainingSec: number
    elapsedSec: number
    totalSec: number
    isPaused?: boolean
    canYield?: boolean
    yieldNote?: string
    /** "N 人中第 X 位" 的可选副标题 */
    positionLabel?: string
    onpause?: () => void
    onresume?: () => void
    onend?: () => void
    onyield?: (type: YieldType) => void
  }

  let {
    delegationName,
    remainingSec,
    elapsedSec,
    totalSec,
    isPaused = false,
    canYield = true,
    yieldNote,
    positionLabel,
    onpause,
    onresume,
    onend,
    onyield
  }: Props = $props()

  const isUrgent = $derived(remainingSec <= 10 && !isPaused)
</script>

<div
  class="rounded-lg border-2 p-6 text-center transition-colors {isUrgent
    ? 'animate-pulse border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'}"
>
  <div
    class="text-sm font-medium {isUrgent
      ? 'text-red-600 dark:text-red-400'
      : 'text-emerald-700 dark:text-emerald-400'}"
  >
    {isPaused ? '计时已暂停' : isUrgent ? '⚠ 时间即将耗尽' : '正在发言'}
  </div>
  <div class="mt-1 text-2xl font-bold text-foreground">
    {delegationName}
  </div>
  {#if positionLabel}
    <div class="mt-0.5 text-xs text-muted-foreground">{positionLabel}</div>
  {/if}
  <div
    class="mt-3 font-mono text-5xl font-bold tabular-nums {isPaused
      ? 'text-muted-foreground'
      : isUrgent
        ? 'text-red-500'
        : 'text-foreground'}"
  >
    {formatTime(remainingSec)}
  </div>
  <div class="mt-1 text-xs text-muted-foreground">
    已用 {Math.floor(elapsedSec)}秒 / 共 {totalSec}秒
  </div>

  <div class="mt-4">
    <SpeakerControls {isPaused} {canYield} {onpause} {onresume} {onend} {onyield} />
  </div>
  {#if yieldNote}
    <div class="mt-2 text-xs text-amber-600 dark:text-amber-400">{yieldNote}</div>
  {/if}
</div>
