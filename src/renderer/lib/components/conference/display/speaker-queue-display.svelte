<script lang="ts">
  /**
   * speaker-queue-display.svelte
   * ─────────────────────────────
   * 可复用的 Display 发言名单组件。展示下一个发言代表 + 后续队列，支持限制显示数量。
   */
  import { Mic } from '@lucide/svelte'
  import type { Delegation } from '$lib/types-conference'
  import DisplaySectionHeader from './display-section-header.svelte'
  import DelegationNameDisplay from './delegation-name-display.svelte'

  interface Speaker {
    delegation: Delegation
  }

  let {
    speakers,
    max = Infinity,
    emptyText = '等待主席添加发言人',
    title = '主发言名单',
    subtitle = '',
    onlyList = false
  }: {
    speakers: Speaker[]
    max?: number
    emptyText?: string
    title?: string
    /** 显示在下一个发言名称下方的状态文字，如"等待主席开始计时" */
    subtitle?: string
    /**
     * 仅显示发言名单（无标题栏、无"下一个发言"高亮大字体）。
     * 此时 title / subtitle / emptyText 不需要填写。
     */
    onlyList?: boolean
  } = $props()

  const nextSpeaker = $derived(onlyList ? null : (speakers[0] ?? null))
  const visibleQueue = $derived(onlyList ? speakers.slice(0, max) : speakers.slice(1, max))
  const hasMore = $derived(speakers.length > (onlyList ? max : max + 1))
  const remaining = $derived(speakers.length - (onlyList ? max : max + 1))
</script>

<div class="flex w-full flex-col items-center gap-5">
  {#if !onlyList}
    <DisplaySectionHeader Icon={Mic} label={title} colorClass="text-[#5B92E5]" />
  {/if}

  {#if nextSpeaker}
    <!-- 下一个发言 -->
    <div class="w-full px-8 py-6 text-center">
      <DelegationNameDisplay
        name={nextSpeaker.delegation.name}
        shortName={nextSpeaker.delegation.shortName}
      />
      {#if subtitle}
        <div class="mt-4 text-lg tracking-wider text-white/15">{subtitle}</div>
      {/if}
    </div>
  {/if}

  {#if visibleQueue.length > 0}
    <!-- 后续队列 -->
    <div class="w-full space-y-px">
      {#each visibleQueue as speaker, i (speaker.delegation.name)}
        <div class="flex items-center justify-center gap-4 px-6 py-2.5">
          <span class="text-sm tabular-nums text-white/25">
            {onlyList ? i + 1 : i + 2}
          </span>
          <span class="text-xl font-medium text-white/50">
            {speaker.delegation.name}
          </span>
          {#if speaker.delegation.shortName}
            <span class="text-sm tracking-wider text-white/25">{speaker.delegation.shortName}</span>
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
