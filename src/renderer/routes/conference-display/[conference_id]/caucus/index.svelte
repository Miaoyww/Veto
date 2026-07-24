<script lang="ts">
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

{#if data.caucusTimer.type === 'moderated' && data.caucusTimer.caucusSpeakers}
  {@const speakers = data.caucusTimer.caucusSpeakers}
  {@const currentIdx = data.caucusTimer.currentSpeakerIndex ?? -1}
  {@const currentSpeaker = currentIdx >= 0 ? speakers[currentIdx] : null}
  {@const nextSpeaker =
    currentIdx >= 0 && currentIdx + 1 < speakers.length ? speakers[currentIdx + 1] : null}
  <!-- 有主持磋商：逐人发言 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <span class="text-lg tracking-[0.08em] uppercase">有主持核心磋商</span>
      <span class="text-sm tracking-wider text-white/20">{speakers.length} 位发言人</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    {#if data.caucusTimer.topic}
      <div class="text-9xl font-medium tracking-wide text-[#5B92E5]/80">
        {data.caucusTimer.topic}
      </div>
    {/if}

    {#if currentSpeaker}
      <!-- 当前发言人 -->
      <div class="text-center">
        <div class="text-sm tracking-[0.08em] text-white/30 uppercase">正在发言</div>
        <div class="mt-2 text-6xl font-semibold text-white">
          {currentSpeaker.delegationName}
        </div>
        <div class="mt-1 text-sm tracking-wider text-white/20">
          {speakers.length} 人中第 {currentIdx + 1} 位
        </div>
        <div
          class="mt-4 font-mono text-[90px] font-light tabular-nums leading-none tracking-tight text-[#C9A84C]"
        >
          {formatTime(
            Math.max(0, data.currentSpeaker?.remainingSec ?? data.caucusTimer.remainingSec)
          )}
        </div>
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

    <!-- 已完成发言 -->
    {#if currentIdx > 0}
      <div class="flex flex-wrap items-center justify-center gap-3">
        {#each speakers.slice(0, currentIdx) as s}
          <span class="text-lg tracking-wider text-white/8 line-through">{s.delegationName}</span>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <!-- 自由磋商：总倒计时 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <Coffee size={20} class="text-[#C9A84C]" />
      <span class="text-lg tracking-[0.08em] uppercase">自由磋商</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    {#if displayData.caucusTimer.topic}
      <div class="text-9xl font-medium tracking-wide text-[#5B92E5]/80">
        {displayData.caucusTimer.topic}
      </div>
    {/if}

    <div
      class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight text-[#C9A84C]"
    >
      {formatTime(Math.max(0, displayData.caucusTimer.remainingSec))}
    </div>
  </div>
{/if}
