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
  import { onMount } from 'svelte'
  import { Gavel, Mic, Vote, Coffee, Timer } from '@lucide/svelte'
  import { getDisplayBridge, onConnectionStatus } from '$lib/services/conference-display-bridge'
  import type { ConnectionStatus } from '$lib/services/conference-display-bridge'
  import { PHASE_LABELS, formatTime } from '$lib/engine/conference-engine'
  import { MINUTES_EVENT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME } from '$lib/const'
  import RollCallDisplay from './roll-call/index.svelte'

  let displayData = $state<ConferenceDisplayData | null>(null)
  let connectionStatus = $state<ConnectionStatus>('connecting')
  let timerInterval: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    const bridge = getDisplayBridge()
    const unsubData = bridge.onHostCommand((data: ConferenceDisplayData) => {
      displayData = data
    })
    const unsubStatus = onConnectionStatus((status: ConnectionStatus) => {
      connectionStatus = status
    })

    timerInterval = setInterval(() => {
      if (!displayData) return

      // Tick current speaker (除非暂停)
      const speaker = displayData.currentSpeaker
      if (speaker && !speaker.isPaused && speaker.remainingSec > 0) {
        const newRemaining = Math.max(0, speaker.remainingSec - 0.5)
        displayData = {
          ...displayData,
          currentSpeaker: { ...speaker, remainingSec: newRemaining }
        }
        return
      }

      // Tick caucus timer
      const caucus = displayData.caucusTimer
      if (caucus && caucus.remainingSec > 0) {
        const newRemaining = Math.max(0, caucus.remainingSec - 0.5)
        displayData = {
          ...displayData,
          caucusTimer: { ...caucus, remainingSec: newRemaining }
        }
      }
    }, 500)

    return () => {
      unsubData()
      unsubStatus()
      if (timerInterval) clearInterval(timerInterval)
    }
  })

  const phase = $derived(displayData?.phase ?? null)
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
    <div class="flex items-center gap-8 border-b border-white/10 px-16 py-7">
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

      <!-- 阶段指示器 -->
      <div class="ml-auto">
        <div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5">
          <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
          <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
            {PHASE_LABELS[displayData.phase] ?? displayData.phase}
          </span>
        </div>
      </div>
    </div>

    <!-- 中部：主展示区（phase 动态切换） -->
    <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
      <div class="flex w-full max-w-5xl flex-col items-center">
        {#if phase === 'roll_call'}
          <RollCallDisplay data={displayData} />

        {:else if phase === 'general_debate'}
          {#if displayData.currentSpeaker}
            <!-- 正在发言 -->
            <div class="flex flex-col items-center gap-10">
              <div class="flex items-center gap-3 text-white/40">
                <div class="h-px w-12 bg-white/10"></div>
                <Mic size={20} class={displayData.currentSpeaker.isPaused ? 'text-[#C9A84C]' : 'text-[#5B92E5]'} />
                <span class="text-lg tracking-[0.08em] uppercase">
                  {displayData.currentSpeaker.isPaused ? '计时已暂停' : '正在发言'}
                </span>
                <div class="h-px w-12 bg-white/10"></div>
              </div>

              <div class="text-center">
                <div class="text-9xl font-semibold tracking-wide text-white">
                  {displayData.currentSpeaker.delegationName}
                </div>
                {#if displayData.currentSpeaker.shortName}
                  <div class="mt-1 text-9xl font-light tracking-[0.06em] text-white/30">
                    {displayData.currentSpeaker.shortName}
                  </div>
                {/if}
              </div>

              <!-- 倒计时 -->
              <div class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {displayData.currentSpeaker.isPaused ? 'text-[#C9A84C]' : 'text-[#5B92E5]'}">
                {formatTime(Math.max(0, displayData.currentSpeaker.remainingSec ?? 0))}
              </div>
            </div>

          {:else if displayData.readySpeaker}
            <!-- 预发言（即将发言） -->
            <div class="flex flex-col items-center gap-10">
              <div class="flex items-center gap-3 text-white/40">
                <div class="h-px w-12 bg-white/10"></div>
                <Mic size={20} class="text-[#C9A84C]" />
                <span class="text-lg tracking-[0.08em] uppercase">即将发言</span>
                <div class="h-px w-12 bg-white/10"></div>
              </div>

              <div class="text-center">
                <div class="text-9xl font-semibold tracking-wide text-white">
                  {displayData.readySpeaker.delegationName}
                </div>
              </div>

              <div class="text-lg tracking-wider text-white/15">等待主席开始计时</div>
            </div>

          {:else}
            <!-- 主发言名单（无当前发言人，无 ready） -->
            {@const waiting = displayData.speakersList.filter((s: { status: string }) => s.status === 'waiting')}
            {@const nextSpeaker = waiting[0]}
            {@const restQueue = waiting.slice(1)}

            <div class="flex w-full max-w-4xl flex-col items-center gap-8">
              <div class="flex items-center gap-3 text-white/40">
                <div class="h-px w-12 bg-white/10"></div>
                <Mic size={20} class="text-[#5B92E5]" />
                <span class="text-lg tracking-[0.08em] uppercase">主发言名单</span>
                <div class="h-px w-12 bg-white/10"></div>
              </div>

              {#if nextSpeaker}
                <!-- 下一个发言 -->
                <div class="w-full border border-white/10 bg-white/[0.02] px-8 py-6">
                  <div class="text-lg font-medium tracking-[0.12em] text-white/30 uppercase">下一个发言</div>
                  <div class="mt-3 text-9xl font-semibold tracking-wide text-white">
                    {nextSpeaker.delegationName}
                  </div>
                  {#if nextSpeaker.shortName}
                    <div class="mt-1 text-xl font-light tracking-[0.06em] text-white/20">
                      {nextSpeaker.shortName}
                    </div>
                  {/if}
                </div>
              {/if}

              {#if restQueue.length > 0}
                <!-- 后续队列 -->
                <div class="w-full space-y-px">
                  {#each restQueue as speaker, i (i)}
                    <div class="flex items-center gap-4 px-6 py-2.5">
                      <span class="w-8 text-right text-sm tabular-nums text-white/25">
                        {i + 2}
                      </span>
                      <span class="flex-1 text-xl font-medium text-white/50">
                        {speaker.delegationName}
                      </span>
                      {#if speaker.shortName}
                        <span class="text-sm tracking-wider text-white/25">{speaker.shortName}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}

              {#if waiting.length === 0}
                <div class="text-lg tracking-wider text-white/10">等待主席添加发言人</div>
              {/if}
            </div>
          {/if}

        {:else if displayData.caucusTimer && phase === 'caucus'}
          <!-- 磋商倒计时 -->
          <div class="flex flex-col items-center gap-10">
            <div class="flex items-center gap-3 text-white/40">
              <div class="h-px w-12 bg-white/10"></div>
              <Coffee size={20} class="text-[#C9A84C]" />
              <span class="text-lg tracking-[0.08em] uppercase">
                {displayData.caucusTimer.type === 'moderated' ? '有主持核心磋商' : '自由磋商'}
              </span>
              <div class="h-px w-12 bg-white/10"></div>
            </div>

            {#if displayData.caucusTimer.topic}
              <div class="text-9xl font-medium tracking-wide text-[#5B92E5]/80">
                {displayData.caucusTimer.topic}
              </div>
            {/if}

            <div class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight text-[#C9A84C]">
              {formatTime(Math.max(0, displayData.caucusTimer.remainingSec))}
            </div>
          </div>

        {:else if displayData.votingSession && phase === 'voting'}
          <!-- 投票 -->
          <div class="flex flex-col items-center gap-10">
            <div class="flex items-center gap-3 text-white/40">
              <div class="h-px w-12 bg-white/10"></div>
              <Vote size={20} class="text-[#5B92E5]" />
              <span class="text-lg tracking-[0.08em] uppercase">投票表决</span>
              <span class="text-sm tracking-wider text-white/20">
                {displayData.votingSession.majorityRule === '简单多数'
                  ? 'SIMPLE MAJORITY'
                  : 'TWO-THIRDS MAJORITY'}
              </span>
              <div class="h-px w-12 bg-white/10"></div>
            </div>

            <!-- 计票 -->
            <div class="grid grid-cols-3 gap-8">
              <div class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10">
                <div class="text-9xl font-light tabular-nums leading-none text-[#5B92E5]">
                  {displayData.votingSession.tally.yes}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">赞成</div>
              </div>
              <div class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10">
                <div class="text-9xl font-light tabular-nums leading-none text-white/40">
                  {displayData.votingSession.tally.no}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">反对</div>
              </div>
              <div class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10">
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

        {:else if phase === 'suspended'}
          <!-- 休会 -->
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Timer size={56} />
            <div class="text-9xl font-light tracking-[0.06em]">会议休会中</div>
            <div class="text-lg tracking-wider text-white/10">SUSPENDED</div>
          </div>

        {:else if phase === 'closed'}
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
          <span class="text-xs font-medium tracking-[0.08em] text-white/15 uppercase">近期记录</span>
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
          {connectionStatus === 'connecting' ? '正在连接...' : connectionStatus === 'disconnected' ? '连接断开，重连中...' : '等待主机连接'}
        </div>
        {#if connectionStatus === 'disconnected'}
          <div class="text-lg tracking-wider text-white/5">自动重连中，请稍候</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
