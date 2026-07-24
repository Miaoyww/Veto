<script lang="ts">
  /**
   * roll-call/index.svelte
   * ──────────────────────
   * 点名阶段内容组件 —— 通过 $props 接收 Shell 传入的数据。
   *
   * 视图逻辑：
   * - isComplete          → 仅显示汇总（出席/简单多数/2/3多数）
   * - 进行中 + lastMarked → 显示代表团名/进度条/统计，叠加 PRESENT/ABSENT badge
   * - 进行中（无标记）     → 仅显示代表团名/进度条/统计
   */
  import type { ConferenceDisplayData } from '$lib/types-conference'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

{#if data.rollCall}
  {@const rc = data.rollCall}
  {@const isComplete = rc.currentIndex >= rc.totalCount}

  <div class="flex w-full max-w-5xl flex-col items-center gap-10">
    {#if isComplete}
      <!-- ===== 点名完成汇总（独占视图，不混入进行中元素） ===== -->
      <div class="flex flex-col items-center gap-10">
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

    {:else}
      <!-- ===== 进行中（lastMarked 过渡 / 正常进行 共用此区域） ===== -->
      <div class="flex flex-col items-center gap-6">
        <div class="text-center">
          <div class="text-9xl font-semibold text-white">
            {rc.currentDelegationName}
          </div>
        </div>
      </div>

      {#if rc.lastMarked}
        <!-- 过渡 badge：叠加在代表团名和进度条之间 -->
        <div
          class="mt-2 flex items-center gap-3 rounded-sm px-8 py-2.5 {rc.lastMarked.status ===
          'present'
            ? 'border border-[#5B92E5]/30 bg-[#5B92E5]/10'
            : 'border border-white/10 bg-white/[0.02]'}"
        >
          <span
            class="text-2xl font-semibold tracking-[0.08em] {rc.lastMarked.status === 'present'
              ? 'text-[#5B92E5]'
              : 'text-white/30'}"
          >
            {rc.lastMarked.status === 'present' ? '出席 PRESENT' : '缺席 ABSENT'}
          </span>
        </div>
      {/if}

      <div class="flex items-center gap-3 text-white/40">
        <div class="h-px w-12 bg-white/10"></div>
        <span class="text-lg tracking-[0.08em] uppercase">点名</span>
        <span class="text-base text-white/20 tabular-nums">
          {rc.currentIndex + 1} / {rc.totalCount}
        </span>
        <div class="h-px w-12 bg-white/10"></div>
      </div>

      <!-- 进度条 -->
      <div class="h-[2px] w-[480px] overflow-hidden bg-white/5">
        <div
          class="h-full bg-[#5B92E5] transition-all duration-700"
          style="width: {Math.round((rc.currentIndex / rc.totalCount) * 100)}%"
        ></div>
      </div>

      <!-- 统计 -->
      <div class="flex gap-16 text-base tracking-wider text-white/25">
        <span
          >已出席 <span class="font-semibold text-[#5B92E5]">{rc.presentCount}</span></span
        >
        <span
          >简单多数 <span class="font-semibold text-white/40"
            >{rc.simpleMajorityThreshold}</span
          ></span
        >
        <span
          >2/3多数 <span class="font-semibold text-white/40">{rc.twoThirdsThreshold}</span
          ></span
        >
      </div>
    {/if}
  </div>
{/if}
