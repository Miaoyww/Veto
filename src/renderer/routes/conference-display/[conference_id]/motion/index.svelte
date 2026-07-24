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

  // 当选择了类型且填写了主题后，进入 focus 模式（弹簧动画 + 大字主题）
  const isFocused = $derived(draft?.type != null && draft?.topic != null)
</script>

<div class="flex w-full flex-col items-center">
  {#if motionStage}
    <div class="w-full px-10 py-8 text-center">

      {#if motionStage === 'editing'}
        <!-- 编辑阶段：逐步展示填写内容 -->
        <div
          class="flex w-full flex-col items-center gap-3"
          style="transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1); {isFocused ? 'padding-top: 0;' : 'padding-top: 20vh;'}"
        >
          <!-- 动议 标签 -->
          <div class="flex items-center justify-center gap-2">
            <Icon size={20} class="text-[#5B92E5]" />
            <span class="text-4xl font-medium tracking-[0.08em] text-[#5B92E5] uppercase">动议</span>
          </div>

          {#if draft?.proposedByName}
            <div
              class="font-semibold tracking-wide text-white"
              style="transition: font-size 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)"
              class:text-9xl={!isFocused}
              class:text-7xl={isFocused}
            >
              {draft.proposedByName}
            </div>
            <div
              class="tracking-wide text-white/30"
              style="transition: font-size 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)"
              class:text-5xl={!isFocused}
              class:text-3xl={isFocused}
            >
              发起动议
            </div>
          {/if}

          {#if draft?.type}
            <div class="text-2xl tracking-wide text-white/40">
              {MOTION_LABELS[draft.type] ?? draft.type}
            </div>
          {/if}

          {#if draft?.totalTimeSec}
            <div class="text-lg tracking-wider text-white/25">
              时长：<span class="text-white/45">{draft.totalTimeSec / 60} 分钟</span>
              {#if draft?.speakingTimePerPersonSec}
                <span class="mx-2 text-white/10">|</span>
                每人发言 <span class="text-white/45">{draft.speakingTimePerPersonSec} 秒</span>
              {/if}
            </div>
          {/if}

          <!-- 主题大字（focus 模式） -->
          {#if isFocused && draft?.topic}
            <div
              class="mt-12 text-9xl font-semibold tracking-wide text-white"
              style="animation: springIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both"
            >
              {draft.topic}
            </div>
          {/if}
        </div>

      {:else if motionStage === 'voting' && activeMotion}
        <!-- 表决阶段 -->
        <div class="flex items-center justify-center gap-2">
          <Icon size={20} class="text-[#5B92E5]" />
          <span class="text-sm font-medium tracking-[0.08em] text-[#5B92E5] uppercase">动议表决</span>
        </div>

        <div class="mt-3 text-3xl font-semibold tracking-wide text-white">
          {MOTION_LABELS[activeMotion.type] ?? activeMotion.type}
        </div>
        <div class="mt-2 text-lg tracking-wider text-white/40">
          由 <span class="text-white/70">{activeMotion.proposedByName}</span> 提出
        </div>

        {#if activeMotion.type === 'moderated_caucus'}
          <div class="mt-4 space-y-1 text-sm tracking-wider text-white/25">
            {#if activeMotion.topic}
              <p>主题：<span class="text-white/45">{activeMotion.topic}</span></p>
            {/if}
            {#if activeMotion.totalTimeSec}
              <p>总时长：<span class="text-white/45">{activeMotion.totalTimeSec / 60} 分钟</span></p>
            {/if}
            {#if activeMotion.speakingTimePerPersonSec}
              <p>每人发言：<span class="text-white/45">{activeMotion.speakingTimePerPersonSec} 秒</span></p>
            {/if}
          </div>
        {:else if activeMotion.type === 'unmoderated_caucus' && activeMotion.totalTimeSec}
          <div class="mt-4 text-sm tracking-wider text-white/25">
            时长：<span class="text-white/45">{activeMotion.totalTimeSec / 60} 分钟</span>
          </div>
        {/if}

        <!-- 举牌表决提示 -->
        <div class="mt-6 border-t border-white/10 pt-5">
          <div class="text-xl font-medium tracking-[0.06em] text-white/50">
            请同意该动议的国家高举国家牌
          </div>
          <div class="mt-2 text-sm tracking-wider text-white/15">
            主席团正在观察举牌情况
          </div>
        </div>

      {:else if motionStage === 'result' && activeMotion}
        <!-- 结果 -->
        {@const isApproved = activeMotion.status === 'approved'}
        <div class="flex items-center justify-center gap-2">
          <Icon size={20} class={isApproved ? 'text-emerald-400' : 'text-red-400'} />
          <span class="text-sm font-medium tracking-[0.08em] uppercase {isApproved ? 'text-emerald-400' : 'text-red-400'}">
            {isApproved ? '动议通过' : '动议未通过'}
          </span>
        </div>

        <div class="mt-3 text-3xl font-semibold tracking-wide text-white">
          {MOTION_LABELS[activeMotion.type] ?? activeMotion.type}
        </div>
        <div class="mt-2 text-lg tracking-wider text-white/40">
          由 <span class="text-white/70">{activeMotion.proposedByName}</span> 提出
        </div>
      {/if}
    </div>
  {/if}
</div>
