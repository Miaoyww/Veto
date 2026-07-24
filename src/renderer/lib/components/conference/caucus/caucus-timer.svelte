<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Timer, Coffee, MessageSquare, Users } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import ActiveSpeakerCard from '$lib/components/conference/speakers/active-speaker-card.svelte'
  import ReadySpeakerCard from '$lib/components/conference/speakers/ready-speaker-card.svelte'
  import {
    currentConference,
    endCaucus,
    advanceCaucusSpeaker,
    startCaucusSpeaker,
    pauseSpeaker,
    resumeSpeaker as resumeSpeakerStore
  } from '$lib/stores/conference/conference-store'
  import {
    createTimer,
    getTimer,
    destroyTimer
  } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'

  const conf = $derived($currentConference)
  const activeCaucus = $derived(conf?.activeCaucus ?? null)
  const motion = $derived(
    conf?.motions.find((m) => m.id === activeCaucus?.motionId) ?? null
  )

  // For unmoderated caucus — simple countdown
  let totalRemainingSec = $state(0)
  let totalElapsedSec = $state(0)
  let totalSec = $state(0)

  // For moderated caucus — per-speaker countdown from activeSpeaker
  let speakerRemainingSec = $state(0)
  let speakerElapsedSec = $state(0)
  let speakerTotalSec = $state(0)

  const isModerated = $derived(activeCaucus?.type === 'moderated')
  const speakers = $derived(activeCaucus?.caucusSpeakers ?? [])
  const currentIdx = $derived(activeCaucus?.currentSpeakerIndex ?? -1)
  const currentSpeaker = $derived(currentIdx >= 0 ? speakers[currentIdx] : null)

  let isPaused = $state(false)

  function handlePause(): void {
    const remaining = speakerRemainingSec
    getTimer('caucus')?.stop()
    isPaused = true
    pauseSpeaker()
  }

  function handleResume(): void {
    isPaused = false
    resumeSpeakerStore(speakerRemainingSec)
  }

  function handleEndSpeaker(): void {
    getTimer('caucus')?.stop()
    isPaused = false
    advanceCaucusSpeaker()
  }

  function handleYield(type: 'chair' | 'delegate' | 'question' | 'comment'): void {
    getTimer('caucus')?.stop()
    isPaused = false
    advanceCaucusSpeaker()
  }

  function handleStartSpeaker(): void {
    startCaucusSpeaker()
  }

  function handleCancelReadySpeaker(): void {
    // 跳过当前 ready 的发言人，推进到下一位
    getTimer('caucus')?.stop()
    isPaused = false
    advanceCaucusSpeaker()
  }

  const nextSpeaker = $derived(currentIdx >= 0 && currentIdx + 1 < speakers.length ? speakers[currentIdx + 1] : null)
  const remainingSpeakers = $derived(speakers.filter((s) => s.status === 'waiting'))

  // Per-speaker timer tick via activeSpeaker
  $effect(() => {
    const speaker = conf?.activeSpeaker
    if (!isModerated || !speaker) return
    // 暂停状态下不启动计时器（由 handleResume 恢复）
    if (speaker.pausedAt != null) return

    const totalAllocated = currentSpeaker?.allocatedTimeSec ?? 60
    speakerTotalSec = totalAllocated
    const now = Date.now()
    const remaining = Math.max(0, (speaker.endAt - now) / 1000)

    if (remaining > 0) {
      createTimer('caucus', 1000).start(
        remaining,
        (data) => {
          speakerRemainingSec = data.remainingSec
          speakerElapsedSec = data.elapsedSec
        },
        () => {
          // Speaker time expired → advance to next
          advanceCaucusSpeaker()
        }
      )
    }

    return () => {
      getTimer('caucus')?.stop()
    }
  })

  // Total countdown for unmoderated
  $effect(() => {
    if (!activeCaucus || isModerated) return

    const now = Date.now()
    const remaining = Math.max(0, (activeCaucus.endAt - now) / 1000)
    const total = (activeCaucus.endAt - activeCaucus.startedAt) / 1000

    if (remaining > 0) {
      createTimer('caucus', 1000).start(
        remaining,
        (data) => {
          totalRemainingSec = data.remainingSec
          totalElapsedSec = data.elapsedSec
          totalSec = total
        },
        () => endCaucus()
      )
    }

    return () => {
      getTimer('caucus')?.stop()
    }
  })

  // 组件卸载时销毁计时器
  onDestroy(() => destroyTimer('caucus'))

  const progressPercent = $derived(
    totalSec > 0 ? ((totalSec - totalRemainingSec) / totalSec) * 100 : 0
  )

  function handleEndCurrentSpeaker(): void {
    advanceCaucusSpeaker()
  }
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
        {#if (motion as any).topic}
          <p class="mt-2 text-lg font-medium text-indigo-600 dark:text-indigo-400">
            {(motion as any).topic}
          </p>
        {/if}
      {:else}
        <div class="flex items-center justify-center gap-2">
          <Coffee size={28} class="text-amber-500" />
          <h2 class="text-xl font-bold text-foreground">自由磋商</h2>
        </div>
      {/if}
    </div>

    {#if isModerated && currentSpeaker && currentSpeaker.status === 'ready'}
      <!-- 有主持磋商：当前发言人就绪（等待主席手动开始） -->
      <div class="w-full">
        <ReadySpeakerCard
          delegationName={currentSpeaker.delegationName}
          allocatedTimeSec={currentSpeaker.allocatedTimeSec}
          onstart={handleStartSpeaker}
          oncancel={handleCancelReadySpeaker}
        />
      </div>

      <!-- 剩余发言队列 -->
      {#if remainingSpeakers.length > 0}
        <div class="w-full rounded-lg border bg-card">
          <div class="flex items-center gap-2 px-4 py-2">
            <Users size={14} class="text-muted-foreground" />
            <span class="text-sm font-medium text-foreground">
              剩余发言 ({remainingSpeakers.length})
            </span>
          </div>
          <div class="divide-y">
            {#each remainingSpeakers as s}
              <div class="flex items-center gap-3 px-4 py-2">
                <span class="text-sm text-foreground">{s.delegationName}</span>
                <Badge variant="secondary" class="ml-auto text-[10px]">
                  {formatTime(s.allocatedTimeSec)}
                </Badge>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    {:else if isModerated && currentSpeaker && currentSpeaker.status === 'speaking'}
      <!-- 有主持磋商：当前发言人正在发言 -->
      <div class="w-full">
        <ActiveSpeakerCard
          delegationName={currentSpeaker.delegationName}
          remainingSec={speakerRemainingSec}
          elapsedSec={speakerElapsedSec}
          totalSec={speakerTotalSec}
          {isPaused}
          positionLabel={`${speakers.length} 人中第 ${currentIdx + 1} 位`}
          onpause={handlePause}
          onresume={handleResume}
          onend={handleEndSpeaker}
          onyield={handleYield}
        />
      </div>

      <!-- 下一位发言人 -->
      {#if nextSpeaker}
        <div class="w-full rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-amber-700 dark:text-amber-400">下一位</span>
            <span class="text-sm font-semibold text-foreground">{nextSpeaker.delegationName}</span>
          </div>
        </div>
      {/if}

      <!-- 剩余发言队列 -->
      {#if remainingSpeakers.length > 0}
        <div class="w-full rounded-lg border bg-card">
          <div class="flex items-center gap-2 px-4 py-2">
            <Users size={14} class="text-muted-foreground" />
            <span class="text-sm font-medium text-foreground">
              剩余发言 ({remainingSpeakers.length})
            </span>
          </div>
          <div class="divide-y">
            {#each remainingSpeakers as s}
              <div class="flex items-center gap-3 px-4 py-2">
                <span class="text-sm text-foreground">{s.delegationName}</span>
                <Badge variant="secondary" class="ml-auto text-[10px]">
                  {formatTime(s.allocatedTimeSec)}
                </Badge>
              </div>
            {/each}
          </div>
        </div>
      {:else if currentIdx + 1 >= speakers.length}
        <div class="text-sm text-muted-foreground">最后一位发言人</div>
      {/if}

    {:else if !isModerated}
      <!-- 自由磋商：总倒计时 -->
      <div class="text-center">
        <div
          class="font-mono text-7xl font-bold tabular-nums transition-colors"
          class:text-red-500={totalRemainingSec <= 30}
          class:text-foreground={totalRemainingSec > 30}
        >
          {formatTime(totalRemainingSec)}
        </div>
        <div class="mt-2 text-sm text-muted-foreground">
          剩余时间 · 已过 {formatTime(totalElapsedSec)}
        </div>
      </div>

      <!-- 进度条 -->
      <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full transition-all duration-1000 {totalRemainingSec <= 30 ? 'bg-red-500' : 'bg-indigo-500'}"
          style="width: {progressPercent}%"
        ></div>
      </div>

      <Separator />

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
        <p class="text-lg font-medium">等待发言...</p>
      </div>
    {/if}
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Timer size={48} class="opacity-30" />
      <p class="text-lg font-medium">没有进行中的磋商</p>
    </div>
  {/if}
</div>
