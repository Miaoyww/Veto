<script lang="ts">
  /**
   * caucus-setup/index.svelte
   * ─────────────────────────
   * 磋商发言名单设置阶段 —— Display 组件。
   */
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import SpeakerQueueDisplay from '$lib/components/conference-display/speaker-queue-display.svelte'
  import AutoFitText from '$lib/components/conference-display/auto-fit-text.svelte'
  import DisplaySectionHeader from '$lib/components/conference-display/display-section-header.svelte'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'
  import { DISPLAY_MAX_SPEAKERS } from '$lib/classes/const'
  import { Users } from '@lucide/svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  const setup = $derived(data.caucusSetup ?? null)
</script>

<DisplayPage>
  {#if setup}
    <div class="flex flex-col items-center gap-10">
      <!-- Topic 大字 -->
      {#if setup.topic}
        <AutoFitText text={setup.topic} class="font-semibold tracking-wide text-white" />
      {/if}

      <DisplaySectionHeader Icon={Users} label="磋商准备" colorClass="text-[#5B92E5]" />

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
</DisplayPage>
