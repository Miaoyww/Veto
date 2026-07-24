<script lang="ts">
  /**
   * conference-display/[conference_id]/roll-call/done/index.svelte
   * ──────────────────────────────────────────────────────────────
   * Display 窗口 —— 点名完成汇总。
   *
   * 显示：出席人数、简单多数阈值、2/3多数阈值，等待主席下一步操作。
   */
  import { onMount } from 'svelte'
  import { displayData } from '$lib/stores/conference/display-data-store.svelte'
  import { getDisplayBridge } from '$lib/services/conference-display-bridge'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import { VETO_NAME } from '$lib/const'

  let data = $state<ConferenceDisplayData | null>(displayData.current)

  onMount(() => {
    data = displayData.current
    const bridge = getDisplayBridge()
    const unsub = bridge.onHostCommand((d: ConferenceDisplayData) => {
      data = d
    })
    return unsub
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 点名完成 · 显示</title>
</svelte:head>

<div class="flex h-screen w-screen flex-col bg-[#0a0e14] text-[#c8ccd4]">
  {#if data?.rollCall}
    {@const rc = data.rollCall}

    <!-- 顶部横幅 -->
    <div class="flex items-center gap-8 border-b border-white/10 px-16 py-7">
      <div class="flex items-center gap-5">
        <div>
          <h1 class="text-[28px] font-semibold tracking-[0.04em] text-white">
            {data.name}
          </h1>
          <p class="mt-0.5 text-sm tracking-wider text-white/30 uppercase">
            {data.venue}
          </p>
        </div>
      </div>

      <div class="ml-auto">
        <div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5">
          <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
          <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
            点名完成
          </span>
        </div>
      </div>
    </div>

    <!-- 中部：汇总 -->
    <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
      <div class="flex w-full max-w-5xl flex-col items-center gap-10">
        <div class="flex items-center gap-3 text-white/40">
          <div class="h-px w-12 bg-white/10"></div>
          <span class="text-lg tracking-[0.08em] uppercase">点名完成</span>
          <div class="h-px w-12 bg-white/10"></div>
        </div>

        <div class="grid grid-cols-3 gap-12">
          <div class="flex flex-col items-center gap-3">
            <div class="text-9xl font-light tabular-nums leading-none text-[#5B92E5]">
              {rc.presentCount}
            </div>
            <div class="text-sm tracking-[0.12em] text-white/30 uppercase">
              出席 / {rc.totalCount}
            </div>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="text-9xl font-light tabular-nums leading-none text-white/40">
              {rc.simpleMajorityThreshold}
            </div>
            <div class="text-sm tracking-[0.12em] text-white/30 uppercase">简单多数</div>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="text-9xl font-light tabular-nums leading-none text-white/40">
              {rc.twoThirdsThreshold}
            </div>
            <div class="text-sm tracking-[0.12em] text-white/30 uppercase">2/3 多数</div>
          </div>
        </div>

        <div class="text-lg tracking-wider text-white/15">等待主席下一步操作</div>
      </div>
    </div>
  {:else}
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-6 text-white/10">
        <div class="text-9xl font-light tracking-[0.06em]">等待点名数据</div>
      </div>
    </div>
  {/if}
</div>
