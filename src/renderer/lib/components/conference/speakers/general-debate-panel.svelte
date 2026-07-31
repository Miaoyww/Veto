<script lang="ts">
  /**
   * general-debate-panel.svelte
   * ────────────────────────────
   * 一般性辩论面板 —— 主发言名单的添加/删除/让渡/逐人计时。
   */
  import { onDestroy, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { Timer, Shuffle, ListPlus } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import ActiveSpeakerCard from '$lib/components/conference/speakers/active-speaker-card.svelte'
  import ReadySpeakerCard from '$lib/components/conference/speakers/ready-speaker-card.svelte'
  import WaitingSpeakerList from '$lib/components/conference/speakers/waiting-speaker-list.svelte'
  import YieldResolutionPanel from '$lib/components/conference/speakers/yield-resolution-panel.svelte'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'
  import {
    currentConference,
    currentEngine,
    addToSpeakersList,
    removeFromSpeakersList,
    readySpeaker,
    startSpeaker,
    pauseSpeaker,
    resumeSpeaker,
    endSpeaker,
    handleYield,
    saveConferencesNow
  } from '$lib/stores/conference/conference-store'
  import { destroyTimer } from '$lib/engine/conference-engine'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import { SpeakerTimerState, usePerSpeakerTimer } from '$lib/hooks/use-speaker-timer.svelte'
  import { usePausedStateRestore } from '$lib/hooks/use-paused-state-restore.svelte'
  import type { ConferenceEngine } from '$lib/engine/ConferenceEngine.svelte'
  import type { Delegation, YieldType, SpeakerDisplayEntry } from '$lib/types-conference'

  // ── 发言队列数据 ──────────────────────────────────────────────
  const conf = $derived($currentConference)

  const speakers = $derived<SpeakerDisplayEntry[]>(
    (conf?.speakerLists?.entries ?? []).map((s) => ({
      id: s.id,
      delegationId: s.delegationId,
      delegationName: conf?.delegations.find((d) => d.id === s.delegationId)?.name ?? '',
      status: s.status,
      allocatedTimeSec: s.allocatedTimeSec
    }))
  )

  const readyEntry = $derived(speakers.find((s) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(speakers.filter((s) => s.status === 'waiting'))
  const nextSpeaker = $derived<SpeakerDisplayEntry | null>(
    waitingSpeakers.length > 0 ? waitingSpeakers[0] : null
  )

  // ── 自动 ready ──────────────────────────────────────────────────
  $effect(() => {
    if (!isSpeakerActive && !readyEntry && nextSpeaker && !conf?.yieldPending) {
      readySpeaker(nextSpeaker.id)
      syncDisplay()
    }
  })

  const activeSpeaker = $derived.by(() => {
    const eng = conf?.activeSpeaker
    if (!eng) return null
    const entry = speakers.find((s) => s.id === eng.entryId || s.delegationId === eng.entryId)
    if (!entry) return null
    return { ...entry, status: 'speaking' as const }
  })

  const isSpeakerActive = $derived(activeSpeaker !== null)

  // ── 让渡相关 ──────────────────────────────────────────────────
  const yieldPending = $derived(conf?.yieldPending ?? null)

  const activeSpeakerCanYield = $derived.by(() => {
    if (!conf?.activeSpeaker) return false
    const entry = conf?.speakerLists?.entries.find((s) => s.id === conf.activeSpeaker!.entryId)
    return entry?.canYield !== false
  })

  const isYieldAnswering = $derived(
    yieldPending?.yieldType === 'question' && yieldPending?.questionerDelegationId != null
  )

  const yieldNote = $derived.by(() => {
    if (isYieldAnswering) return `正在回答来自 ${yieldPending?.questionerDelegation?.name} 的提问`
    if (!activeSpeakerCanYield && conf?.activeSpeaker) return '（本次发言不可让渡）'
    return undefined
  })

  const listedDelegationIds = $derived(conf?.speakerLists?.entries.map((s) => s.delegationId) ?? [])

  // ── 计时器 ────────────────────────────────────────────────────
  const timerState = new SpeakerTimerState()

  function getEngine(): ConferenceEngine | null | undefined {
    return get(currentEngine)
  }

  function syncDisplay(): void {
    const engine = getEngine()
    if (engine) getDisplayBridge().sendUpdate(buildDisplayData(engine))
  }

  function sendTick(data: { remainingSec: number; elapsedSec: number }): void {
    getDisplayBridge().sendTimerTick({
      remainingSec: data.remainingSec,
      elapsedSec: data.elapsedSec,
      totalSec: timerState.displayTotal,
      status: timerState.isPaused ? 'paused' : 'playing'
    })
  }

  // ── 音频提示 ──────────────────────────────────────────────────
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
      // AudioContext 可能在非用户交互上下文中被阻止
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

  function sendTickWithAudio(data: { remainingSec: number; elapsedSec: number }): void {
    sendTick(data)
    maybeBeep(data.remainingSec)
  }

  usePerSpeakerTimer(timerState, {
    get enabled() {
      return true
    },
    timerId: 'speakers-list',
    tickMs: 100,
    getEngine,
    onExpire() {
      endSpeaker()
      syncDisplay()
    },
    onTick: sendTickWithAudio
  })

  usePausedStateRestore(timerState, {
    get enabled() {
      return true
    },
    getEngine,
    isExcludedCaucus: false
  })

  // ── 挂载时同步 Display ───────────────────────────────────────
  $effect(() => {
    void conf
    syncDisplay()
  })

  // ── 可选代表团池（出席 + 未在名单中）───────────────
  const availableDelegations = $derived(
    (conf?.delegations ?? [])
      .filter((d) => d.attendance === 'present')
      .filter((d) => !listedDelegationIds.includes(d.id))
  )

  // ── 操作处理 ─────────────────────────────────────────────────
  function addSpeaker(d: Delegation): void {
    addToSpeakersList(d.id)
    syncDisplay()
  }

  function addAllSpeakers(): void {
    for (const d of availableDelegations) {
      addToSpeakersList(d.id)
    }
    syncDisplay()
  }

  function addRandomSpeaker(): void {
    if (availableDelegations.length === 0) return
    const idx = Math.floor(Math.random() * availableDelegations.length)
    addToSpeakersList(availableDelegations[idx].id)
    syncDisplay()
  }


  function beginSpeaking(entryId: string): void {
    const entry = conf?.speakerLists?.entries.find((s) => s.id === entryId)
    if (!entry) return
    startSpeaker(entryId)
    timerState.isPaused = false
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
    syncDisplay()
  }

  function resumeSpeaking(): void {
    timerState.isPaused = false
    resumeSpeaker()
    syncDisplay()
  }

  function finishSpeaker(yieldType?: YieldType): void {
    timerState.isPaused = false
    if (yieldType) {
      handleYield({ type: yieldType })
    } else {
      endSpeaker()
    }
    syncDisplay()
  }


  // ── 键盘快捷键 ──────────────────────────────────────────────
  let yieldModifier = $state(false)

  function isInInput(el: HTMLElement): boolean {
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
  }

  function handleSpeakerKeydown(e: KeyboardEvent): void {
    if (isInInput(e.target as HTMLElement)) return
    if (yieldModifier) return

    if (e.key === ' ' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      if (isSpeakerActive) {
        // 正在发言 → 暂停 / 继续
        if (timerState.isPaused) {
          resumeSpeaking()
        } else {
          pauseSpeaking()
        }
      } else if (readyEntry) {
        // 准备就绪 → 开始发言
        beginSpeaking(readyEntry.id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (isSpeakerActive) {
        finishSpeaker()
      } else if (readyEntry) {
        removeFromSpeakersList(readyEntry.id)
        syncDisplay()
      }
    }
  }

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

  // ── Cleanup ──────────────────────────────────────────────────
  onDestroy(() => {
    saveConferencesNow()
    destroyTimer('speakers-list')
  })
</script>

<div class="flex w-full flex-col gap-4">
  {#if conf}
    {#if yieldPending}
      <YieldResolutionPanel conference={conf} {yieldPending} />
      {#if isYieldAnswering}
        <div class="mt-4">
          <ActiveSpeakerCard
            delegationName={yieldPending.originalDelegation.name}
            remainingSec={timerState.displayRemaining}
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
        totalSec={timerState.displayTotal}
        isPaused={timerState.isPaused}
        canYield={activeSpeakerCanYield}
        {yieldNote}
        onpause={pauseSpeaking}
        onresume={resumeSpeaking}
        onend={() => finishSpeaker()}
        onyield={(type: YieldType) => finishSpeaker(type)}
      />
    {:else if readyEntry}
      <ReadySpeakerCard
        delegationName={readyEntry.delegationName}
        allocatedTimeSec={readyEntry.allocatedTimeSec}
        onstart={() => beginSpeaking(readyEntry.id)}
        oncancel={() => {
          removeFromSpeakersList(readyEntry.id)
          syncDisplay()
        }}
      />
    {/if}

    {#if !isSpeakerActive && !readyEntry}
      <div class="rounded-lg border bg-card p-4">
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <DelegationSelector
              delegations={conf.delegations}
              placeholder="搜索代表团名称..."
              onselect={addSpeaker}
              resetOnSelect={true}
              presentOnly={true}
              excludeIds={listedDelegationIds}
            />
          </div>
          <div class="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="default"
              title="随机抽取一个代表团加入发言名单"
              onclick={addRandomSpeaker}
              disabled={availableDelegations.length === 0}
            >
              <Shuffle size={14} />
              随机点出
            </Button>
            <Button
              variant="outline"
              size="default"
              title="将所有出席代表团加入发言名单"
              onclick={addAllSpeakers}
              disabled={availableDelegations.length === 0}
            >
              <ListPlus size={14} />
              添加全部
            </Button>
          </div>
        </div>
      </div>
    {/if}


    <WaitingSpeakerList
      title="发言队列"
      speakers={waitingSpeakers}
      showIndex={true}
      showDelete={true}
      emptyMessage="主发言名单为空，请添加代表团"
      disabled={isSpeakerActive}
      ondelete={(id: string) => {
        removeFromSpeakersList(id)
        syncDisplay()
      }}
    />
  {:else}
    <div class="flex flex-col items-center gap-4 text-muted-foreground">
      <Timer size={48} class="opacity-30" />
      <p class="text-lg font-medium">没有进行中的会议</p>
    </div>
  {/if}
</div>
