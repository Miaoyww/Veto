<script lang="ts">
  /**
   * conference-header.svelte
   * ─────────────────────────
   * Display 顶部横幅 —— 会场信息 + 阶段指示器。可复用于所有 Display 窗口。
   */
  import { PHASE_LABELS } from '$lib/engine/conference-engine'

  let {
    venue,
    name,
    phase,
    caucusTopic,
    simpleMajority,
    twoThirds
  }: {
    venue: string
    name: string
    phase: string | null
    caucusTopic?: string
    simpleMajority?: number
    twoThirds?: number
  } = $props()
</script>

<div class="relative flex items-center gap-8 border-b border-white/10 px-16 py-7">
  <div class="flex items-center gap-5">
    <div>
      <h1 class="text-[28px] font-semibold tracking-[0.04em] text-white">{venue}</h1>
      <p class="mt-0.5 text-sm tracking-wider text-white/30 uppercase">{name}</p>
    </div>
  </div>

  {#if caucusTopic}
    <div class="absolute left-1/2 -translate-x-1/2 text-6xl font-medium tracking-wide">
      {caucusTopic}
    </div>
  {/if}

  <div class="ml-auto flex items-center gap-6">
    <div class="flex items-center gap-3">
      <div class="rounded-md px-5 py-1.5 text-center">
        <div class="text-base tracking-wider text-white/25">简单多数</div>
        <div class="text-4xl font-semibold tabular-nums text-white/70">{simpleMajority}</div>
      </div>
      <div class="rounded-md px-5 py-1.5 text-center">
        <div class="text-base tracking-wider text-white/25">2/3 多数</div>
        <div class="text-4xl font-semibold tabular-nums text-white/70">{twoThirds}</div>
      </div>
    </div>
    <div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5">
      <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
      <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
        {PHASE_LABELS[phase ?? ''] ?? phase}
      </span>
    </div>
  </div>
</div>
