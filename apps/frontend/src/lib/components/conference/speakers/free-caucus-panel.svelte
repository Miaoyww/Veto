<script lang="ts">
  /**
   * free-caucus-panel.svelte
   * ────────────────────────
   * 自由磋商 / 个人演讲面板 —— 总倒计时 + 暂停/恢复/结束控制。
   */
  import { onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { Timer, Coffee } from '@lucide/svelte'
  import PanelHeader from '$lib/components/conference/common/panel-header.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import {
    currentCommittee,
    saveConferencesNow,
    endCaucus,
    pauseCaucus,
    resumeCaucus
  } from '$lib/classes/stores/conference/conference-store'
  import { destroyTimer } from '$lib/classes/services/engine/conference-engine'
  import { formatTime } from '$lib/classes/formatters/time-formater'
  import { getDisplayBridge, buildDisplayData } from '$lib/classes/clients/conference-display-client'
  import { useCaucusCountdown } from '$lib/classes/services/hooks/use-caucus-countdown.svelte'
  import type { Committee } from '$lib/classes/domain/committee.svelte'

  const conf = $derived($currentCommittee)

  function getEngine(): Committee | null | undefined {
    return get(currentCommittee)
  }

  function syncDisplay(): void {
    const engine = getEngine()
    if (engine) getDisplayBridge().sendUpdate(buildDisplayData(engine))
  }

  const caucusCountdown = useCaucusCountdown({
    get enabled() {
      return true
    },
    timerId: 'caucus-countdown',
    getEngine,
    onExpire() {
      endCaucus()
      syncDisplay()
    },
    onTick(data) {
      getDisplayBridge().sendTimerTick({
        remainingSec: data.remainingSec,
        elapsedSec: data.elapsedSec,
        totalSec: caucusCountdown.totalSec,
        status: caucusCountdown.isCaucusPaused ? 'paused' : 'playing'
      })
    }
  })

  const progressPercent = $derived(
    caucusCountdown.totalSec > 0
      ? ((caucusCountdown.totalSec - caucusCountdown.totalRemainingSec) /
          caucusCountdown.totalSec) *
          100
      : 0
  )

  function pauseCaucusHandler(): void {
    caucusCountdown.isCaucusPaused = true
    pauseCaucus()
    syncDisplay()
  }

  function resumeCaucusHandler(): void {
    caucusCountdown.isCaucusPaused = false
    resumeCaucus()
    syncDisplay()
  }

  onDestroy(() => {
    saveConferencesNow()
    destroyTimer('caucus-countdown')
  })
</script>

<div class="flex w-full flex-col gap-4">
  {#if conf}
    <div class="flex flex-col items-center gap-6">
      <PanelHeader icon={Coffee} title="自由磋商" />

      <div class="text-center">
        {#if caucusCountdown.isCaucusPaused}
          <div class="mb-2 text-sm font-medium text-amber-500 uppercase tracking-wider">
            计时已暂停
          </div>
        {/if}
        <div
          class="font-mono text-7xl font-bold tabular-nums transition-colors"
          class:text-amber-500={caucusCountdown.isCaucusPaused}
          class:text-red-500={!caucusCountdown.isCaucusPaused &&
            caucusCountdown.totalRemainingSec <= 30}
          class:text-foreground={!caucusCountdown.isCaucusPaused &&
            caucusCountdown.totalRemainingSec > 30}
        >
          {formatTime(caucusCountdown.totalRemainingSec)}
        </div>
        <div class="mt-2 text-sm text-muted-foreground">
          剩余时间 · 已过 {formatTime(caucusCountdown.totalElapsedSec)}
        </div>
      </div>

      <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full transition-all duration-1000 {caucusCountdown.isCaucusPaused
            ? 'bg-amber-500'
            : caucusCountdown.totalRemainingSec <= 30
              ? 'bg-red-500'
              : 'bg-indigo-500'}"
          style="width: {progressPercent}%"
        ></div>
      </div>

      <Separator />

      <div class="flex gap-4">
        {#if caucusCountdown.isCaucusPaused}
          <Button variant="default" onclick={resumeCaucusHandler} class="min-w-[140px] gap-2">
            <Timer size={14} />
            恢复计时
          </Button>
        {:else}
          <Button variant="outline" onclick={pauseCaucusHandler} class="min-w-[140px] gap-2">
            暂停计时
          </Button>
        {/if}
        <Button variant="destructive" onclick={endCaucus} class="min-w-[140px] gap-2">
          <Timer size={14} />
          提前结束磋商
        </Button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Timer size={48} class="opacity-30" />
      <p class="text-lg font-medium">没有进行中的会议</p>
    </div>
  {/if}
</div>
