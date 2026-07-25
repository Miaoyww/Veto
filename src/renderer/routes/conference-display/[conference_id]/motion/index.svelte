<script lang="ts">
  /**
   * motion/index.svelte
   * ──────────────────────
   * 动议阶段内容组件 —— 通过 $props 接收 Shell 传入的数据。
   *
   * 阶段流转：editing（编辑中） → voting（表决中） → result（结果）
   */
  import { Presentation, MessageSquare, Coffee, Pencil, Gavel, Timer, LogOut } from '@lucide/svelte'
  import { MOTION_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { onDestroy } from 'svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  const draft = $derived(data.motionDraft ?? null)
  const activeMotion = $derived(data.activeMotion ?? null)

  // 阶段：draft → voting → result
  const motionStage = $derived.by(() => {
    if (activeMotion) return activeMotion.status === 'pending' ? 'voting' : 'result'
    if (draft) return 'editing'
    return null
  })

  const MOTION_ICONS: Record<string, typeof Gavel> = {
    open_speakers_list: Presentation,
    moderated_caucus: MessageSquare,
    unmoderated_caucus: Coffee,
    modify_speaking_time: Pencil,
    closure_debate: Gavel,
    suspend_meeting: Timer,
    close_meeting: LogOut
  }

  const typeForIcon = $derived(activeMotion?.type ?? draft?.type)
  const Icon = $derived(typeForIcon ? (MOTION_ICONS[typeForIcon] ?? Presentation) : Presentation)

  // 延迟清空的 topic，避免 focus 模式退出时内容立刻回弹
  let displayTopic = $state('')
  let topicTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    const t = draft?.topic
    if (t) {
      if (topicTimer) {
        clearTimeout(topicTimer)
        topicTimer = null
      }
      displayTopic = t
    } else if (displayTopic && !topicTimer) {
      topicTimer = setTimeout(() => {
        displayTopic = ''
        topicTimer = null
      }, 500)
    }
  })

  onDestroy(() => {
    if (topicTimer) clearTimeout(topicTimer)
  })

  const isFocused = $derived(draft?.type != null && displayTopic !== '')
</script>

<div class="flex w-full flex-col items-center">
  {#if motionStage}
    <div class="w-full px-10 py-8 text-center">
      {#if motionStage === 'editing'}
        <!-- 编辑阶段：逐步展示填写内容 -->
        <div
          class="flex w-full flex-col items-center gap-4"
          style="transition: all 0.7s ease; min-height: {isFocused ? '75vh' : 'auto'}"
        >
          <!-- 主题大字（focus 模式：居中） -->
          {#if isFocused && displayTopic}
            <div class="flex flex-1 items-center justify-center">
              <div
                class="font-semibold tracking-wide text-white"
                style="animation: fadeUp 0.7s ease both; font-size: 9rem"
              >
                {displayTopic}
              </div>
            </div>
          {/if}

          <!-- 头部信息（focus 时移到底部） -->
          <div class="flex flex-col items-center gap-4">
            <!-- 动议 标签 -->
            <div class="flex items-center justify-center gap-3">
              <Icon size={24} class="text-[#5B92E5]" />
              <span class="text-3xl font-semibold tracking-[0.08em] text-[#5B92E5] uppercase"
                >动议</span
              >
            </div>

            {#if draft?.type}
              <div class="text-4xl tracking-wide text-white/40">
                {MOTION_LABELS[draft.type] ?? draft.type}
              </div>
            {/if}

            {#if draft?.proposedByName}
              <div
                class="font-semibold tracking-wide text-white"
                style="transition: font-size 0.7s ease"
                class:text-9xl={!isFocused}
                class:text-5xl={isFocused}
              >
                {draft.proposedByName}
              </div>
              <div
                class="tracking-wide text-white/30"
                style="transition: font-size 0.7s ease"
                class:text-7xl={!isFocused}
                class:text-2xl={isFocused}
              >
                发起动议
              </div>
            {/if}

            {#if draft?.totalTimeSec}
              <div class="text-3xl tracking-wider text-white/25">
                时长：<span class="text-white/45">{draft.totalTimeSec} 秒</span>
                {#if draft?.speakingTimePerPersonSec}
                  <span class="mx-3 text-white/10">|</span>
                  每人发言 <span class="text-white/45">{draft.speakingTimePerPersonSec} 秒</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {:else if motionStage === 'voting' && activeMotion}
        <!-- 表决阶段 -->
        <div class="flex items-center justify-center gap-3">
          <Icon size={32} class="text-[#5B92E5]" />
          <span class="text-3xl font-semibold tracking-[0.08em] text-[#5B92E5] uppercase"
            >动议表决</span
          >
        </div>

        <div class="mt-4 text-8xl font-semibold tracking-wide text-white">
          <span>{activeMotion.topic}</span>
        </div>
        <div class="mt-3 text-3xl tracking-wider text-white/40">
          由 <span class="text-white/70">{activeMotion.proposedByName}</span> 提出
        </div>

        {#if activeMotion.type === 'moderated_caucus'}
          <div class="mt-5 space-y-2 text-2xl tracking-wider text-white/25">
            {#if activeMotion.topic}
              <p>
                类型: <span class="text-white/45"
                  >{MOTION_LABELS[activeMotion.type] ?? activeMotion.type}</span
                >
              </p>
            {/if}
            {#if activeMotion.totalTimeSec}
              <p>总时长：<span class="text-white/45">{activeMotion.totalTimeSec} 秒</span></p>
            {/if}
            {#if activeMotion.speakingTimePerPersonSec}
              <p>
                每人发言：<span class="text-white/45"
                  >{activeMotion.speakingTimePerPersonSec} 秒</span
                >
              </p>
            {/if}
          </div>
        {:else if activeMotion.type === 'unmoderated_caucus' && activeMotion.totalTimeSec}
          <div class="mt-5 text-2xl tracking-wider text-white/25">
            时长：<span class="text-white/45">{activeMotion.totalTimeSec} 秒</span>
          </div>
        {/if}

        <!-- 举牌表决提示 -->
        <div class="mt-8 border-t border-white/10 pt-6">
          <div class="text-4xl font-semibold tracking-[0.06em] text-white/50">
            请同意该动议的国家高举国家牌
          </div>
          <div class="mt-3 text-xl tracking-wider text-white/15">主席团正在观察举牌情况</div>
        </div>
      {:else if motionStage === 'result' && activeMotion}
        <!-- 结果 -->
        {@const isApproved = activeMotion.status === 'approved'}
        <div class="flex items-center justify-center gap-3">
          <Icon size={32} class={isApproved ? 'text-emerald-400' : 'text-red-400'} />
          <span
            class="text-3xl font-semibold tracking-[0.08em] uppercase {isApproved
              ? 'text-emerald-400'
              : 'text-red-400'}"
          >
            {isApproved ? '表决通过' : '表决否决'}
          </span>
        </div>

        <div
          class="mt-5 text-8xl font-bold tracking-wide {isApproved
            ? 'text-emerald-400'
            : 'text-red-400'}"
        >
          {isApproved ? '通过' : '否决'}
        </div>

        <div class="mt-4 text-5xl font-semibold tracking-wide text-white">
          {MOTION_LABELS[activeMotion.type] ?? activeMotion.type}
        </div>
        <div class="mt-3 text-3xl tracking-wider text-white/40">
          由 <span class="text-white/70">{activeMotion.proposedByName}</span> 提出
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @keyframes fadeUp {
    0% {
      opacity: 0;
      transform: scale(0.5) translateY(40px);
    }
    60% {
      opacity: 1;
      transform: scale(1.05) translateY(-8px);
    }
    80% {
      transform: scale(0.97) translateY(3px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
