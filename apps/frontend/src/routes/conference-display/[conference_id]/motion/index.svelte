<script lang="ts">
  /**
   * motion/index.svelte
   * ──────────────────────
   * 动议阶段内容组件 —— 通过 $props 接收 Shell 传入的数据。
   *
   * 阶段流转：voting（表决中） → result（结果）
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
  import { MOTION_LABELS } from '$lib/classes/types/conference'
  import type { ConferenceDisplayData } from '$lib/classes/types/conference'
  import type { MotionType } from '$lib/classes/types/conference'
  import AutoFitText from '$lib/components/conference-display/auto-fit-text.svelte'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'
  import DisplaySectionHeader from '$lib/components/conference-display/display-section-header.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  const activeMotion = $derived(data.activeMotion ?? null)

  const motionStage = $derived.by(() => {
    if (!activeMotion) return null
    return activeMotion.status === 'pending' ? 'voting' : 'result'
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

  const Icon = $derived(
    activeMotion?.type ? (MOTION_ICONS[activeMotion.type] ?? Presentation) : Presentation
  )

  function getDisplayParts(am: ConferenceDisplayData['activeMotion']): {
    title: string
  } {
    const type = am?.type as MotionType | undefined
    if (!type) return { title: '' }

    switch (type) {
      case 'moderated_caucus':
        return { title: am?.topic ?? '' }
      case 'unmoderated_caucus':
        return { title: '自由磋商' }
      case 'modify_speaking_time':
        return { title: '修改发言时间' }
      case 'suspend_meeting':
        return { title: '暂时休会' }
      case 'close_meeting':
        return { title: '闭幕' }
      case 'closure_debate':
        return { title: '结束辩论' }
      case 'open_speakers_list':
        return { title: '开启主发言名单' }
      case 'change_attendance':
        return { title: '更改出席状态' }
      case 'substantive_vote':
        return { title: am?.documentName ?? '' }
      default:
        return { title: MOTION_LABELS[type] ?? type }
    }
  }

  const displayTitle = $derived(getDisplayParts(activeMotion).title)
</script>

<DisplayPage>
  {#if motionStage === 'voting' && activeMotion}
    <DisplaySectionHeader {Icon} label="动议表决" colorClass="text-[#5B92E5]" />

    <div class="mt-5 flex flex-col items-center gap-2">
      <AutoFitText
        text={displayTitle}
        class="font-sem ibold tracking-wide text-white text-balance wrap-break-word"
      />
    </div>

    <div class="mt-3 text-3xl tracking-wider text-white/40">
      由 <span class="text-white/70">{activeMotion.proposedBy?.name}</span> 提出
    </div>

    {#if activeMotion.type === 'moderated_caucus'}
      <div class="mt-15 space-y-2 text-2xl tracking-wider text-white/25">
        {#if activeMotion.totalTimeSec}
          <p>总时长：<span class="text-white/45">{activeMotion.totalTimeSec} 秒</span></p>
        {/if}
        {#if activeMotion.speakingTimePerPersonSec}
          <p>
            每人发言：<span class="text-white/45">{activeMotion.speakingTimePerPersonSec} 秒</span>
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
  {:else if motionStage === 'result' && activeMotion}
    {@const isApproved = activeMotion.status === 'approved'}
    <DisplaySectionHeader
      {Icon}
      label={isApproved ? '表决通过' : '表决否决'}
      colorClass={isApproved ? 'text-emerald-400' : 'text-red-400'}
    />

    <div
      class="mt-5 text-8xl font-bold tracking-wide {isApproved
        ? 'text-emerald-400'
        : 'text-red-400'}"
    >
      {isApproved ? '通过' : '否决'}
    </div>

    <div class="mt-4 font-semibold tracking-wide text-white">
      <AutoFitText
        text={displayTitle}
        class="font-semibold tracking-wide text-white text-balance"
      />
    </div>
    <div class="mt-3 text-3xl tracking-wider text-white/40">
      由 <span class="text-white/70">{activeMotion.proposedBy?.name}</span> 提出
    </div>
  {/if}
</DisplayPage>
