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
  import type { Delegation } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME, ROLL_CALL_MARK_DELAY } from '$lib/const'

  import RollCallDisplay from './roll-call/index.svelte'
  import GeneralDebateDisplay from './general-debate/index.svelte'
  import MotionDisplay from './motion/index.svelte'
  import QuestionDisplay from './question/index.svelte'
  import CaucusSetupDisplay from './caucus-setup/index.svelte'
  import CaucusDisplay from './caucus/index.svelte'
  import ConferenceHeader from '$lib/components/conference/display/conference-header.svelte'
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

  const headerThresholds = $derived.by(() => {
    const present = displayData?.presentCount
    if (present != null && present > 0) {
      return {
        simpleMajority: Math.floor(present / 2) + 1,
        twoThirds: Math.ceil((present * 2) / 3)
      }
    }
    return null
  })

  // 特殊动议（isRequestingVote: false）不应触发 MotionDisplay
  const isSpecialMotion = $derived(displayData?.motionDraft?.isRequestingVote === false)

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

  // ---- 出席状态变更（全屏展示） ----
  // 来源：changeDelegationAttendance（attendanceChange 字段）或点名（rollCall.lastMarked）
  let attendanceChange = $state<Delegation | null>(null)
  let attendanceTimer: ReturnType<typeof setTimeout> | null = null
  let _lastAttendanceId = $state('')

  $effect(() => {
    const change = displayData?.attendanceChange
    if (change) {
      const notifId = `${change.id}-${change.attendance}`
      if (notifId === _lastAttendanceId) return
      _lastAttendanceId = notifId

      if (attendanceTimer) clearTimeout(attendanceTimer)
      attendanceChange = { ...change, sortOrder: 0 } as Delegation

      attendanceTimer = setTimeout(() => {
        attendanceChange = null
      }, ROLL_CALL_MARK_DELAY)
      return
    }

    // 点名阶段兼容：rollCall.lastMarked
    const lastMarked = displayData?.rollCall?.lastMarked
    if (lastMarked) {
      const notifId = `${lastMarked.delegationName}-${lastMarked.status}`
      if (notifId === _lastAttendanceId) return
      _lastAttendanceId = notifId

      if (attendanceTimer) clearTimeout(attendanceTimer)
      attendanceChange = {
        id: '',
        name: lastMarked.delegationName,
        shortName: lastMarked.shortName,
        attendance: lastMarked.status,
        sortOrder: 0
      } as Delegation

      attendanceTimer = setTimeout(() => {
        attendanceChange = null
      }, ROLL_CALL_MARK_DELAY)
    }
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 模拟大会</title>
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
    <ConferenceHeader
      venue={displayData.venue}
      name={displayData.name}
      phase={effectivePhase}
      caucusTopic={displayData.caucusTimer?.topic}
      simpleMajority={headerThresholds?.simpleMajority}
      twoThirds={headerThresholds?.twoThirds}
    />

    <!-- 出席状态变更（来自代表管理，全屏覆盖） -->
    {#if attendanceChange}
      <AttendanceChangeDisplay
        delegationName={attendanceChange.name}
        shortName={attendanceChange.shortName}
        status={attendanceChange.attendance}
      />
    {:else}
      <!-- 中部：主展示区（phase 动态切换） -->
      <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
        <div class="flex w-full max-w-5xl flex-col items-center">
          {#if displayData.pointDraft?.proposedByName || displayData.activePoint}
            <QuestionDisplay data={displayData} />
          {:else if effectivePhase === 'motion' && !isSpecialMotion}
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
