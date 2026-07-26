<script lang="ts">
  /**
   * caucus-setup/index.svelte
   * ─────────────────────────
   * 磋商发言名单设置阶段 —— Display 组件。
   */
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import SpeakerQueueDisplay from '$lib/components/conference/display/speaker-queue-display.svelte'
  import { DISPLAY_MAX_SPEAKERS } from '$lib/const'

  let { data }: { data: ConferenceDisplayData } = $props()

  const setup = $derived(data.caucusSetup ?? null)

  $effect(() => {
    console.log(data)
  })
</script>

{#if setup}
  <div class="flex w-full max-w-5xl flex-col items-center gap-10">
    <!-- Topic 大字 -->
    {#if setup.topic}
      <div class="text-9xl font-semibold tracking-wide">
        {setup.topic}
      </div>
    {/if}

    <!-- 磋商准备 标题 -->
    <div class="flex items-center gap-3 text-white/40">
      <div class="h-px w-12 bg-white/10"></div>
      <span class="text-lg tracking-[0.08em] uppercase">磋商准备</span>
      <div class="h-px w-12 bg-white/10"></div>
    </div>

    <!-- 动议国 -->
    <div class="text-2xl tracking-wider text-white/25">
      动议国：
      <span class="text-white/50">{setup.proposerName}</span>
      <span class="mx-2 text-white/10">|</span>
      <span class="text-white/30">
        {setup.proposerPosition === 'first' ? '标首（第一个发言）' : '标尾（最后一个发言）'}
      </span>
    </div>

    <!-- 发言名单 -->
    <SpeakerQueueDisplay
      speakers={setup.speakerNames.map((d) => ({ delegation: d }))}
      max={DISPLAY_MAX_SPEAKERS}
      onlyList={true}
      emptyText="等待主席团添加发言代表团"
    />
  </div>
{/if}
