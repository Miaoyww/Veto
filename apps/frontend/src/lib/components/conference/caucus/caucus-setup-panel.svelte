<script lang="ts">
  /**
   * caucus-setup-panel.svelte
   * ─────────────────────────
   * 磋商发言名单设置面板（caucus_setup phase）。
   * 主席团设置动议席位标首/标尾，添加发言席位。
   */
  import { Users, Play, GripVertical } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { currentCommittee } from '$lib/classes/stores/conference/conference-store'
  import {
    setCaucusProposerPosition,
    addToCaucusSpeakers,
    removeFromCaucusSpeakers,
    startCaucusWithSetup,
    endCaucus
  } from '$lib/classes/stores/conference/conference-store'
  import SeatSelector from '$lib/components/conference/common/seat-selector.svelte'
  import type { ParticipantSeat } from '$lib/classes/types/conference'

  const conf = $derived($currentCommittee)
  const setup = $derived(conf?.caucusSetup ?? null)
  const motion = $derived(setup ? conf?.motions.find((m) => m.id === setup.motionId) : null)
  const proposerSeat = $derived(
    motion ? conf?.participantSeats.find((seat) => seat.id === motion.proposedBySeatId) ?? null : null
  )

  // 已在名单中的席位 ID（用于排除）
  const listedIds = $derived(setup?.speakerSeatIds ?? [])

  // 容量计算：总时间 / 每人发言时间 = 最多可容纳代表数
  const perSpeakerSec = $derived((motion as any)?.speakingTimePerPersonSec ?? 60)
  const totalSec = $derived(setup?.remainingSec ?? (motion as any)?.totalTimeSec ?? 0)
  const maxSpeakers = $derived(Math.max(1, Math.floor(totalSec / perSpeakerSec)))
  const isAtCapacity = $derived(listedIds.length >= maxSpeakers)

  function handleAdd(d: ParticipantSeat): void {
    addToCaucusSpeakers(d.id)
  }

  function handleRemove(seatId: string): void {
    removeFromCaucusSpeakers(seatId)
  }

  function togglePosition(): void {
    if (!setup) return
    setCaucusProposerPosition(setup.proposerPosition === 'first' ? 'last' : 'first')
  }

  function handleStart(): void {
    startCaucusWithSetup()
  }
</script>

<div class="flex w-full flex-col gap-6">
  {#if conf && setup && motion}
    <!-- 动议信息摘要 -->
    <div
      class="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-5 text-center dark:border-indigo-700 dark:bg-indigo-950/30"
    >
      {#if setup.remainingSec != null}
        <div class="text-sm font-medium text-amber-700 dark:text-amber-400">
          名单已走完 · 继续添加发言人
        </div>
      {:else}
        <div class="text-sm font-medium text-indigo-700 dark:text-indigo-400">
          动议通过 · 设置磋商发言名单
        </div>
      {/if}
      <div class="mt-2 text-xl font-bold text-foreground">
        {(motion as any).topic ?? '有主持核心磋商'}
      </div>
      <div class="mt-1 text-sm text-muted-foreground">
        {#if setup.remainingSec != null}
          剩余时间 {setup.remainingSec} 秒 · 每人 {(motion as any).speakingTimePerPersonSec} 秒
        {:else}
          总时长 {(motion as any).totalTimeSec} 秒 · 每人 {(motion as any).speakingTimePerPersonSec} 秒
        {/if}
      </div>
    </div>
    <!-- 开始磋商 -->
    <div class="flex justify-center gap-4">
      <Button size="lg" class="gap-2 min-w-[200px]" onclick={handleStart}>
        <Play size={18} />
        开始磋商
      </Button>
      <Button size="lg" variant="destructive" class="gap-2 min-w-[200px]" onclick={endCaucus}>
        <Play size={18} />
        结束磋商
      </Button>
    </div>
    <!-- 动议国位置 -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-foreground">动议国发言位置</div>
          <div class="mt-0.5 text-xs text-muted-foreground">
            {proposerSeat?.name ?? '动议提出方'}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant={setup.proposerPosition === 'first' ? 'default' : 'outline'}
            class="h-8 text-xs"
            onclick={togglePosition}
          >
            标首（第一个发言）
          </Button>
          <Button
            size="sm"
            variant={setup.proposerPosition === 'last' ? 'default' : 'outline'}
            class="h-8 text-xs"
            onclick={togglePosition}
          >
            标尾（最后一个发言）
          </Button>
        </div>
      </div>
    </div>

    <!-- 添加发言席位 -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center gap-2">
        <Users size={16} class="text-muted-foreground" />
        <span class="text-sm font-medium text-foreground">添加发言席位</span>
        <span class="ml-auto text-xs text-muted-foreground">
          最多 {maxSpeakers} 人 · 已添加 {listedIds.length} 人
        </span>
      </div>
      <div class="mt-3">
        {#if isAtCapacity}
          <div
            class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
          >
            名单已满（{totalSec}秒 ÷ {perSpeakerSec}秒/人 = {maxSpeakers}人）
          </div>
        {:else}
          <SeatSelector
            seats={conf.participantSeats}
            placeholder="搜索并添加席位..."
            resetOnSelect={true}
            excludeIds={listedIds}
            onselect={handleAdd}
          />
        {/if}
      </div>
    </div>

    <!-- 当前发言名单 -->
    <div class="rounded-lg border bg-card">
      <div class="flex items-center gap-2 px-4 py-3">
        <GripVertical size={14} class="text-muted-foreground" />
        <span class="text-sm font-medium text-foreground">
          磋商发言名单 ({listedIds.length}/{maxSpeakers})
        </span>
      </div>

      {#if listedIds.length === 0}
        <div class="px-4 pb-4 text-center text-xs text-muted-foreground">
          名单为空，请添加席位
        </div>
      {:else}
        <div class="divide-y">
          {#each listedIds as delId, i}
            {@const del = conf.seats.find((d) => d.id === delId)}
            {#if del}
              <div class="flex items-center gap-3 px-4 py-2.5">
                <span class="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span class="min-w-0 flex-1 text-sm text-foreground">{del.name}</span>
                {#if proposerSeat?.id === delId}
                  <Badge variant="outline" class="text-[10px]">动议席位</Badge>
                {/if}
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-7 text-xs text-muted-foreground hover:text-red-500"
                  onclick={() => handleRemove(delId)}
                >
                  移除
                </Button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    <Separator />
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Users size={48} class="opacity-30" />
      <p class="text-lg font-medium">磋商设置未就绪</p>
    </div>
  {/if}
</div>
