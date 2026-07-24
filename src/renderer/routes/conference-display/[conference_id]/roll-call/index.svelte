<script lang="ts">
  /**
   * conference-display/[conference_id]/roll-call/index.svelte
   * ──────────────────────────────────────────────────────────
   * Display 窗口 —— 点名阶段（进行中）。
   *
   * 两个状态：
   * - lastMarked：刚标记代表团的确认过渡动画
   * - 进行中：当前代表团 + 进度条 + 统计
   *
   * 全部标记完成后自动导航到 ./done。
   */
  import { onMount } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
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

  // ---- 全部标记完成 → 跳转 done ----

  $effect(() => {
    const rc = data?.rollCall
    if (rc && rc.currentIndex >= rc.totalCount && !rc.lastMarked) {
      const cid = currentRoute?.params?.conference_id
      if (cid) {
        navigate(`#/conference-display/${cid}/roll-call/done`)
      }
    }
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 点名 · 显示</title>
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
        <div
          class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-2.5"
        >
          <div class="h-2 w-2 rounded-full bg-[#5B92E5]"></div>
          <span class="text-base font-medium tracking-[0.05em] text-white/70 uppercase">
            点名 ROLL CALL
          </span>
        </div>
      </div>
    </div>

    <!-- 中部：点名主展示区 -->
    <div class="flex flex-1 items-center justify-center overflow-hidden px-16">
      <div class="flex w-full max-w-5xl flex-col items-center gap-10">
        <!-- ===== 进行中：当前代表团 + 进度条 ===== -->
        <div class="flex flex-col items-center gap-6">
          <div class="text-center">
            <div class="text-9xl font-semibold text-white">
              {rc.currentDelegationName}
            </div>
          </div>
        </div>
        {#if rc.lastMarked}
          <!-- ===== 过渡动画：确认刚刚标记的代表团 ===== -->
          <div class="flex flex-col items-center gap-6">
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
          <span>已出席 <span class="font-semibold text-[#5B92E5]">{rc.presentCount}</span></span>
          <span
            >简单多数 <span class="font-semibold text-white/40">{rc.simpleMajorityThreshold}</span
            ></span
          >
          <span
            >2/3多数 <span class="font-semibold text-white/40">{rc.twoThirdsThreshold}</span></span
          >
        </div>
      </div>
    </div>
  {:else}
    <!-- 无数据 -->
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-6 text-white/10">
        <div class="text-9xl font-light tracking-[0.06em]">等待点名数据</div>
      </div>
    </div>
  {/if}
</div>
