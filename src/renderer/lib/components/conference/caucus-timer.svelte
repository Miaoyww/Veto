<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Timer, Coffee, MessageSquare } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import {
    currentConference,
    endCaucus
  } from '$lib/stores/conference/conference-store'
  import {
    startCaucusTimer,
    stopCaucusTimer,
    formatTime
  } from '$lib/engine/conference-engine'

  const conf = $derived($currentConference)
  const activeCaucus = $derived(conf?.activeCaucus ?? null)
  const motion = $derived(
    conf?.motions.find((m) => m.id === activeCaucus?.motionId) ?? null
  )

  let remainingSec = $state(0)
  let elapsedSec = $state(0)
  let totalSec = $state(0)

  $effect(() => {
    if (activeCaucus) {
      const now = Date.now()
      const remaining = Math.max(0, (activeCaucus.endAt - now) / 1000)
      const total = (activeCaucus.endAt - activeCaucus.startedAt) / 1000

      if (remaining > 0) {
        startCaucusTimer(
          remaining,
          (data) => {
            remainingSec = data.remainingSec
            elapsedSec = data.elapsedSec
            totalSec = total
          },
          () => {
            // 自动结束磋商
            endCaucus()
          }
        )
      } else {
        endCaucus()
      }
    }

    return () => {
      stopCaucusTimer()
    }
  })

  const isModerated = $derived(activeCaucus?.type === 'moderated')
  const progressPercent = $derived(totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0)
</script>

<div class="flex w-full max-w-xl flex-col items-center gap-8">
  {#if activeCaucus && motion}
    <!-- 磋商类型和主题 -->
    <div class="text-center">
      {#if isModerated}
        <div class="flex items-center justify-center gap-2">
          <MessageSquare size={28} class="text-indigo-500" />
          <h2 class="text-xl font-bold text-foreground">有主持核心磋商</h2>
        </div>
        {#if motion.type === 'moderated_caucus'}
          <p class="mt-2 text-lg font-medium text-indigo-600 dark:text-indigo-400">
            {motion.topic}
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            每人 {motion.speakingTimePerPersonSec}秒 · 最多 {motion.maxSpeakers} 人
          </p>
        {/if}
      {:else}
        <div class="flex items-center justify-center gap-2">
          <Coffee size={28} class="text-amber-500" />
          <h2 class="text-xl font-bold text-foreground">自由磋商</h2>
        </div>
      {/if}
    </div>

    <!-- 大倒计时 -->
    <div class="text-center">
      <div
        class="font-mono text-7xl font-bold tabular-nums transition-colors"
        class:text-red-500={remainingSec <= 30}
        class:text-foreground={remainingSec > 30}
      >
        {formatTime(remainingSec)}
      </div>
      <div class="mt-2 text-sm text-muted-foreground">
        剩余时间 · 已过 {formatTime(elapsedSec)}
      </div>
    </div>

    <!-- 进度条 -->
    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        class="h-full rounded-full transition-all duration-1000 {remainingSec <= 30 ? 'bg-red-500' : 'bg-indigo-500'}"
        style="width: {progressPercent}%"
      ></div>
    </div>

    <Separator />

    <!-- 控制 -->
    <div class="flex gap-4">
      <Button
        variant="destructive"
        onclick={endCaucus}
        class="min-w-[140px] gap-2"
      >
        <Timer size={14} />
        提前结束磋商
      </Button>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Timer size={48} class="opacity-30" />
      <p class="text-lg font-medium">没有进行中的磋商</p>
    </div>
  {/if}
</div>
