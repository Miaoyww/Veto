<script lang="ts">
  /**
   * conference-display/[conference_id]/index.svelte
   * ──────────────────────────────────────────────
   * Display 窗口 —— 全屏只读展示页，联合国严肃风格。
   * 通过 WebSocket 接收主机推送的 ConferenceDisplayData 并渲染。
   */
  import { onMount, onDestroy } from 'svelte'
  import { Gavel, Mic, Vote, Coffee, Timer, Users } from '@lucide/svelte'
  import { getDisplayBridge } from '$lib/services/conference-display-bridge'
  import { PHASE_LABELS, formatTime } from '$lib/engine/conference-engine'
  import { MINUTES_EVENT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME } from '$lib/const'

  let displayData = $state<ConferenceDisplayData | null>(null)

  // 点名确认过渡动画
  let rollCallTransition = $state<{
    delegationName: string
    shortName?: string
    color: string
    status: 'present' | 'absent'
  } | null>(null)
  let transitionTimer: ReturnType<typeof setTimeout> | null = null

  // 每秒刷新一次时间（用于计时器更新）
  let timerInterval: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    const bridge = getDisplayBridge()
    bridge.onHostCommand((data) => {
      // 点名阶段：如果包含 lastMarked，先展示确认动画
      if (data.rollCall?.lastMarked) {
        const marked = data.rollCall.lastMarked
        rollCallTransition = {
          delegationName: marked.delegationName,
          shortName: marked.shortName,
          color: marked.color,
          status: marked.status
        }
        if (transitionTimer) clearTimeout(transitionTimer)
        transitionTimer = setTimeout(() => {
          rollCallTransition = null
        }, 1800)
      }
      displayData = data
    })

    timerInterval = setInterval(() => {
      // 触发响应式更新
      displayData = displayData
    }, 500)
  })

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval)
    if (transitionTimer) clearTimeout(transitionTimer)
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
        <div
          class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5"
        >
          <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
          <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
            {PHASE_LABELS[displayData.phase] ?? displayData.phase}
          </span>
        </div>
      </div>
    </div>

    <!-- 中部：主展示区 -->
    <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
      <div class="flex w-full max-w-5xl flex-col items-center">
        <!-- 正在发言 -->
        {#if displayData.currentSpeaker && displayData.phase === 'general_debate'}
          <div class="flex flex-col items-center gap-10">
            <div class="flex items-center gap-3 text-white/40">
              <div class="h-px w-12 bg-white/10"></div>
              <Mic size={20} class="text-[#5B92E5]" />
              <span class="text-lg tracking-[0.08em] uppercase">正在发言</span>
              <div class="h-px w-12 bg-white/10"></div>
            </div>

            <div class="text-center">
              <div class="text-[56px] font-semibold leading-tight tracking-wide text-white">
                {displayData.currentSpeaker.delegationName}
              </div>
              {#if displayData.currentSpeaker.shortName}
                <div class="mt-1 text-2xl font-light tracking-[0.06em] text-white/30">
                  {displayData.currentSpeaker.shortName}
                </div>
              {/if}
            </div>

            <!-- 倒计时 -->
            <div
              class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight text-[#5B92E5]"
            >
              {formatTime(Math.max(0, (displayData.currentSpeaker.remainingSec ?? 0) - 0.5))}
            </div>
          </div>

          <!-- 磋商倒计时 -->
        {:else if displayData.caucusTimer && displayData.phase === 'caucus'}
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
              <div class="text-3xl font-medium tracking-wide text-[#5B92E5]/80">
                {displayData.caucusTimer.topic}
              </div>
            {/if}

            <div
              class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight text-[#C9A84C]"
            >
              {formatTime(Math.max(0, displayData.caucusTimer.remainingSec))}
            </div>
          </div>

          <!-- 投票 -->
        {:else if displayData.votingSession && displayData.phase === 'voting'}
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
              <!-- Yes -->
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-[64px] font-light tabular-nums leading-none text-[#5B92E5]">
                  {displayData.votingSession.tally.yes}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">赞成</div>
              </div>
              <!-- No -->
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-[64px] font-light tabular-nums leading-none text-white/40">
                  {displayData.votingSession.tally.no}
                </div>
                <div class="text-sm tracking-[0.12em] text-white/30 uppercase">反对</div>
              </div>
              <!-- Abstain -->
              <div
                class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
              >
                <div class="text-[64px] font-light tabular-nums leading-none text-white/40">
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

          <!-- 点名 -->
        {:else if displayData.phase === 'roll_call' && displayData.rollCall}
          <div class="flex flex-col items-center gap-10">
            <!-- 当前代表团 -->
            <div class="flex flex-col items-center gap-6">
              <div class="text-center">
                <div class="text-9xl font-semibold leading-tight text-white">
                  {displayData.rollCall.currentDelegationName}
                </div>
              </div>
            </div>
            <!-- 过渡动画：确认刚刚标记的代表团 -->
            {#if rollCallTransition}
              <div class="flex flex-col items-center gap-6">
                <div
                  class="mt-2 flex items-center gap-3 rounded-sm px-8 py-2.5 {rollCallTransition.status ===
                  'present'
                    ? 'border border-[#5B92E5]/30 bg-[#5B92E5]/10'
                    : 'border border-white/10 bg-white/[0.02]'}"
                >
                  <span
                    class="text-2xl font-semibold tracking-[0.08em] {rollCallTransition.status ===
                    'present'
                      ? 'text-[#5B92E5]'
                      : 'text-white/30'}"
                  >
                    {rollCallTransition.status === 'present' ? '出席 PRESENT' : '缺席 ABSENT'}
                  </span>
                </div>
              </div>
            {/if}

            <div class="flex items-center gap-3 text-white/40">
              <div class="h-px w-12 bg-white/10"></div>
              <span class="text-lg tracking-[0.08em] uppercase">点名</span>
              <span class="text-base text-white/20 tabular-nums">
                {displayData.rollCall.currentIndex + 1} / {displayData.rollCall.totalCount}
              </span>
              <div class="h-px w-12 bg-white/10"></div>
            </div>

            <!-- 进度条 -->
            <div class="h-[2px] w-[480px] overflow-hidden bg-white/5">
              <div
                class="h-full bg-[#5B92E5] transition-all duration-700"
                style="width: {Math.round(
                  (displayData.rollCall.currentIndex / displayData.rollCall.totalCount) * 100
                )}%"
              ></div>
            </div>
            <!-- 统计 -->
            <div class="flex gap-16 text-base tracking-wider text-white/25">
              <span
                >已出席 <span class="font-semibold text-[#5B92E5]"
                  >{displayData.rollCall.presentCount}</span
                ></span
              >
              <span
                >简单多数 <span class="font-semibold text-white/40"
                  >{displayData.rollCall.simpleMajorityThreshold}</span
                ></span
              >
              <span
                >2/3多数 <span class="font-semibold text-white/40"
                  >{displayData.rollCall.twoThirdsThreshold}</span
                ></span
              >
            </div>
          </div>

          <!-- 休会 -->
        {:else if displayData.phase === 'suspended'}
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Timer size={56} />
            <div class="text-3xl font-light tracking-[0.06em]">会议休会中</div>
            <div class="text-lg tracking-wider text-white/10">SUSPENDED</div>
          </div>

          <!-- 闭幕 -->
        {:else if displayData.phase === 'closed'}
          <div class="flex flex-col items-center gap-6 text-white/15">
            <Gavel size={56} />
            <div class="text-3xl font-light tracking-[0.06em]">会议已闭幕</div>
            <div class="text-lg tracking-wider text-white/10">CLOSED</div>
          </div>
        {:else}
          <!-- 默认：准备就绪 -->
          <div class="flex flex-col items-center gap-6">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-white/[0.02]"
            >
              <Users size={28} class="text-white/15" />
            </div>
            <div class="text-2xl font-light tracking-[0.06em] text-white/20">准备就绪</div>
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
    <!-- 等待连接 -->
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-6 text-white/10">
        <div class="text-5xl font-light tracking-[0.06em]">等待主机连接</div>
      </div>
    </div>
  {/if}
</div>
