<script lang="ts">
  /**
   * conference-display/[conference_id]/index.svelte
   * ──────────────────────────────────────────────
   * Display 窗口入口 —— 轻量 shell。
   *
   * 职责：
   * 1. 通过 WebSocket 接收主机推送的 ConferenceDisplayData
   * 2. 写入共享 store 供子路由页面读取
   * 3. 根据 phase 自动导航到对应子路由
   *
   * 子路由各自负责对应阶段的 UI 渲染。
   */
  import { onMount } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
  import { Gavel } from '@lucide/svelte'
  import { getDisplayBridge } from '$lib/services/conference-display-bridge'
  import { displayData } from '$lib/stores/conference/display-data-store.svelte'
  import { VETO_NAME } from '$lib/const'

  // ---- phase → sub-route 映射 ----

  const PHASE_TO_SUBPAGE: Record<string, string> = {
    roll_call: 'roll-call',
    general_debate: 'general-debate',
    caucus: 'caucus',
    voting: 'voting',
    suspended: 'suspended',
    closed: 'closed'
  }

  // ---- WebSocket 连接 ----

  onMount(() => {
    const bridge = getDisplayBridge()
    bridge.onHostCommand((data) => {
      displayData.current = data
    })
  })

  // ---- 根据 phase 自动导航 ----

  let lastNavigatedPhase = $state<string | null>(null)

  $effect(() => {
    const data = displayData.current
    const phase = data?.phase
    const subpage = phase ? PHASE_TO_SUBPAGE[phase] : undefined
    const conferenceId = currentRoute?.params?.conference_id

    // 只在 phase 真正变化时才导航（避免循环）
    if (phase && phase !== lastNavigatedPhase && conferenceId) {
      lastNavigatedPhase = phase

      if (subpage) {
        const targetHash = `#/conference-display/${conferenceId}/${subpage}`
        const currentHash = `#${window.location.hash}`
        if (currentHash !== targetHash) {
          navigate(targetHash)
        }
      } else {
        // 没有对应子路由的 phase（如 preamble），回到基础路由
        const targetHash = `#/conference-display/${conferenceId}`
        const currentHash = `#${window.location.hash}`
        if (currentHash !== targetHash) {
          navigate(targetHash)
        }
      }
    }
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 模拟大会 · 显示</title>
  <style>
    :global(body) {
      background: #0a0e14;
      color: #c8ccd4;
      overflow: hidden;
    }
  </style>
</svelte:head>

<div class="flex h-screen w-screen flex-col bg-[#0a0e14] text-[#c8ccd4]">
  {#if displayData.current}
    {@const data = displayData.current}
    {@const subpage = data.phase ? PHASE_TO_SUBPAGE[data.phase] : undefined}

    {#if subpage}
      <!-- 已导航到子路由时，显示简洁的阶段指示器 + 提示重定向 -->
      <div class="flex h-full w-full items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-white/20">
          <Gavel size={40} />
          <div class="text-lg tracking-wider">正在加载 {data.phase} ...</div>
        </div>
      </div>
    {:else}
      <!-- 无子路由的 phase（preamble / 等待）—— 直接在这里渲染 -->
      <div class="flex h-full w-full items-center justify-center">
        <div class="flex flex-col items-center gap-6">
          <div class="text-9xl font-light tracking-[0.06em] text-white/20">准备就绪</div>
          {#if data.speakersList.length > 0}
            <div class="text-base tracking-wider text-white/10">
              发言名单 · {data.speakersList.length} 位代表
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {:else}
    <!-- 等待 WebSocket 连接 -->
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-6 text-white/10">
        <div class="text-9xl font-light tracking-[0.06em]">等待主机连接</div>
      </div>
    </div>
  {/if}
</div>
