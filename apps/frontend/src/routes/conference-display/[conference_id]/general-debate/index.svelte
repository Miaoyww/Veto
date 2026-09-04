<script lang="ts">
  /**
   * general-debate/index.svelte
   * ────────────────────────────
   * Display 窗口 —— 一般性辩论阶段内容组件。
   *
   * 四个子视图：
   * - yieldPending：让渡处理中状态
   * - currentSpeaker：正在发言（席位名 + 倒计时 + 暂停状态）
   * - readySpeaker：预发言（即将发言 + 等待开始计时）
   * - 主发言名单：下一个发言 + 后续队列
   */
  import { HelpCircle, Volume2, ArrowRight } from '@lucide/svelte'
  import { formatTime } from '$lib/classes/formatters/time-formater'
  import type { ConferenceDisplayData } from '$lib/classes/types/conference'
  import SpeakerQueueDisplay from '$lib/components/conference-display/speaker-queue-display.svelte'
  import CurrentSpeakerCard from '$lib/components/conference-display/current-speaker-card.svelte'
  import DisplaySectionHeader from '$lib/components/conference-display/display-section-header.svelte'
  import { DISPLAY_MAX_SPEAKERS } from '$lib/classes/const'
  import SeatNameDisplay from '$lib/components/conference-display/seat-name-display.svelte'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  $effect(() => {
    console.log('[general-debate] data:', data)
  })

  const yp = $derived(data.yieldPending as NonNullable<ConferenceDisplayData['yieldPending']>)
  const isYieldCalling = $derived(
    yp != null &&
      (yp.yieldType === 'question' || yp.yieldType === 'comment') &&
      !yp.questionerSeat
  )
  const isYieldQuestioning = $derived(
    yp?.yieldType === 'question' && yp.questionerSeat != null
  )
  const isYieldDelegate = $derived(yp?.yieldType === 'delegate')
</script>

<DisplayPage>
  <!-- ═══ 让渡处理中状态 ═══ -->
{#if isYieldCalling}
  <!-- 主席呼吁场下提问/评论 -->
  <div class="flex flex-col items-center gap-10">
    <DisplaySectionHeader
      Icon={Volume2}
      label={yp.yieldType === 'question' ? '呼吁提问' : '呼吁评论'}
      colorClass="text-[#C9A84C]"
    />

    <div class="text-center">
      <div class="text-6xl font-light tracking-wide text-white/70">
        {yp.yieldType === 'question' ? '场下有无提问？' : '场下有无评论？'}
      </div>
      <div class="mt-4 text-2xl font-light tracking-[0.06em] text-white/30">
        {yp.originalSeat.name} 将剩余 {formatTime(Math.round(yp.remainingSec))} 让渡给{yp.yieldType ===
        'question'
          ? '提问'
          : '评论'}
      </div>
    </div>
  </div>
{:else if isYieldQuestioning}
  <!-- 提问方已指定，等待/正在进行提问 -->
  <div class="flex flex-col items-center gap-10">
    <DisplaySectionHeader Icon={HelpCircle} label="提问环节" colorClass="text-[#5B92E5]" />

    <div class="text-center">
      <SeatNameDisplay
        name={yp.questionerSeat?.name ?? ''}
        shortName={yp.questionerSeat?.procedure?.shortName ?? ''}
      />
      <div class="mt-2 text-3xl font-light tracking-[0.06em] text-white/30">正在提问</div>
      <div class="mt-6 text-xl tracking-wider text-white/20">
        {yp.originalSeat.name} 将使用剩余 {formatTime(Math.round(yp.remainingSec))} 回答
      </div>
    </div>
  </div>
{:else if isYieldDelegate}
  <!-- 让渡给代表：等待主席选择 -->
  <div class="flex flex-col items-center gap-10">
    <DisplaySectionHeader Icon={ArrowRight} label="让渡时间" colorClass="text-[#C9A84C]" />

    <div class="text-center">
      <div class="text-5xl font-light tracking-wide text-white/70">
        {yp.originalSeat.name} 将剩余 {formatTime(Math.round(yp.remainingSec))} 让渡给另一位代表
      </div>
      <div class="mt-4 text-2xl tracking-wider text-white/20">等待主席指定目标席位</div>
    </div>
  </div>
{:else if data.currentSpeaker}
  <CurrentSpeakerCard
    seat={data.currentSpeaker.seat}
    remainingSec={data.currentSpeaker.remainingSec ?? 0}
    status={data.currentSpeaker.status}
  />
{:else}
  {@const waiting = data.speakersList.filter((s: { status: string }) => s.status === 'waiting')}
  {@const allSpeakers = data.readySpeaker ? [data.readySpeaker, ...waiting] : waiting}
  {@const displayTitle = data.readySpeaker ? '即将发言' : '主发言名单'}
  {@const displaySubtitle = data.readySpeaker ? '等待主席开始计时' : ''}
  <SpeakerQueueDisplay
    speakers={allSpeakers}
    max={DISPLAY_MAX_SPEAKERS}
    title={displayTitle}
    subtitle={displaySubtitle}
  />
    {/if}
</DisplayPage>
