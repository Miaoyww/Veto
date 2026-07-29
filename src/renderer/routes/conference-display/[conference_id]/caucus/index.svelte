<script lang="ts">
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { Mic, Coffee, User } from '@lucide/svelte'
  import SpeakerQueueDisplay from '$lib/components/conference/display/speaker-queue-display.svelte'
  import { DISPLAY_MAX_SPEAKERS } from '$lib/const'
  import DelegationNameDisplay from '$lib/components/conference/display/delegation-name-display.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

{#if data.caucusTimer.type === 'moderated' && data.caucusTimer.caucusSpeakers}
  {@const speakers = data.caucusTimer.caucusSpeakers}
  {@const currentIdx = data.caucusTimer.currentSpeakerIndex ?? -1}
  {@const currentSpeaker = currentIdx >= 0 ? speakers[currentIdx] : null}

  <!-- 有主持磋商：逐人发言 -->
  <div class="flex flex-col items-center gap-10">
    {#if currentSpeaker && currentSpeaker.status === 'speaking' && data.currentSpeaker}
      <!-- 当前发言人 -->
      <div class="flex items-center gap-3 text-white/40">
        <div class="h-px w-12 bg-white/10"></div>
        <Mic
          size={20}
          class={data.currentSpeaker.status === 'paused' ? 'text-[#C9A84C]' : 'text-[#5B92E5]'}
        />
        <span class="text-lg tracking-[0.08em] uppercase">
          {data.currentSpeaker.status === 'paused' ? '计时已暂停' : '正在发言'}
        </span>
        <div class="h-px w-12 bg-white/10"></div>
      </div>

      <div class="text-center">
        <DelegationNameDisplay
          name={data.currentSpeaker?.delegation?.name ?? ''}
          shortName={data.currentSpeaker?.delegation?.shortName ?? ''}
        />
      </div>

      {@const isTimeout = data.caucusTimer.speakerTransition === 'timeout'}
      <!-- 倒计时 -->
      <div
        class="font-mono text-9xl font-light tabular-nums leading-none tracking-tight {data
          .currentSpeaker.status === 'paused'
          ? 'text-[#C9A84C]'
          : isTimeout
            ? 'text-red-500 animate-pulse'
            : 'text-[#5B92E5]'}"
      >
        {formatTime(Math.max(0, data.currentSpeaker.remainingSec ?? 0))}
      </div>
    {:else}
      <SpeakerQueueDisplay {speakers} max={DISPLAY_MAX_SPEAKERS} title="有主持的核心磋商" />
    {/if}
  </div>
{:else if data.caucusTimer.type === 'individual'}
  <!-- 个人演讲：单人独白倒计时 -->
  {@const isPaused = data.caucusTimer.status === 'paused'}
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <User size={20} class={isPaused ? 'text-[#C9A84C]/50' : 'text-[#5B92E5]'} />
      <span class="text-lg tracking-[0.08em] uppercase">
        {isPaused ? '计时已暂停' : '个人演讲'}
      </span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

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
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <Coffee size={20} class={isPaused ? 'text-[#C9A84C]/50' : 'text-[#C9A84C]'} />
      <span class="text-lg tracking-[0.08em] uppercase">
        {isPaused ? '计时已暂停' : '自由磋商'}
      </span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <div
      class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {isPaused
        ? 'text-[#C9A84C]/50'
        : 'text-[#C9A84C]'}"
    >
      {formatTime(Math.max(0, data.caucusTimer.remainingSec))}
    </div>
  </div>
{/if}
