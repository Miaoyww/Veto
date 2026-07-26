<script lang="ts">
  /**
   * motion/index.svelte
   * ──────────────────────
   * 动议阶段内容组件 —— 通过 $props 接收 Shell 传入的数据。
   *
   * 阶段流转：editing（编辑中） → voting（表决中） → result（结果）
   */
  import {
    Presentation,
    MessageSquare,
    Coffee,
    Pencil,
    Gavel,
    Timer,
    LogOut,
    Vote,
    UserRoundCheck
  } from '@lucide/svelte'
  import { MOTION_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData, MotionDraft } from '$lib/types-conference'
  import type { MotionType } from '$lib/types-conference'

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
    close_meeting: LogOut,
    substantive_vote: Vote,
    change_attendance: UserRoundCheck
  }

  const typeForIcon = $derived(activeMotion?.type ?? draft?.type)
  const Icon = $derived(typeForIcon ? (MOTION_ICONS[typeForIcon] ?? Presentation) : Presentation)

  /**
   * 按动议类型生成 Display 上展示的标题和副标题。
   * - moderated_caucus → 标题=议题文本，副标题=空
   * - unmoderated_caucus → 标题="自由磋商"，副标题="为 N 分钟"
   * - modify_speaking_time → 标题="修改发言时间"，副标题="为 N 秒"
   * - 其他 → 标题=动议类型中文名，副标题=空
   */
  function getDisplayParts(
    d: MotionDraft | null,
    am: ConferenceDisplayData['activeMotion']
  ): { title: string; subtitle: string } {
    const type = (am?.type ?? d?.type) as MotionType | undefined
    if (!type) return { title: '', subtitle: '' }

    switch (type) {
      case 'moderated_caucus': {
        const topic = am?.topic ?? d?.topic ?? ''
        return { title: topic, subtitle: topic ? '动议主题' : '' }
      }
      case 'unmoderated_caucus': {
        const sec = am?.totalTimeSec ?? d?.totalTimeSec
        if (sec) {
          const min = sec / 60
          return {
            title: '自由磋商',
            subtitle: `为 ${min % 1 === 0 ? min : min.toFixed(1)} 分钟`
          }
        }
        return { title: '自由磋商', subtitle: '' }
      }
      case 'modify_speaking_time': {
        const sec = am?.newTimeSec ?? d?.newTimeSec
        return {
          title: '修改发言时间',
          subtitle: sec != null ? `为 ${sec} 秒` : ''
        }
      }
      case 'suspend_meeting':
        return { title: '暂时休会', subtitle: '' }
      case 'close_meeting':
        return { title: '闭幕', subtitle: '' }
      case 'closure_debate':
        return { title: '结束辩论', subtitle: '' }
      case 'open_speakers_list':
        return { title: '开启主发言名单', subtitle: '' }
      case 'change_attendance':
        return { title: '更改出席状态', subtitle: '' }
      case 'substantive_vote': {
        const docName = am?.documentName ?? d?.documentName ?? ''
        return { title: docName, subtitle: docName ? '实质性投票' : '' }
      }
      default:
        return { title: MOTION_LABELS[type] ?? type, subtitle: '' }
    }
  }

  const displayParts = $derived(getDisplayParts(draft, activeMotion))
  const displayTitle = $derived(displayParts.title)
  const displaySubtitle = $derived(displayParts.subtitle)

  // focus 模式：有标题内容时放大展示
  const isFocused = $derived(draft?.type != null && displayTitle !== '')
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
          <!-- 描述大字（focus 模式：居中） -->
          {#if isFocused && displayTitle}
            <div class="flex flex-1 flex-col items-center justify-center gap-4">
              <div
                class="font-semibold tracking-wide text-white"
                style="animation: fadeUp 0.7s ease both; font-size: 7rem"
              >
                {displayTitle}
              </div>
              {#if displaySubtitle}
                <div
                  class="tracking-wide text-white/60"
                  style="animation: fadeUp 0.7s ease both; font-size: 4rem"
                >
                  {displaySubtitle}
                </div>
              {/if}
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
            {#if draft?.newTimeSec != null}
              <div class="text-3xl tracking-wider text-white/25">
                发言时间：<span class="text-white/45">{draft.newTimeSec} 秒</span>
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

        <div class="mt-4 flex flex-col items-center gap-2">
          <span class="text-7xl font-semibold tracking-wide text-white">{displayTitle}</span>
          {#if displaySubtitle}
            <span class="text-4xl tracking-wide text-white/60">{displaySubtitle}</span>
          {/if}
        </div>
        <div class="mt-3 text-3xl tracking-wider text-white/40">
          由 <span class="text-white/70">{activeMotion.proposedByName}</span> 提出
        </div>

        {#if activeMotion.type === 'moderated_caucus'}
          <div class="mt-5 space-y-2 text-2xl tracking-wider text-white/25">
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
        {:else if activeMotion.type === 'modify_speaking_time' && activeMotion.newTimeSec != null}
          <div class="mt-5 text-2xl tracking-wider text-white/25">
            修改发言时间为 <span class="text-white/45">{activeMotion.newTimeSec} 秒</span>
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
