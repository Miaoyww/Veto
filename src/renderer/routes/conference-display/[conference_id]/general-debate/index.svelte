<script lang="ts">
  /**
   * general-debate/index.svelte
   * ────────────────────────────
   * Display 窗口 —— 一般性辩论阶段内容组件。
   *
   * 四个子视图：
   * - yieldPending：让渡处理中状态
   * - currentSpeaker：正在发言（代表团名 + 倒计时 + 暂停状态）
   * - readySpeaker：预发言（即将发言 + 等待开始计时）
   * - 主发言名单：下一个发言 + 后续队列
   */
  import { Mic, HelpCircle, MessageCircle, Volume2, ArrowRight } from '@lucide/svelte'
  import { formatTime } from '$lib/utils'
  import type { ConferenceDisplayData } from '$lib/types-conference'

  let { data }: { data: ConferenceDisplayData } = $props()

  const yp = $derived(data.yieldPending)
  const isYieldCalling = $derived(
    yp != null && (yp.yieldType === 'question' || yp.yieldType === 'comment') && !yp.questionerDelegationName
  )
  const isYieldQuestioning = $derived(
    yp?.yieldType === 'question' && yp.questionerDelegationName != null
  )
  const isYieldDelegate = $derived(yp?.yieldType === 'delegate')
</script>

<!-- ═══ 让渡处理中状态 ═══ -->
{#if isYieldCalling}
  <!-- 主席呼吁场下提问/评论 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <Volume2 size={20} class="text-[#C9A84C]" />
      <span class="text-lg tracking-[0.08em] uppercase">
        {yp.yieldType === 'question' ? '呼吁提问' : '呼吁评论'}
      </span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <div class="text-center">
      <div class="text-6xl font-light tracking-wide text-white/70">
        {yp.yieldType === 'question' ? '场下有无提问？' : '场下有无评论？'}
      </div>
      <div class="mt-4 text-2xl font-light tracking-[0.06em] text-white/30">
        {yp.originalDelegationName} 将剩余 {formatTime(Math.round(yp.remainingSec))} 让渡给{yp.yieldType === 'question' ? '提问' : '评论'}
      </div>
    </div>
  </div>

{:else if isYieldQuestioning}
  <!-- 提问方已指定，等待/正在进行提问 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <HelpCircle size={20} class="text-[#5B92E5]" />
      <span class="text-lg tracking-[0.08em] uppercase">提问环节</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <div class="text-center">
      <div class="text-7xl font-semibold tracking-wide text-white">
        {yp.questionerDelegationName}
      </div>
      <div class="mt-2 text-3xl font-light tracking-[0.06em] text-white/30">
        正在提问
      </div>
      <div class="mt-6 text-xl tracking-wider text-white/20">
        {yp.originalDelegationName} 将使用剩余 {formatTime(Math.round(yp.remainingSec))} 回答
      </div>
    </div>
  </div>

{:else if isYieldDelegate}
  <!-- 让渡给代表：等待主席选择 -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <ArrowRight size={20} class="text-[#C9A84C]" />
      <span class="text-lg tracking-[0.08em] uppercase">让渡时间</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <div class="text-center">
      <div class="text-5xl font-light tracking-wide text-white/70">
        {yp.originalDelegationName} 将剩余 {formatTime(Math.round(yp.remainingSec))} 让渡给另一位代表
      </div>
      <div class="mt-4 text-2xl tracking-wider text-white/20">
        等待主席指定目标代表团
      </div>
    </div>
  </div>

{:else if data.currentSpeaker}
  <!-- 正在发言 -->
  <div class="flex flex-col items-center gap-10">
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
      {#if data.currentSpeaker.shortName}
        <div class="mt-1 text-4xl font-light tracking-[0.06em] text-white/30">
          {data.currentSpeaker.shortName}
        </div>
      {/if}
    </div>

    <!-- 倒计时 -->
    <div
      class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {data
        .currentSpeaker.status === 'paused'
        ? 'text-[#C9A84C]'
        : 'text-[#5B92E5]'}"
    >
      {formatTime(Math.max(0, data.currentSpeaker.remainingSec ?? 0))}
    </div>
  </div>
{:else if data.readySpeaker}
  <!-- 预发言（即将发言） -->
  <div class="flex flex-col items-center gap-10">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <Mic size={20} class="text-[#C9A84C]" />
      <span class="text-lg tracking-[0.08em] uppercase">即将发言</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <div class="text-center">
      <div class="text-9xl font-semibold tracking-wide text-white">
        {data.readySpeaker.delegationName}
      </div>
    </div>

    <div class="text-lg tracking-wider text-white/15">等待主席开始计时</div>
  </div>
{:else}
  <!-- 主发言名单（无当前发言人，无 ready） -->
  {@const waiting = data.speakersList.filter((s: { status: string }) => s.status === 'waiting')}
  {@const nextSpeaker = waiting[0]}
  {@const restQueue = waiting.slice(1)}

  <div class="flex w-full flex-col items-center gap-8">
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <Mic size={20} class="text-[#5B92E5]" />
      <span class="text-lg tracking-[0.08em] uppercase">主发言名单</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    {#if nextSpeaker}
      <!-- 下一个发言 -->
      <div class="w-full px-8 py-6 text-center">
        <div class="text-lg font-medium tracking-[0.12em] text-white/30 uppercase">下一个发言</div>
        <div class="mt-3 text-9xl font-semibold tracking-wide text-white">
          {nextSpeaker.delegationName}
        </div>
        {#if nextSpeaker.shortName}
          <div class="mt-1 text-xl font-light tracking-[0.06em] text-white/20">
            {nextSpeaker.shortName}
          </div>
        {/if}
      </div>
    {/if}

    {#if restQueue.length > 0}
      <!-- 后续队列 -->
      <div class="w-full space-y-px">
        {#each restQueue as speaker, i (i)}
          <div class="flex items-center justify-center gap-4 px-6 py-2.5">
            <span class="text-sm tabular-nums text-white/25">
              {i + 2}
            </span>
            <span class="text-xl font-medium text-white/50">
              {speaker.delegationName}
            </span>
            {#if speaker.shortName}
              <span class="text-sm tracking-wider text-white/25">{speaker.shortName}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if waiting.length === 0}
      <div class="text-lg tracking-wider text-white/10">等待主席添加发言人</div>
    {/if}
  </div>
{/if}
