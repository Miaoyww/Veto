<script lang="ts">
  /**
   * speaker-queue.svelte
   * ──────────────────────────────────────────────
   * 统一的发言队列 + 计时器组件。
   *
   * mode='general_debate' → 主发言名单（添加/删除/让渡/逐人计时）
   * mode='caucus'         → 磋商（有主持逐人计时 + 总时间预算 + 自由磋商倒计时）
   *
   * 计时器逻辑已抽离到 hooks/：
   *   - usePerSpeakerTimer   — 逐人发言计时
   *   - usePausedStateRestore — 挂载时恢复暂停态 display 值
   *   - useCaucusCountdown    — 自由磋商总倒计时
   * Display 同步采用双通道（ADR-0002）：结构变化发全量，tick 发增量。
   */
  import { onDestroy, onMount } from 'svelte'
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
    unreadyCaucusSpeaker,
    startCaucusSpeaker,
    pauseCaucus,
    resumeCaucus
  } from '$lib/stores/conference/conference-store'
  import { destroyTimer } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import {
    SpeakerTimerState,
    usePerSpeakerTimer
  } from '$lib/hooks/use-speaker-timer.svelte'
  import { usePausedStateRestore } from '$lib/hooks/use-paused-state-restore.svelte'
  import { useCaucusCountdown } from '$lib/hooks/use-caucus-countdown.svelte'
  import type { ConferenceEngine } from '$lib/engine/ConferenceEngine.svelte'
  import type {
    Delegation,
    YieldType,
    SpeakerTransitionReason,
    SpeakerDisplayEntry
  } from '$lib/types-conference'

  let { mode }: { mode: 'general_debate' | 'caucus' } = $props()

  /** 当前会议对象 */
  const conf = $derived($currentConference)
  /** 当前是否为磋商模式 */
  const isCaucus = $derived(mode === 'caucus')

  /** 当前正在进行的磋商 */
  const activeCaucus = $derived(conf?.activeCaucus ?? null)

  /** 是否为有主持核心磋商 */
  const isModerated = $derived(activeCaucus?.type === 'moderated')

  // ── 发言队列数据（按 mode 取不同数据源）──────────────────────────
  const rawSpeakers = $derived(
    mode === 'general_debate'
      ? (conf?.speakerLists?.entries ?? [])
      : (activeCaucus?.caucusSpeakers ?? [])
  )

  // 统一为 SpeakerDisplayEntry 展示视图模型
  const speakers = $derived<SpeakerDisplayEntry[]>(
    rawSpeakers.map((s) => ({
      id: s.id,
      delegationId: s.delegationId,
      delegationName:
        conf?.delegations.find((d) => d.id === s.delegationId)?.name ?? '',
      status: s.status,
      allocatedTimeSec: s.allocatedTimeSec
    }))
  )

  const readyEntry = $derived(speakers.find((s) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(speakers.filter((s) => s.status === 'waiting'))
  const currentIdx = $derived(activeCaucus?.currentSpeakerIndex ?? -1)

  // ── 当前活跃发言人（以 engine conf.activeSpeaker 为唯一数据源）────
  const activeSpeaker = $derived.by(() => {
    const eng = conf?.activeSpeaker
    if (!eng) return null

    const entry = speakers.find(
      (s) => s.id === eng.entryId || s.delegationId === eng.entryId
    )
    if (!entry) return null

    return { ...entry, status: 'speaking' as const }
  })

  // ── 计时器 composables ──────────────────────────────────────────
  const timerState = new SpeakerTimerState()

  /** 获取 engine 实例（通过 getter 避免闭包过期） */
  function getEngine(): ConferenceEngine | null | undefined {
    return get(currentEngine)
  }

  /** 统一 sync helper：发送全量 Display 数据（仅结构变化时调用） */
  function syncDisplay(extra?: { speakerTransition?: SpeakerTransitionReason }): void {
    const engine = getEngine()
    if (engine) getDisplayBridge().sendUpdate(buildDisplayData(engine, extra))
  }

  /** 发送计时器增量 tick（每 tick 调用，不重建全量数据，见 ADR-0002） */
  function sendTick(data: { remainingSec: number; elapsedSec: number }): void {
    getDisplayBridge().sendTimerTick({
      remainingSec: data.remainingSec,
      elapsedSec: data.elapsedSec,
      totalSec: timerState.displayTotal,
      status: timerState.isPaused ? 'paused' : 'playing'
    })
  }

  // 逐人发言计时器（一般性辩论 + 有主持磋商）
  usePerSpeakerTimer(timerState, {
    get enabled() { return !isCaucus || isModerated },
    timerId: mode === 'general_debate' ? 'speakers-list' : 'caucus-speaker',
    tickMs: mode === 'general_debate' ? 100 : 1000,
    getEngine,
    onExpire() {
      if (mode === 'general_debate') {
        endSpeaker()
      } else {
        advanceCaucusSpeaker()
      }
      syncDisplay({ speakerTransition: 'timeout' })
    },
    onTick: sendTickWithAudio
  })

  // 挂载时恢复暂停态 display 值
  usePausedStateRestore(timerState, {
    get enabled() { return !isCaucus || isModerated },
    getEngine,
    isExcludedCaucus: isCaucus && !isModerated
  })

  // 自由磋商 / 个人演讲总倒计时
  const caucusCountdown = useCaucusCountdown({
    get enabled() { return isCaucus && !isModerated },
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

  // ── 派生状态 ─────────────────────────────────────────────────────
  const isSpeakerActive = $derived(activeSpeaker !== null)

  // ── 让渡相关状态 ─────────────────────────────────────────────────
  const yieldPending = $derived(conf?.yieldPending ?? null)

  const activeSpeakerCanYield = $derived.by(() => {
    if (isCaucus) return false // 磋商暂不支持让渡
    if (!conf?.activeSpeaker) return false
    const entry = conf?.speakerLists?.entries.find(
      (s) => s.id === conf.activeSpeaker!.entryId
    )
    return entry?.canYield !== false
  })

  const isYieldAnswering = $derived(
    yieldPending?.yieldType === 'question' && yieldPending?.questionerDelegationId != null
  )

  const yieldNote = $derived.by(() => {
    if (isYieldAnswering)
      return `正在回答来自 ${yieldPending?.questionerDelegation?.name} 的提问`
    if (!activeSpeakerCanYield && conf?.activeSpeaker)
      return '（本次发言不可让渡）'
    return undefined
  })

  // ── 总时间预算（caucus only）───────────────────────────────────
  const totalBudgetRemaining = $derived(
    activeCaucus
      ? Math.max(
          0,
          activeCaucus.totalSec -
            ((activeCaucus.elapsedSec ?? 0) + timerState.displayElapsed)
        )
      : 0
  )
  const totalBudgetSec = $derived(activeCaucus ? activeCaucus.totalSec : 0)

  // 名单耗尽
  const isListExhausted = $derived(
    isCaucus && isModerated && currentIdx >= speakers.length && speakers.length > 0
  )

  // ── DelegationSelector 相关（general_debate only）───────────────
  const listedDelegationIds = $derived(
    mode === 'general_debate'
      ? (conf?.speakerLists?.entries.map((s) => s.delegationId) ?? [])
      : []
  )

  // ── 挂载时同步 Display ──────────────────────────────────────────
  $effect(() => {
    void conf
    syncDisplay()
  })

  // ── 下一个发言人（统一逻辑：waiting 队列第一位）─────────────────
  const nextSpeaker = $derived<SpeakerDisplayEntry | null>(
    waitingSpeakers.length > 0 ? waitingSpeakers[0] : null
  )

  // ── 进度条（自由磋商）─────────────────────────────────────────
  const progressPercent = $derived(
    caucusCountdown.totalSec > 0
      ? ((caucusCountdown.totalSec - caucusCountdown.totalRemainingSec) /
          caucusCountdown.totalSec) *
          100
      : 0
  )

  // ── 操作处理 ───────────────────────────────────────────────────
  function addSpeaker(d: Delegation): void {
    addToSpeakersList(d.id)
    syncDisplay()
  }

  function prepareSpeaker(entryId: string): void {
    readySpeaker(entryId)
    syncDisplay()
  }

  function beginSpeaking(entryId: string): void {
    const entry = conf?.speakerLists?.entries.find((s) => s.id === entryId)
    if (!entry) return
    startSpeaker(entryId)
    timerState.isPaused = false
    // 计时器由 usePerSpeakerTimer $effect 自动启动
    syncDisplay()
  }

  function pauseSpeaking(): void {
    getDisplayBridge().sendTimerTick({
      remainingSec: timerState.displayRemaining,
      elapsedSec: timerState.displayElapsed,
      totalSec: timerState.displayTotal,
      status: 'paused'
    })
    timerState.isPaused = true
    pauseSpeaker()
    // 全量同步确保 Display 端 pause 状态一致
    syncDisplay()
  }

  function resumeSpeaking(): void {
    timerState.isPaused = false
    resumeSpeaker()
    // 计时器由 usePerSpeakerTimer $effect 自动启动
    syncDisplay()
  }

  function finishSpeaker(yieldType?: YieldType): void {
    // timer 由 usePerSpeakerTimer 的 return cleanup 自动 stop
    timerState.isPaused = false
    if (mode === 'general_debate') {
      if (yieldType) {
        handleYield({ type: yieldType })
      } else {
        endSpeaker()
      }
    } else {
      advanceCaucusSpeaker()
    }
    syncDisplay({ speakerTransition: 'ended' })
  }

  function cancelReadySpeakerHandler(): void {
    // caucus: 退回 ready 状态到 waiting，而非跳到下一位
    unreadyCaucusSpeaker()
    syncDisplay()
  }

  function startCaucusSpeakerHandler(): void {
    startCaucusSpeaker()
    syncDisplay()
  }

  // 自由磋商
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

  // ── 音频提示（剩余 30s / 10s 时发出短促提示音）──────────────
  let audioCtx: AudioContext | null = null

  function ensureAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playBeep(): void {
    try {
      const ctx = ensureAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.value = 0.1
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // 静默忽略（AudioContext 可能在非用户交互上下文中被阻止）
    }
  }

  let lastBeepRemaining = $state(-1)

  function maybeBeep(remainingSec: number): void {
    const remaining = Math.round(remainingSec)
    if (remaining <= 0 || remaining === lastBeepRemaining) return
    if (remaining === 30 || remaining === 10 || remaining === 5) {
      lastBeepRemaining = remaining
      playBeep()
    }
  }

  // 更新 sendTick 以包含音频触发
  function sendTickWithAudio(data: { remainingSec: number; elapsedSec: number }): void {
    sendTick(data)
    maybeBeep(data.remainingSec)
  }

  // ── 键盘快捷键 ────────────────────────────────────────────────
  function isInInput(el: HTMLElement): boolean {
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
  }

  function handleSpeakerKeydown(e: KeyboardEvent): void {
    if (isInInput(e.target as HTMLElement)) return
    // 仅在发言进行中且不是让渡修饰模式时响应
    if (!isSpeakerActive || yieldModifier) return

    if (e.key === ' ' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      if (timerState.isPaused) {
        resumeSpeaking()
      } else {
        pauseSpeaking()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finishSpeaker()
    }
  }

  // Y 键作为让渡修饰键
  let yieldModifier = $state(false)

  function handleYieldKeydown(e: KeyboardEvent): void {
    if (isInInput(e.target as HTMLElement)) return
    if (e.key.toLowerCase() === 'y' && isSpeakerActive && activeSpeakerCanYield) {
      yieldModifier = true
      return
    }
    if (yieldModifier && isSpeakerActive && activeSpeakerCanYield) {
      e.preventDefault()
      switch (e.key) {
        case '1':
          finishSpeaker('chair')
          break
        case '2':
          finishSpeaker('delegate')
          break
        case '3':
          finishSpeaker('question')
          break
        case '4':
          finishSpeaker('comment')
          break
      }
      yieldModifier = false
    }
  }

  function handleYieldKeyup(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'y') yieldModifier = false
  }

  onMount(() => {
    window.addEventListener('keydown', handleYieldKeydown)
    window.addEventListener('keyup', handleYieldKeyup)
    window.addEventListener('keydown', handleSpeakerKeydown)
    return () => {
      window.removeEventListener('keydown', handleYieldKeydown)
      window.removeEventListener('keyup', handleYieldKeyup)
      window.removeEventListener('keydown', handleSpeakerKeydown)
    }
  })

  // ── Cleanup ────────────────────────────────────────────────────
  onDestroy(() => {
    // 离开组件前立即保存，确保计时器状态持久化
    saveConferencesNow()
    destroyTimer(mode === 'general_debate' ? 'speakers-list' : 'caucus-speaker')
    destroyTimer('caucus-countdown')
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
        <span
          class="font-mono font-semibold text-foreground">{formatTime(totalBudgetRemaining)}</span
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

      <!-- 容量指示 -->
      {@const perTime = activeSpeaker?.allocatedTimeSec ?? 60}
      {@const maxCapacity = Math.floor(totalBudgetRemaining / perTime)}
      <div
        class="text-center text-xs {maxCapacity === 0
          ? 'text-red-400'
          : 'text-muted-foreground'}"
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

        <!-- 进度条 -->
        <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all duration-1000 {caucusCountdown
              .isCaucusPaused
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
            <Button
              variant="default"
              onclick={resumeCaucusHandler}
              class="min-w-[140px] gap-2"
            >
              <Timer size={14} />
              恢复计时
            </Button>
          {:else}
            <Button
              variant="outline"
              onclick={pauseCaucusHandler}
              class="min-w-[140px] gap-2"
            >
              暂停计时
            </Button>
          {/if}
          <Button
            variant="destructive"
            onclick={endCaucus}
            class="min-w-[140px] gap-2"
          >
            <Timer size={14} />
            提前结束磋商
          </Button>
        </div>
      </div>
    {:else}
      <!-- ═══ 有主持磋商 / 一般性辩论 ═══ -->

      {#if isCaucus && isModerated && !activeSpeaker && readyEntry}
        <ReadySpeakerCard
          delegationName={readyEntry.delegationName}
          allocatedTimeSec={readyEntry.allocatedTimeSec}
          onstart={startCaucusSpeakerHandler}
          oncancel={cancelReadySpeakerHandler}
        />

        <!-- 让渡解析面板 -->
      {:else if yieldPending && !isCaucus}
        <YieldResolutionPanel conference={conf} {yieldPending} />

        <!-- 让渡给问题的回答阶段 -->
        {#if isYieldAnswering}
          <div class="mt-4">
            <ActiveSpeakerCard
              delegationName={yieldPending.originalDelegation.name}
              remainingSec={timerState.displayRemaining}
              elapsedSec={yieldPending.allocatedSec - timerState.displayRemaining}
              totalSec={yieldPending.allocatedSec}
              isPaused={timerState.isPaused}
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
          remainingSec={timerState.displayRemaining}
          elapsedSec={timerState.displayElapsed}
          totalSec={timerState.displayTotal}
          isPaused={timerState.isPaused}
          canYield={activeSpeakerCanYield}
          {yieldNote}
          positionLabel={isCaucus
            ? `${speakers.length} 人中第 ${currentIdx + 1} 位`
            : undefined}
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

      <!-- ── 下一位发言人（始终显示，只要有 waiting 就展示） ── -->
      {#if nextSpeaker}
        <NextSpeakerCard
          label="下一位"
          delegationName={nextSpeaker.delegationName}
          allocatedTimeSec={nextSpeaker.allocatedTimeSec}
          showPrepareButton={!isCaucus}
          onprepare={!isCaucus ? () => prepareSpeaker(nextSpeaker.id) : undefined}
        />
      {/if}

      <!-- ── 等待发言列表 ── -->
      <WaitingSpeakerList
        title="发言队列"
        speakers={waitingSpeakers}
        showIndex={!isCaucus}
        showDelete={!isCaucus}
        emptyMessage={!isCaucus ? '主发言名单为空，请添加代表团' : undefined}
        disabled={!isCaucus && isSpeakerActive}
        ondelete={!isCaucus
          ? (id: string) => {
              removeFromSpeakersList(id)
              syncDisplay()
            }
          : undefined}
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
