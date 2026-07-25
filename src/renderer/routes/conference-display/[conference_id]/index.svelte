<script lang="ts">
  /**
   * conference-display/[conference_id]/index.svelte
   * ──────────────────────────────────────────────
   * Display 窗口 Shell —— 唯一入口。
   *
   * 职责：
   * 1. WebSocket 连接（唯一）
   * 2. 顶部横幅 + 阶段指示器（渲染一次）
   * 3. 根据 phase 动态切换内容组件
   * 4. 底部近期记录
   */
  import { onMount, onDestroy } from 'svelte'
  import TitleBar from '$lib/components/titlebar.svelte'
  import {
    getDisplayBridge,
    onConnectionStatus,
    setExternalWsUrl
  } from '$lib/services/conference-display-bridge'
  import type { ConnectionStatus } from '$lib/services/conference-display-bridge'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { MINUTES_EVENT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME, ROLL_CALL_MARK_DELAY } from '$lib/const'

  import RollCallDisplay from './roll-call/index.svelte'
  import GeneralDebateDisplay from './general-debate/index.svelte'
  import MotionDisplay from './motion/index.svelte'
  import QuestionDisplay from './question/index.svelte'
  import CaucusSetupDisplay from './caucus-setup/index.svelte'
  import CaucusDisplay from './caucus/index.svelte'
  import VotingDisplay from './voting/index.svelte'
  import PendingSpeakersListDisplay from './pending-speakers-list/index.svelte'
  import SuspendedDisplay from './suspended/index.svelte'
  import ClosedDisplay from './closed/index.svelte'
  import ReadyDisplay from './ready/index.svelte'
  import ConnectionStatusDisplay from './connection-status/index.svelte'
  import AttendanceChangeDisplay from './attendance-change.svelte'

  let displayData = $state<ConferenceDisplayData | null>(null)
  let connectionStatus = $state<ConnectionStatus>('connecting')
  let isFullScreen = $state(false)

  function toggleFullscreen(): void {
    window.veto?.conference?.toggleFullscreen?.()
  }

  onMount(() => {
    const bridge = getDisplayBridge()
    const unsubData = bridge.onHostCommand((data: ConferenceDisplayData) => {
      // 忽略 ws-config 控制消息（非显示数据）
      if ((data as any).type === 'ws-config') return
      displayData = data
    })
    const unsubStatus = onConnectionStatus((status: ConnectionStatus) => {
      connectionStatus = status
    })

    // 监听来自主进程的 Display 更新（全屏状态变更等）
    const unsubDisplayUpdate = window.veto?.conference?.onDisplayUpdate?.((data: unknown) => {
      const msg = data as { type?: string; wsUrl?: string; isFullScreen?: boolean }
      if (msg.type === 'ws-config' && msg.wsUrl) {
        setExternalWsUrl(msg.wsUrl)
      } else if (msg.type === 'fullscreen-change') {
        isFullScreen = msg.isFullScreen ?? false
      }
    })

    // 监听 Escape 键退出全屏（仅 Display 窗口）
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeydown)

    return () => {
      unsubData()
      unsubStatus()
      unsubDisplayUpdate?.()
      window.removeEventListener('keydown', onKeydown)
    }
  })

  const phase = $derived(displayData?.phase ?? null)

  // 表决结果延迟转跳：当动议通过/否决后，先展示1秒结果再转跳 caucus
  let effectivePhase = $state<string | null>(null)
  let phaseDelayTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    const newPhase = displayData?.phase ?? null
    const motionStatus = displayData?.activeMotion?.status

    // 延迟计时器激活期间不干涉
    if (phaseDelayTimer) return

    // 相同则跳过
    if (newPhase === effectivePhase) return

    // 从 motion 结果阶段切换到其他阶段 → 延迟 1 秒
    if (
      effectivePhase === 'motion' &&
      motionStatus != null &&
      motionStatus !== 'pending' &&
      newPhase !== 'motion'
    ) {
      phaseDelayTimer = setTimeout(() => {
        // 取最新的 phase（避免延迟期间 phase 再次变更）
        effectivePhase = displayData?.phase ?? null
        phaseDelayTimer = null
      }, 3000)
      return
    }

    effectivePhase = newPhase
  })

  onDestroy(() => {
    if (phaseDelayTimer) clearTimeout(phaseDelayTimer)
    if (attendanceTimer) clearTimeout(attendanceTimer)
  })

  // ---- 出席状态变更（来自代表管理页面，全屏展示） ----
  let attendanceChange = $state<{
    delegationName: string
    shortName?: string
    status: 'present' | 'absent'
  } | null>(null)
  let attendanceTimer: ReturnType<typeof setTimeout> | null = null
  let _lastMarkedId = $state('')

  $effect(() => {
    const lastMarked = displayData?.rollCall?.lastMarked
    if (!lastMarked) return

    const notifId = `${lastMarked.delegationName}-${lastMarked.status}-${lastMarked.index ?? ''}`
    if (notifId === _lastMarkedId) return
    _lastMarkedId = notifId

    if (attendanceTimer) clearTimeout(attendanceTimer)

    attendanceChange = {
      delegationName: lastMarked.delegationName,
      shortName: lastMarked.shortName,
      status: lastMarked.status
    }

    attendanceTimer = setTimeout(() => {
      attendanceChange = null
    }, ROLL_CALL_MARK_DELAY)
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 模拟大会 · 显示</title>
  <style>
    :global(body) {
      background: #0a0e14;
      color: #c8ccd4;
      overflow: hidden;
    }
    .drag-region {
      -webkit-app-region: drag;
    }
    .no-drag {
      -webkit-app-region: no-drag;
    }
  </style>
</svelte:head>

<div class="flex h-screen w-screen flex-col bg-[#0a0e14] text-[#c8ccd4]">
  {#if !isFullScreen}
    <TitleBar variant="display" onToggleFullscreen={toggleFullscreen} />
  {/if}

  {#if displayData}
    <!-- 顶部横幅：大会信息 -->
    <div class="relative flex items-center gap-8 border-b border-white/10 px-16 py-7">
      <div class="flex items-center gap-5">
        <div>
          <h1 class="text-[28px] font-semibold tracking-[0.04em] text-white">
            {displayData.venue}
          </h1>
          <p class="mt-0.5 text-sm tracking-wider text-white/30 uppercase">
            {displayData.name}
          </p>
        </div>
      </div>

      <!-- 磋商主题 -->
      {#if displayData.caucusTimer?.topic}
        <div class="absolute left-1/2 -translate-x-1/2 text-6xl font-medium tracking-wide">
          {displayData.caucusTimer.topic}
        </div>
      {/if}

      <!-- 阶段指示器 -->
      <div class="ml-auto">
        <div
          class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5"
        >
          <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
          <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
            {PHASE_LABELS[effectivePhase] ?? effectivePhase}
          </span>
        </div>
      </div>
    </div>

    <!-- 出席状态变更（来自代表管理，全屏覆盖） -->
    {#if attendanceChange}
      <AttendanceChangeDisplay
        delegationName={attendanceChange.delegationName}
        shortName={attendanceChange.shortName}
        status={attendanceChange.status}
      />
    {:else}
      <!-- 中部：主展示区（phase 动态切换） -->
      <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
        <div class="flex w-full max-w-5xl flex-col items-center">
          {#if displayData.pointDraft?.proposedByName || displayData.activePoint}
            <QuestionDisplay data={displayData} />
          {:else if effectivePhase === 'motion'}
            <MotionDisplay data={displayData} />
          {:else if effectivePhase === 'roll_call'}
            <RollCallDisplay data={displayData} />
          {:else if effectivePhase === 'general_debate'}
            <GeneralDebateDisplay data={displayData} />
          {:else if effectivePhase === 'caucus_setup'}
            <CaucusSetupDisplay data={displayData} />
          {:else if displayData.caucusTimer && effectivePhase === 'caucus'}
            <CaucusDisplay data={displayData} />
          {:else if displayData.votingSession && effectivePhase === 'voting'}
            <VotingDisplay data={displayData} />
          {:else if effectivePhase === 'pending_speakers_list'}
            <PendingSpeakersListDisplay />
          {:else if effectivePhase === 'suspended'}
            <SuspendedDisplay />
          {:else if effectivePhase === 'closed'}
            <ClosedDisplay />
          {:else}
            <ReadyDisplay data={displayData} />
          {/if}
        </div>
      </div>
    {/if}
  {:else}
    <ConnectionStatusDisplay status={connectionStatus} />
  {/if}
</div>
