<script lang="ts">
  /**
   * speaker-queue-display.svelte
   * ─────────────────────────────
   * 可复用的 Display 发言名单组件。展示下一个发言代表 + 后续队列，支持限制显示数量。
   */
  import { Mic } from '@lucide/svelte'

  interface Speaker {
    delegationName: string
    shortName?: string
  }

  let {
    speakers,
    max = Infinity,
    emptyText = '等待主席添加发言人',
    title = '主发言名单'
  }: {
    speakers: Speaker[]
    max?: number
    emptyText?: string
    title?: string
  } = $props()

  const nextSpeaker = $derived(speakers[0] ?? null)
  const visibleQueue = $derived(speakers.slice(1, max))
  const hasMore = $derived(speakers.length > max)
  const remaining = $derived(speakers.length - max)
</script>

<div class="flex w-full flex-col items-center gap-8">
  <div class="flex items-center gap-3 text-white/40">
    <div class="h-px w-12 bg-white/10"></div>
    <Mic size={20} class="text-[#5B92E5]" />
    <span class="text-lg tracking-[0.08em] uppercase">{title}</span>
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

  {#if visibleQueue.length > 0}
    <!-- 后续队列 -->
    <div class="w-full space-y-px">
      {#each visibleQueue as speaker, i (speaker.delegationName)}
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

      {#if hasMore}
        <div class="flex items-center justify-center gap-4 px-6 py-2.5">
          <span class="text-sm text-white/15">...</span>
          <span class="text-lg text-white/20">还有 {remaining} 位代表</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if speakers.length === 0}
    <div class="text-lg tracking-wider text-white/10">{emptyText}</div>
  {/if}
</div>
