<script lang="ts">
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { formatTime } from '$lib/utils'
  import { Coffee, User } from '@lucide/svelte'
  import SpeakerQueueDisplay from '$lib/components/conference-display/speaker-queue-display.svelte'
  import CurrentSpeakerCard from '$lib/components/conference-display/current-speaker-card.svelte'
  import DisplaySectionHeader from '$lib/components/conference-display/display-section-header.svelte'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'
  import { DISPLAY_MAX_SPEAKERS } from '$lib/classes/const'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

<DisplayPage>
  {#if data.caucusTimer.type === 'moderated' && data.caucusTimer.caucusSpeakers}
    {@const speakers = data.caucusTimer.caucusSpeakers}
    {@const currentIdx = data.caucusTimer.currentSpeakerIndex ?? -1}
    {@const currentSpeaker = currentIdx >= 0 ? speakers[currentIdx] : null}

    <!-- 有主持磋商：逐人发言 -->
    <div class="flex flex-col items-center gap-10">
      {#if currentSpeaker && currentSpeaker.status === 'speaking' && data.currentSpeaker}
        <!-- 当前发言人 -->
        <CurrentSpeakerCard
          delegation={data.currentSpeaker.delegation}
          remainingSec={data.currentSpeaker.remainingSec ?? 0}
          status={data.currentSpeaker.status}
        />
      {:else}
        <SpeakerQueueDisplay {speakers} max={DISPLAY_MAX_SPEAKERS} title="有主持的核心磋商" />
      {/if}
    </div>
  {:else if data.caucusTimer.type === 'individual'}
    <!-- 个人演讲：单人独白倒计时 -->
    {@const isPaused = data.caucusTimer.status === 'paused'}
    <div class="flex flex-col items-center gap-10">
      <DisplaySectionHeader
        Icon={User}
        label={isPaused ? '计时已暂停' : '个人演讲'}
        colorClass={isPaused ? 'text-[#C9A84C]/50' : 'text-[#5B92E5]'}
      />

      {#if data.caucusTimer.topic}
        <div
          class="text-2xl font-medium tracking-[0.05em] {isPaused ? 'text-white/30' : 'text-white/70'}"
        >
          {data.caucusTimer.topic}
        </div>
      {/if}

      <div
        class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {isPaused
          ? 'text-[#C9A84C]/50'
          : 'text-[#5B92E5]'}"
      >
        {formatTime(Math.max(0, data.caucusTimer.remainingSec))}
      </div>
    </div>
  {:else}
    <!-- 自由磋商：总倒计时 -->
    {@const isPaused = data.caucusTimer.status === 'paused'}
    <div class="flex flex-col items-center gap-10">
      <DisplaySectionHeader
        Icon={Coffee}
        label={isPaused ? '计时已暂停' : '自由磋商'}
        colorClass={isPaused ? 'text-[#C9A84C]/50' : 'text-[#C9A84C]'}
      />

      <div
        class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {isPaused
          ? 'text-[#C9A84C]/50'
          : 'text-[#C9A84C]'}"
      >
        {formatTime(Math.max(0, data.caucusTimer.remainingSec))}
      </div>
    </div>
  {/if}
</DisplayPage>
