<script lang="ts">
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { Mic, Coffee } from '@lucide/svelte'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

{#if data.caucusTimer.type === 'moderated' && data.caucusTimer.caucusSpeakers}
  {@const speakers = data.caucusTimer.caucusSpeakers}
  {@const currentIdx = data.caucusTimer.currentSpeakerIndex ?? -1}
  {@const currentSpeaker = currentIdx >= 0 ? speakers[currentIdx] : null}
  {@const restQueue = data.caucusTimer.caucusSpeakers.slice(currentIdx + 2)}

  {@const nextSpeaker =
    currentIdx >= 0 && currentIdx + 1 < speakers.length ? speakers[currentIdx + 1] : null}
  <!-- 有主持磋商：逐人发言 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <span class="text-lg tracking-[0.08em] uppercase">有主持核心磋商</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

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
        <div class="text-9xl font-semibold tracking-wide text-white">
          {data.currentSpeaker.delegationName}
        </div>
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
    {:else if currentSpeaker && currentSpeaker.status === 'ready'}
      <!-- 发言人就绪（等待主席开始计时） -->
      <div class="flex flex-col items-center gap-10">
        <div class="flex items-center gap-3 text-white/40">
          <div class="h-px w-12 bg-white/10"></div>
          <Mic size={20} class="text-[#C9A84C]" />
          <span class="text-lg tracking-[0.08em] uppercase">即将发言</span>
          <div class="h-px w-12 bg-white/10"></div>
        </div>

        <div class="text-center">
          <div class="text-8xl font-semibold tracking-wide text-white">
            {currentSpeaker.delegationName}
          </div>
        </div>

        <div class="text-lg tracking-wider text-white/15">等待主席开始计时</div>
      </div>
    {/if}

    <!-- 下一位 -->
    {#if nextSpeaker}
      <div class="flex items-center gap-4 text-white/15">
        <span class="text-sm tracking-wider uppercase">下一位</span>
        <span class="text-2xl text-white/30">{nextSpeaker.delegationName}</span>
      </div>
    {:else if currentIdx + 1 >= speakers.length}
      <div class="text-lg tracking-wider text-white/15">最后一位发言人</div>
    {/if}
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
