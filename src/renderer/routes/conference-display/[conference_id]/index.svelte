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
  import { Gavel, Vote, Coffee, Timer, Users } from '@lucide/svelte'
  import { getDisplayBridge, onConnectionStatus, setExternalWsUrl } from '$lib/services/conference-display-bridge'
  import type { ConnectionStatus } from '$lib/services/conference-display-bridge'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { MINUTES_EVENT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME } from '$lib/const'

  import RollCallDisplay from './roll-call/index.svelte'
  import GeneralDebateDisplay from './general-debate/index.svelte'
  import MotionDisplay from './motion/index.svelte'
  import QuestionDisplay from './question/index.svelte'
  import CaucusSetupDisplay from './caucus-setup/index.svelte'
  import CaucusDisplay from './caucus/index.svelte'

  let displayData = $state<ConferenceDisplayData | null>(null)
  let connectionStatus = $state<ConnectionStatus>('connecting')

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

    // 监听来自主进程的 WS 配置消息（仅展示模式）
    const unsubDisplayUpdate = window.veto?.conference?.onDisplayUpdate?.((data: unknown) => {
      const msg = data as { type?: string; wsUrl?: string }
      if (msg.type === 'ws-config' && msg.wsUrl) {
        setExternalWsUrl(msg.wsUrl)
      }
    })

    return () => {
      unsubData()
      unsubStatus()
      unsubDisplayUpdate?.()
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
  </style>
</svelte:head>

<div class="flex h-screen w-screen flex-col bg-[#0a0e14] text-[#c8ccd4]">
  {#if displayData}
    <!-- 顶部横幅：大会信息 -->
    <div class="relative flex items-center gap-8 border-b border-white/10 px-16 py-7">
      <div class="flex items-center gap-5">
        <div>
          <h1 class="text-[28px] font-semibold tracking-[0.04em] text-white">
            {displayData.name}
          </h1>
          <p class="mt-0.5 text-sm tracking-wider text-white/30 uppercase">
            {displayData.venue}
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
          <!-- 投票 -->
          <div class="flex flex-col items-center gap-10">
            <div class="flex items-center gap-3 text-white/40">
              <div class="h-px w-12 bg-white/10"></div>
              <Vote size={20} class="text-[#5B92E5]" />
              <span class="text-lg tracking-[0.08em] uppercase">
                {displayData.activeMotion?.documentName ? '实质性投票' : '投票表决'}
              </span>
              <span class="text-sm tracking-wider text-white/20">
                {displayData.votingSession.majorityRule === '简单多数'
                  ? 'SIMPLE MAJORITY'
                  : 'TWO-THIRDS MAJORITY'}
              </span>
              <div class="h-px w-12 bg-white/10"></div>
            </div>

            {#if displayData.activeMotion?.documentName}
              <div class="text-4xl font-semibold tracking-wide text-white/60">
                「{displayData.activeMotion.documentName}」
              </div>
            {/if}

            <!-- 计票 -->
            <div class="grid grid-cols-3 gap-8">
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-9xl font-light tabular-nums leading-none text-[#5B92E5]">
                  {displayData.votingSession.tally.yes}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">赞成</div>
              </div>
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-9xl font-light tabular-nums leading-none text-white/40">
                  {displayData.votingSession.tally.no}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">反对</div>
              </div>
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-9xl font-light tabular-nums leading-none text-white/40">
                  {displayData.votingSession.tally.abstain}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">弃权</div>
              </div>
            </div>

            {#if displayData.votingSession.result}
              <div
                class="rounded-sm px-10 py-3 text-xl font-semibold tracking-[0.06em] {displayData
                  .votingSession.result === 'passed'
                  ? 'bg-[#5B92E5]/10 text-[#5B92E5] border border-[#5B92E5]/20'
                  : 'bg-white/5 text-white/40 border border-white/10'}"
              >
                {displayData.votingSession.result === 'passed'
                  ? '✓ 通过  ADOPTED'
                  : '✗ 未通过  REJECTED'}
              </div>
            {/if}
          </div>
        {:else if effectivePhase === 'pending_speakers_list'}
          <!-- 等待开启主发言名单 -->
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Users size={56} />
            <div class="text-8xl font-light tracking-[0.06em]">等待开启</div>
            <div class="text-9xl font-light tracking-[0.06em]">主发言名单</div>
            <div class="text-lg tracking-wider text-white/10">AWAITING SPEAKERS LIST</div>
          </div>
        {:else if effectivePhase === 'suspended'}
          <!-- 休会 -->
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Timer size={56} />
            <div class="text-9xl font-light tracking-[0.06em]">会议休会中</div>
            <div class="text-lg tracking-wider text-white/10">SUSPENDED</div>
          </div>
        {:else if effectivePhase === 'closed'}
          <!-- 闭幕 -->
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Gavel size={56} />
            <div class="text-9xl font-light tracking-[0.06em]">会议已闭幕</div>
            <div class="text-lg tracking-wider text-white/10">CLOSED</div>
          </div>
        {:else}
          <!-- 默认：准备就绪（preamble 或其他未知 phase） -->
          <div class="flex flex-col items-center gap-6">
            <div class="text-9xl font-light tracking-[0.06em] text-white/20">准备就绪</div>
            {#if displayData.speakersList.length > 0}
              <div class="text-base tracking-wider text-white/10">
                发言名单 · {displayData.speakersList.length} 位代表
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- 底部：近期记录 -->
    {#if displayData.recentMinutes.length > 0}
      <div class="border-t border-white/5 px-16 py-4">
        <div class="flex items-center gap-8 text-sm">
          <span class="text-xs font-medium tracking-[0.08em] text-white/15 uppercase">近期记录</span
          >
          {#each displayData.recentMinutes.slice(-5) as m}
            <span class="flex items-center gap-2 text-white/20">
              <span class="text-white/25">{MINUTES_EVENT_LABELS[m.eventType] ?? m.eventType}</span>
              <span class="text-white/8">|</span>
              <span>{m.description}</span>
            </span>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <!-- 等待 / 重连 -->
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-6 text-white/10">
        <div class="text-9xl font-light tracking-[0.06em]">
          {connectionStatus === 'connecting'
            ? '正在连接...'
            : connectionStatus === 'disconnected'
              ? '连接断开，重连中...'
              : '等待主机连接'}
        </div>
        {#if connectionStatus === 'disconnected'}
          <div class="text-lg tracking-wider text-white/5">自动重连中，请稍候</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
