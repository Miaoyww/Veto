<script lang="ts">
  /**
   * attendance-change.svelte
   * ──────────────────────────
   * Display 端出席状态变更 —— 全屏展示。
   */
  let { delegationName, shortName, status }: {
    delegationName: string
    shortName?: string
    status: 'present' | 'absent'
  } = $props()
</script>

<div class="flex h-full w-full items-center justify-center bg-[#0a0e14]">
  <div class="flex flex-col items-center gap-12">
    <!-- 代表团名 -->
    <div class="flex flex-col items-center gap-2">
      <h1 class="text-7xl font-semibold tracking-[0.04em] text-white">
        {delegationName}
      </h1>
      {#if shortName}
        <p class="text-3xl tracking-[0.08em] text-white/25">
          {shortName}
        </p>
      {/if}
    </div>

    <!-- 分隔线 -->
    <div class="flex items-center gap-6">
      <div class="h-px w-24 {status === 'present' ? 'bg-[#5B92E5]/30' : 'bg-white/10'}"></div>
      <div
        class="h-2 w-2 rotate-45 {status === 'present' ? 'bg-[#5B92E5]' : 'bg-white/20'}"
      ></div>
      <div class="h-px w-24 {status === 'present' ? 'bg-[#5B92E5]/30' : 'bg-white/10'}"></div>
    </div>

    <!-- 状态 -->
    <div class="flex flex-col items-center gap-4">
      <span
        class="text-6xl font-bold tracking-[0.12em] uppercase {status === 'present'
          ? 'text-[#5B92E5]'
          : 'text-white/20'}"
      >
        {status === 'present' ? '出席' : '缺席'}
      </span>
      <span class="text-2xl tracking-[0.16em] text-white/15 uppercase">
        {status === 'present' ? 'PRESENT' : 'ABSENT'}
      </span>
    </div>
  </div>
</div>
