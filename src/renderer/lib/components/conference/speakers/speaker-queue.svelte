<script lang="ts">
  /**
   * speaker-queue.svelte
   * ──────────────────────────────────────────────
   * 统一的发言队列 + 计时器组件。
   *
   * mode='general_debate' → 主发言名单（添加/删除/让渡/逐人计时）
   * mode='caucus'         → 磋商（有主持逐人计时 + 总时间预算 + 自由磋商倒计时）
   */
  import { onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import {
    Timer, Coffee, MessageSquare
  } from '@lucide/svelte'
  import ActiveSpeakerCard from '$lib/components/conference/speakers/active-speaker-card.svelte'
  import ReadySpeakerCard from '$lib/components/conference/speakers/ready-speaker-card.svelte'
  import WaitingSpeakerList from '$lib/components/conference/speakers/waiting-speaker-list.svelte'
  import NextSpeakerCard from '$lib/components/conference/speakers/next-speaker-card.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'
  import {
    currentConference,
    // general_debate
    addToSpeakersList,
    removeFromSpeakersList,
    readySpeaker,
    startSpeaker,
    pauseSpeaker,
    resumeSpeaker,
    endSpeaker,
    handleYield,
    saveConferencesNow,
    // caucus
    endCaucus,
    advanceCaucusSpeaker,
    startCaucusSpeaker,
    pauseCaucus,
    resumeCaucus
  } from '$lib/stores/conference/conference-store'
  import {
    createTimer,
    getTimer,
    destroyTimer
  } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import type { YieldType } from '$lib/types-conference'

  let { mode }: { mode: 'general_debate' | 'caucus' } = $props()

  const conf = $derived($currentConference)
  const isCaucus = $derived(mode === 'caucus')
  const activeCaucus = $derived(conf?.activeCaucus ?? null)
  const isModerated = $derived(activeCaucus?.type === 'moderated')

  // ── 发言队列数据（按 mode 取不同数据源）──────────────────────────
  const rawSpeakers = $derived(
    mode === 'general_debate'
      ? (conf?.speakersList ?? [])
      : (activeCaucus?.caucusSpeakers ?? [])
  )

  // 统一格式：id, delegationName, status, allocatedTimeSec
  const speakers = $derived(
    rawSpeakers.map((s: any) => ({
      id: s.id ?? s.delegationId,
      delegationName: s.delegationName ?? (conf?.delegations.find((d: any) => d.id === s.delegationId)?.name ?? ''),
      status: s.status as 'waiting' | 'ready' | 'speaking',
      allocatedTimeSec: s.allocatedTimeSec ?? 120
    }))
  )

  const activeEntry = $derived(speakers.find((s: any) => s.status === 'speaking') ?? null)
  const readyEntry = $derived(speakers.find((s: any) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(speakers.filter((s: any) => s.status === 'waiting'))
  const currentIdx = $derived(activeCaucus?.currentSpeakerIndex ?? -1)
  const caucusCurrentSpeaker = $derived(
    isCaucus && currentIdx >= 0 ? speakers[currentIdx] : null
  )

  // 当前活跃的发言人（有主持/一般性辩论）
  const activeSpeaker = $derived(isCaucus ? caucusCurrentSpeaker : activeEntry)

  // ── 计时器状态 ─────────────────────────────────────────────────
  let displayRemaining = $state(0)
  let displayElapsed = $state(0)
  let displayTotal = $state(0)
  let isPaused = $state(false)

  // 自由磋商状态
  let totalRemainingSec = $state(0)
  let totalElapsedSec = $state(0)
  let totalSec = $state(0)
  let isCaucusPaused = $state(false)

  const isSpeakerActive = $derived(activeSpeaker !== null && activeSpeaker?.status === 'speaking')

  // ── 总时间预算（caucus only）───────────────────────────────────
  const totalBudgetRemaining = $derived(
    activeCaucus ? Math.max(0, (activeCaucus.endAt - Date.now()) / 1000) : 0
  )
  const totalBudgetSec = $derived(
    activeCaucus ? (activeCaucus.endAt - activeCaucus.startedAt) / 1000 : 0
  )

  // 名单耗尽相关
  const isListExhausted = $derived(
    isCaucus && isModerated && currentIdx >= speakers.length && speakers.length > 0
  )

  // ── DelegationSelector 相关（general_debate only）───────────────
  const listedDelegationIds = $derived(
    mode === 'general_debate'
      ? (conf?.speakersList.map((s: any) => s.delegationId) ?? [])
      : []
  )

  // ── 统一 sync helper ───────────────────────────────────────────
  function syncDisplay(extra?: { speakerTransition?: 'timeout' | 'ended' }): void {
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c, extra))
  }

  // ── 有主持 / 一般性辩论：逐人计时 $effect ─────────────────────
  $effect(() => {
    const speaker = conf?.activeSpeaker
    if (isCaucus && !isModerated) return  // 自由磋商走另一个 effect
    if (!speaker) return
    if (speaker.pausedAt != null) return   // 暂停中不启动

    const allocSec = activeSpeaker?.allocatedTimeSec ?? 120
    displayTotal = allocSec
    const now = Date.now()
    const remaining = Math.max(0, (speaker.endAt - now) / 1000)

    if (remaining > 0) {
      const timerId = mode === 'general_debate' ? 'speakers-list' : 'caucus'
      const tickMs = mode === 'general_debate' ? 100 : 1000
      createTimer(timerId, tickMs).start(
        remaining,
        (data) => {
          displayRemaining = data.remainingSec
          displayElapsed = data.elapsedSec
          syncDisplay()
        },
        () => {
          isPaused = false
          if (mode === 'general_debate') {
            endSpeaker()
          } else {
            advanceCaucusSpeaker()
          }
          syncDisplay({ speakerTransition: 'timeout' })
        }
      )
    } else {
      // 发言时间已过期（如从 localStorage 恢复的脏数据），立刻清理
      isPaused = false
      if (mode === 'general_debate') {
        endSpeaker()
      } else {
        advanceCaucusSpeaker()
      }
      syncDisplay({ speakerTransition: 'timeout' })
    }

    return () => {
      getTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus')?.stop()
    }
  })

  // ── 暂停状态恢复：组件挂载时若发言人处于暂停，恢复本地显示状态 ──
  $effect(() => {
    const speaker = conf?.activeSpeaker
    if (!speaker || speaker.pausedAt == null) return
    if (isCaucus && !isModerated) return

    const allocSec = activeSpeaker?.allocatedTimeSec ?? 120
    const elapsed = (speaker.pausedAt - speaker.startedAt) / 1000
    const remaining = Math.max(0, allocSec - elapsed)

    displayRemaining = remaining
    displayElapsed = elapsed
    displayTotal = allocSec
    isPaused = true
  })

  // ── 自由磋商：总倒计时 $effect ─────────────────────────────────
  $effect(() => {
    if (!isCaucus || !activeCaucus || isModerated) return
    if (activeCaucus.pausedAt != null) return

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
          syncDisplay()
        },
        () => {
          endCaucus()
          syncDisplay()
        }
      )
    }

    return () => {
      getTimer('caucus')?.stop()
    }
  })

  // ── 进度条 ─────────────────────────────────────────────────────
  const progressPercent = $derived(
    totalSec > 0 ? ((totalSec - totalRemainingSec) / totalSec) * 100 : 0
  )

  // ── 操作处理 ───────────────────────────────────────────────────
  function addSpeaker(delegationId: string): void {
    addToSpeakersList(delegationId)
  }

  function prepareSpeaker(entryId: string): void {
    readySpeaker(entryId)
  }

  function beginSpeaking(entryId: string): void {
    const entry = conf?.speakersList.find((s: any) => s.id === entryId)
    if (!entry) return
    startSpeaker(entryId)
    isPaused = false
    // 计时器由 $effect 自动启动
    syncDisplay()
  }

  function pauseSpeaking(): void {
    getTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus')?.stop()
    isPaused = true
    pauseSpeaker()
    syncDisplay()
  }

  function resumeSpeaking(): void {
    isPaused = false
    resumeSpeaker(displayRemaining)
    // 计时器由 $effect 自动启动
    syncDisplay()
  }

  function finishSpeaker(yieldType?: YieldType): void {
    getTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus')?.stop()
    isPaused = false
    if (mode === 'general_debate') {
      if (yieldType) {
        handleYield({ type: yieldType })
      } else {
        endSpeaker()
      }
    } else {
      // caucus: yield type 暂时只做 advance，后续可扩展
      advanceCaucusSpeaker()
    }
    syncDisplay({ speakerTransition: 'ended' })
  }

  function cancelReadySpeaker(): void {
    getTimer('caucus')?.stop()
    isPaused = false
    advanceCaucusSpeaker()
    syncDisplay()
  }

  function startCaucusSpeakerHandler(): void {
    startCaucusSpeaker()
    syncDisplay()
  }

  // 自由磋商
  function pauseCaucusHandler(): void {
    getTimer('caucus')?.stop()
    isCaucusPaused = true
    pauseCaucus()
    syncDisplay()
  }

  function resumeCaucusHandler(): void {
    isCaucusPaused = false
    resumeCaucus(totalRemainingSec)
    syncDisplay()
  }

  // ── 下一个发言人 ───────────────────────────────────────────────
  const nextSpeaker = $derived.by(() => {
    if (isCaucus && currentIdx >= 0 && currentIdx + 1 < speakers.length) {
      return speakers[currentIdx + 1]
    }
    if (!isCaucus && !isSpeakerActive && readyEntry === null && waitingSpeakers.length > 0) {
      return waitingSpeakers[0]
    }
    return null
  })

  // ── Cleanup ────────────────────────────────────────────────────
  onDestroy(() => {
    // 离开组件前立即保存，确保计时器状态持久化
    saveConferencesNow()
    destroyTimer('speakers-list')
    destroyTimer('caucus')
  })
</script>

<div class="flex w-full max-w-3xl flex-col gap-4">
  {#if conf}
    {#if isCaucus && isModerated}
      <!-- ═══ 有主持磋商头部 ═══ -->
      <div class="flex items-center justify-center gap-2">
        <MessageSquare size={28} class="text-indigo-500" />
        <h2 class="text-xl font-bold text-foreground">有主持核心磋商</h2>
      </div>

      <!-- 总时间预算进度条 -->
      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span>总剩余</span>
        <span class="font-mono font-semibold text-foreground">{formatTime(totalBudgetRemaining)}</span>
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all duration-1000 {totalBudgetRemaining <= 30 ? 'bg-red-500' : 'bg-indigo-500'}"
            style="width: {totalBudgetSec > 0 ? ((totalBudgetSec - totalBudgetRemaining) / totalBudgetSec) * 100 : 0}%"
          ></div>
        </div>
      </div>

      <Separator />
    {/if}

    {#if isCaucus && !isModerated}
      <!-- ═══ 自由磋商 ═══ -->
      <div class="flex flex-col items-center gap-6">
        <div class="flex items-center gap-2">
          <Coffee size={28} class="text-amber-500" />
          <h2 class="text-xl font-bold text-foreground">自由磋商</h2>
        </div>

        <div class="text-center">
          {#if isCaucusPaused}
            <div class="mb-2 text-sm font-medium text-amber-500 uppercase tracking-wider">计时已暂停</div>
          {/if}
          <div
            class="font-mono text-7xl font-bold tabular-nums transition-colors"
            class:text-amber-500={isCaucusPaused}
            class:text-red-500={!isCaucusPaused && totalRemainingSec <= 30}
            class:text-foreground={!isCaucusPaused && totalRemainingSec > 30}
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
            class="h-full rounded-full transition-all duration-1000 {isCaucusPaused ? 'bg-amber-500' : totalRemainingSec <= 30 ? 'bg-red-500' : 'bg-indigo-500'}"
            style="width: {progressPercent}%"
          ></div>
        </div>

        <Separator />

        <div class="flex gap-4">
          {#if isCaucusPaused}
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
      <!-- ═══ 有主持磋商 / 一般性辩论 ═══ -->

      <!-- 状态链：各状态特有的 UI -->
      {#if isCaucus && isModerated && activeSpeaker?.status === 'ready'}
        <ReadySpeakerCard
          delegationName={activeSpeaker.delegationName}
          allocatedTimeSec={activeSpeaker.allocatedTimeSec}
          onstart={startCaucusSpeakerHandler}
          oncancel={cancelReadySpeaker}
        />
      {:else if isSpeakerActive && conf.activeSpeaker}
        <ActiveSpeakerCard
          delegationName={activeSpeaker.delegationName}
          remainingSec={displayRemaining}
          elapsedSec={displayElapsed}
          totalSec={displayTotal}
          {isPaused}
          positionLabel={isCaucus ? `${speakers.length} 人中第 ${currentIdx + 1} 位` : undefined}
          onpause={pauseSpeaking}
          onresume={resumeSpeaking}
          onend={() => finishSpeaker()}
          onyield={(type: YieldType) => finishSpeaker(type)}
        />
      {:else if isCaucus && isModerated}
        <div class="flex flex-col items-center gap-4 text-muted-foreground">
          <Timer size={48} class="opacity-30" />
          <p class="text-lg font-medium">等待发言...</p>
        </div>
      {:else if !isCaucus && readyEntry}
        <ReadySpeakerCard
          delegationName={readyEntry.delegationName}
          allocatedTimeSec={readyEntry.allocatedTimeSec}
          onstart={() => beginSpeaking(readyEntry.id)}
          oncancel={() => removeFromSpeakersList(readyEntry.id)}
        />
      {/if}

      <!-- ── DelegationSelector（仅辩论空闲态） ── -->
      {#if !isCaucus && !isSpeakerActive && !readyEntry}
        <div class="rounded-lg border bg-card p-4">
          <DelegationSelector
            delegations={conf.delegations}
            placeholder="搜索代表团名称..."
            onselect={addSpeaker}
            resetOnSelect={true}
            excludeIds={listedDelegationIds}
          />
        </div>
      {/if}

      <!-- ── 下一位发言人 ── -->
      {#if nextSpeaker}
        <NextSpeakerCard
          label="下一位"
          delegationName={nextSpeaker.delegationName}
          allocatedTimeSec={nextSpeaker.allocatedTimeSec}
          showPrepareButton={!isCaucus}
          onprepare={!isCaucus ? () => prepareSpeaker(nextSpeaker.id) : undefined}
        />
      {:else if isCaucus && isSpeakerActive && currentIdx + 1 >= speakers.length}
        <div class="text-sm text-muted-foreground">最后一位发言人</div>
      {/if}

      <!-- ── 等待发言列表 ── -->
      <WaitingSpeakerList
        title="发言队列"
        speakers={waitingSpeakers}
        showIndex={!isCaucus}
        showDelete={!isCaucus}
        emptyMessage={!isCaucus ? '主发言名单为空，请添加代表团' : undefined}
        disabled={!isCaucus && isSpeakerActive}
        ondelete={!isCaucus ? (id: string) => removeFromSpeakersList(id) : undefined}
      />
    {/if}

    <!-- 名单耗尽提示（caucus only） -->
    {#if isListExhausted}
      <div class="text-center text-sm text-muted-foreground">
        名单已走完，
        {#if totalBudgetRemaining > 5}
          返回磋商准备以添加更多发言人
        {:else}
          磋商即将结束
        {/if}
      </div>
    {/if}
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Timer size={48} class="opacity-30" />
      <p class="text-lg font-medium">没有进行中的会议</p>
    </div>
  {/if}
</div>
