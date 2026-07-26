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
  import { Timer, Coffee, MessageSquare } from '@lucide/svelte'
  import ActiveSpeakerCard from '$lib/components/conference/speakers/active-speaker-card.svelte'
  import ReadySpeakerCard from '$lib/components/conference/speakers/ready-speaker-card.svelte'
  import WaitingSpeakerList from '$lib/components/conference/speakers/waiting-speaker-list.svelte'
  import NextSpeakerCard from '$lib/components/conference/speakers/next-speaker-card.svelte'
  import YieldResolutionPanel from '$lib/components/conference/speakers/yield-resolution-panel.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'
  import {
    currentConference,
    currentEngine,
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
  import { createTimer, getTimer, destroyTimer } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import type {
    Delegation,
    YieldType,
    CaucusSpeakerStatus,
    SpeakerTransitionReason
  } from '$lib/types-conference'

  let { mode }: { mode: 'general_debate' | 'caucus' } = $props()

  /** 当前会议对象 */
  const conf = $derived($currentConference)
  /** 当前是否为磋商模式（否则为一般性辩论） */
  const isCaucus = $derived(mode === 'caucus')

  /** 当前正在进行的磋商（有主持或自由磋商），无磋商时为 null */
  const activeCaucus = $derived(conf?.activeCaucus ?? null)

  /** 是否为有主持核心磋商 */
  const isModerated = $derived(activeCaucus?.type === 'moderated')

  // ── 发言队列数据（按 mode 取不同数据源）──────────────────────────
  const rawSpeakers = $derived(
    mode === 'general_debate'
      ? (conf?.speakerLists?.entries ?? [])
      : (activeCaucus?.caucusSpeakers ?? [])
  )

  // 统一格式：id, delegationName, status, allocatedTimeSec
  const speakers = $derived(
    rawSpeakers.map((s: any) => ({
      id: s.id ?? s.delegationId,
      delegationId: s.delegationId,
      delegationName: conf?.delegations.find((d: any) => d.id === s.delegationId)?.name ?? '',
      status: s.status as CaucusSpeakerStatus,
      allocatedTimeSec: s.allocatedTimeSec ?? 120
    }))
  )

  const readyEntry = $derived(speakers.find((s: any) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(speakers.filter((s: any) => s.status === 'waiting'))
  const currentIdx = $derived(activeCaucus?.currentSpeakerIndex ?? -1)

  /**
   * 当前活跃的发言人——以引擎 conf.activeSpeaker 为唯一数据源，
   * 用 entryId 从 speakers 名单中查找显示信息。
   */
  const activeSpeaker = $derived.by(() => {
    const eng = conf?.activeSpeaker
    if (!eng) return null

    const entry = speakers.find((s) => s.id === eng.entryId || s.delegationId === eng.entryId)
    if (!entry) return null

    return { ...entry, status: 'speaking' as const }
  })

  $effect(() => {
    console.log('[speaker-queue]', {
      isCaucus,
      activeSpeaker: activeSpeaker?.delegationName,
      engineEntryId: conf?.activeSpeaker?.entryId
    })
  })
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

  const isSpeakerActive = $derived(activeSpeaker !== null)
  // ── 让渡相关状态 ─────────────────────────────────────────────────
  const yieldPending = $derived(conf?.yieldPending ?? null)

  // 当前活跃发言人是否可以让渡
  const activeSpeakerCanYield = $derived.by(() => {
    if (isCaucus) return false // 磋商暂不支持让渡
    if (!conf?.activeSpeaker) return false
    const entry = conf.speakerLists?.entries.find((s: any) => s.id === conf.activeSpeaker!.entryId)
    return entry?.canYield !== false
  })

  // 让渡给问题的回答阶段：提问方已指定且计时器需要恢复
  const isYieldAnswering = $derived(
    yieldPending?.yieldType === 'question' && yieldPending?.questionerDelegationId != null
  )

  // 回答阶段的 yieldNote
  const yieldNote = $derived.by(() => {
    if (isYieldAnswering) return `正在回答来自 ${yieldPending?.questionerDelegation?.name} 的提问`
    if (!activeSpeakerCanYield && conf?.activeSpeaker) return '（本次发言不可让渡）'
    return undefined
  })

  // ── 总时间预算（caucus only）───────────────────────────────────
  // 使用 caucus 累积已用时间，而非 per-speaker 的 displayElapsed
  // activeCaucus.elapsedSec：之前发言人的累计耗时（通过 syncEngine 持久化）
  // displayElapsed：当前发言人的已用时间
  const totalBudgetRemaining = $derived(
    activeCaucus
      ? Math.max(0, activeCaucus.totalSec - ((activeCaucus.elapsedSec ?? 0) + displayElapsed))
      : 0
  )
  let a: number = 0
  $effect(() => {
    a++
    console.log('')
    console.log('')
    console.log(a)
    console.log('[speaker-queue] totalBudgetRemaining:', totalBudgetRemaining)
    console.log('[speaker-queue] totalBudgetRemaining:', totalBudgetRemaining)
    console.log('[speaker-queue] displayElapsed:', displayElapsed)
    console.log('[speaker-queue]  activeCaucus.elapsedSec:', activeCaucus?.elapsedSec)
    console.log('[speaker-queue]  activeCaucus.totalSec:', activeCaucus?.totalSec)
  })
  const totalBudgetSec = $derived(activeCaucus ? activeCaucus.totalSec : 0)

  // 名单耗尽相关
  const isListExhausted = $derived(
    isCaucus && isModerated && currentIdx >= speakers.length && speakers.length > 0
  )

  // ── DelegationSelector 相关（general_debate only）───────────────
  const listedDelegationIds = $derived(
    mode === 'general_debate'
      ? (conf?.speakerLists?.entries.map((s: any) => s.delegationId) ?? [])
      : []
  )

  // ── 统一 sync helper ───────────────────────────────────────────
  function syncDisplay(extra?: { speakerTransition?: SpeakerTransitionReason }): void {
    const engine = get(currentEngine)
    if (engine) getDisplayBridge().sendUpdate(buildDisplayData(engine, extra))
  }

  // ── 有主持 / 一般性辩论：逐人计时 $effect ─────────────────────
  $effect(() => {
    const speaker = conf?.activeSpeaker
    if (isCaucus && !isModerated) return // 自由磋商走另一个 effect
    if (!speaker) return
    if (speaker.paused) {
      return // 暂停中不启动
    }

    const totalSec = speaker.totalSec
    displayTotal = totalSec
    displayElapsed = speaker.elapsedSec
    const remaining = Math.max(0, totalSec - speaker.elapsedSec)
    displayRemaining = remaining
    const engine = get(currentEngine)

    if (remaining > 0) {
      const timerId = mode === 'general_debate' ? 'speakers-list' : 'caucus'
      const tickMs = mode === 'general_debate' ? 100 : 1000
      createTimer(timerId, tickMs).start(
        totalSec,
        (data) => {
          displayRemaining = data.remainingSec
          displayElapsed = data.elapsedSec

          // 同步 elapsedSec 到引擎，供 Display 窗口读取
          if (engine?.activeSpeaker) {
            engine.activeSpeaker = { ...engine.activeSpeaker, elapsedSec: data.elapsedSec }
          }

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
        },
        speaker.elapsedSec
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
    if (!speaker || !speaker.paused) return
    if (isCaucus && !isModerated) return

    const totalSec = speaker.totalSec
    const remaining = Math.max(0, totalSec - speaker.elapsedSec)

    displayRemaining = remaining
    displayElapsed = speaker.elapsedSec
    displayTotal = totalSec
    isPaused = true
  })

  // ── 自由磋商：总倒计时 $effect ─────────────────────────────────
  $effect(() => {
    if (!isCaucus || !activeCaucus || isModerated) return
    if (activeCaucus.paused) {
      return
    }

    const caucusTotalSec = activeCaucus.totalSec
    const remaining = Math.max(0, caucusTotalSec - activeCaucus.elapsedSec)
    const engine = get(currentEngine)

    if (remaining > 0) {
      createTimer('caucus', 1000).start(
        caucusTotalSec,
        (data) => {
          totalRemainingSec = data.remainingSec
          totalElapsedSec = data.elapsedSec
          totalSec = data.totalSec
          // 同步 elapsedSec 到引擎，供 Display 窗口读取
          if (engine?.activeCaucus) {
            engine.activeCaucus = { ...engine.activeCaucus, elapsedSec: data.elapsedSec }
          }
          syncDisplay()
        },
        () => {
          endCaucus()
          syncDisplay()
        },
        activeCaucus.elapsedSec
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
  function addSpeaker(d: Delegation): void {
    addToSpeakersList(d.id)
  }

  function prepareSpeaker(entryId: string): void {
    readySpeaker(entryId)
  }

  function beginSpeaking(entryId: string): void {
    const entry = conf?.speakerLists?.entries.find((s: any) => s.id === entryId)
    if (!entry) return
    startSpeaker(entryId)
    isPaused = false
    // 计时器由 $effect 自动启动
    syncDisplay()
  }

  function pauseSpeaking(): void {
    displayElapsed = 0
    getTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus')?.stop()
    isPaused = true
    pauseSpeaker()
    syncDisplay()
  }

  function resumeSpeaking(): void {
    isPaused = false
    resumeSpeaker()
    // 计时器由 $effect 自动启动
    syncDisplay()
  }

  function finishSpeaker(yieldType?: YieldType): void {
    displayElapsed = 0
    getTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus')?.stop()
    isPaused = false
    if (mode === 'general_debate') {
      if (yieldType) {
        handleYield({ type: yieldType })
        // handleYield 会处理让渡逻辑：
        // - chair: 直接结束发言
        // - delegate/question/comment: 暂停计时器，设置 yieldPending 状态
        // 计时器已停止，等待主席在 yield resolution panel 中操作
      } else {
        endSpeaker()
      }
    } else {
      // caucus: yield type 暂时只做 advance，后续可扩展
      advanceCaucusSpeaker()
    }
    syncDisplay({ speakerTransition: yieldType ? 'ended' : 'ended' })
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
    resumeCaucus()
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

<div class="flex w-full flex-col gap-4">
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
        <span class="font-mono font-semibold text-foreground"
          >{formatTime(totalBudgetRemaining)}</span
        >
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all duration-1000 {totalBudgetRemaining <= 30
              ? 'bg-red-500'
              : 'bg-indigo-500'}"
            style="width: {totalBudgetSec > 0
              ? ((totalBudgetSec - totalBudgetRemaining) / totalBudgetSec) * 100
              : 0}%"
          ></div>
        </div>
      </div>

      <!-- 容量指示：尚可容纳代表数 -->
      {@const perTime = activeSpeaker?.allocatedTimeSec ?? 60}
      {@const maxCapacity = Math.floor(totalBudgetRemaining / perTime)}
      <div
        class="text-center text-xs {maxCapacity === 0 ? 'text-red-400' : 'text-muted-foreground'}"
      >
        剩余时间尚可容纳 <span class="font-semibold">{maxCapacity}</span> 人（{formatTime(
          totalBudgetRemaining
        )} ÷ {perTime}秒/人）{#if maxCapacity === 0}<span class="ml-1 text-red-400"
            >— 当前发言人结束后将自动终止磋商</span
          >{/if}
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
            <div class="mb-2 text-sm font-medium text-amber-500 uppercase tracking-wider">
              计时已暂停
            </div>
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
            class="h-full rounded-full transition-all duration-1000 {isCaucusPaused
              ? 'bg-amber-500'
              : totalRemainingSec <= 30
                ? 'bg-red-500'
                : 'bg-indigo-500'}"
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
      {#if isCaucus && isModerated && !activeSpeaker && readyEntry}
        <ReadySpeakerCard
          delegationName={readyEntry.delegationName}
          allocatedTimeSec={readyEntry.allocatedTimeSec}
          onstart={startCaucusSpeakerHandler}
          oncancel={cancelReadySpeaker}
        />

        <!-- 让渡解析面板：发言人做出非 chair 让渡后显示 -->
      {:else if yieldPending && !isCaucus}
        <YieldResolutionPanel conference={conf} {yieldPending} />

        <!-- 让渡给问题的回答阶段：显示原发言人（不可让渡） -->
        {#if isYieldAnswering}
          <div class="mt-4">
            <ActiveSpeakerCard
              delegationName={yieldPending.originalDelegation.name}
              remainingSec={displayRemaining}
              elapsedSec={yieldPending.allocatedSec - displayRemaining}
              totalSec={yieldPending.allocatedSec}
              {isPaused}
              canYield={false}
              yieldNote={`回答来自 ${yieldPending.questionerDelegation?.name} 的提问`}
              onpause={pauseSpeaking}
              onresume={resumeSpeaking}
              onend={() => finishSpeaker()}
            />
          </div>
        {/if}
      {:else if isSpeakerActive && conf.activeSpeaker}
        <ActiveSpeakerCard
          delegationName={activeSpeaker.delegationName}
          remainingSec={displayRemaining}
          elapsedSec={displayElapsed}
          totalSec={displayTotal}
          {isPaused}
          canYield={activeSpeakerCanYield}
          {yieldNote}
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
            presentOnly={true}
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
