<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { ArrowLeft, Check, X, Users, Monitor } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
    import {
    currentConference,
    currentConferenceId,
    loadConference,
    changeDelegationAttendance,
    completeRollCall
  } from '$lib/classes/stores/conference/conference-store'
  import { calculateMajorityThresholds } from '$lib/classes/services/engine/conference-engine'
  import { getDisplayBridge, buildDisplayData, initWsPort } from '$lib/classes/clients/conference-display-client'
  import { VETO_NAME, ROLL_CALL_MARK_DELAY } from '$lib/classes/const'
  import type { Delegation, Attendance } from '$lib/classes/types/conference'

  const conferenceId = $derived($page.params.conference_id ?? null)

  let wsPort = $state<number | null>(null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded = $currentConferenceId === conferenceId
      if (!alreadyLoaded) {
        loadConference(conferenceId)
      }
    }
    initWsPort().then((p) => (wsPort = p))
  })

  onDestroy(() => {
    if (transitionTimeout) clearTimeout(transitionTimeout)
  })

  // 刚标记的代表团（传给 Display 端展示确认动画，发送后即清除）
  let lastRollCallMarked = $state<{
    delegation: Delegation
    status: Attendance
    index: number
  } | null>(null)

  // 自动同步当前状态到 Display 窗口（含点名进度）
  // 用 rAF 合并同一帧内的多次更新，避免重复构建/发送
  let _sendRaf = 0
  $effect(() => {
    const c = $currentConference
    if (!c) return

    // 在此处读取所有响应式值，确保 Svelte 正确追踪依赖
    const rollCallInfo = thresholds
      ? {
          currentIndex,
          totalCount,
          presentCount: thresholds.presentCount,
          simpleMajorityThreshold: thresholds.simpleMajorityThreshold,
          twoThirdsThreshold: thresholds.twoThirdsThreshold,
          ...(currentDelegation ? { currentDelegation } : {}),
          lastMarked: lastRollCallMarked ?? undefined,
        }
      : undefined

    cancelAnimationFrame(_sendRaf)
    _sendRaf = requestAnimationFrame(() => {
      getDisplayBridge().sendUpdate(buildDisplayData(c, { rollCall: rollCallInfo }))
    })
  })

  async function openDisplayWindow(): Promise<void> {
    if (!conf) return
    const bridge = getDisplayBridge()
    await bridge.openDisplay(conf.id)
    // 等待 Display 端 WebSocket 连接就绪
    await new Promise((r) => setTimeout(r, 500))
    bridge.sendUpdate(buildDisplayData(conf))
  }

  const conf = $derived($currentConference)

  const sortedDelegations = $derived(
    conf ? [...conf.delegations].sort((a, b) => a.sortOrder - b.sortOrder) : []
  )

  let currentIndex = $state(0)
  let isTransitioning = $state(false)
  let transitionTimeout: ReturnType<typeof setTimeout> | null = null

  const currentDelegation = $derived(sortedDelegations[currentIndex] ?? null)
  const isComplete = $derived(currentIndex >= sortedDelegations.length)

  const thresholds = $derived(
    conf ? calculateMajorityThresholds(conf.delegations) : null
  )
  const presentCount = $derived(thresholds?.presentCount ?? 0)
  const totalCount = $derived(thresholds?.totalCount ?? 0)
  const progress = $derived(totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0)

  const showConfirmOverlay = $derived(isTransitioning && lastRollCallMarked !== null)
  const absentDelegations = $derived(
    sortedDelegations.filter((d) => d.attendance !== 'present')
  )

  function markPresent(): void {
    if (!currentDelegation || isTransitioning) return
    changeDelegationAttendance(currentDelegation.id, 'present', { silent: true })
    lastRollCallMarked = {
      delegation: currentDelegation,
      status: 'present',
      index: currentIndex,
    }
    isTransitioning = true
    transitionTimeout = setTimeout(() => {
      isTransitioning = false
      lastRollCallMarked = null
      currentIndex++
    }, ROLL_CALL_MARK_DELAY)
  }

  function markAbsent(): void {
    if (!currentDelegation || isTransitioning) return
    changeDelegationAttendance(currentDelegation.id, 'absent', { silent: true })
    lastRollCallMarked = {
      delegation: currentDelegation,
      status: 'absent',
      index: currentIndex,
    }
    isTransitioning = true
    transitionTimeout = setTimeout(() => {
      isTransitioning = false
      lastRollCallMarked = null
      currentIndex++
    }, ROLL_CALL_MARK_DELAY)
  }

  function markAllPresent(): void {
    if (!conf || isTransitioning) return
    const remaining = sortedDelegations.slice(currentIndex)
    for (const d of remaining) {
      changeDelegationAttendance(d.id, 'present', { silent: true })
    }
    currentIndex = sortedDelegations.length
  }

  function markAllAbsent(): void {
    if (!conf || isTransitioning) return
    const remaining = sortedDelegations.slice(currentIndex)
    for (const d of remaining) {
      changeDelegationAttendance(d.id, 'absent', { silent: true })
    }
    currentIndex = sortedDelegations.length
  }

  function goBack(): void {
    if (currentIndex <= 0 || isTransitioning) return
    if (transitionTimeout) clearTimeout(transitionTimeout)
    isTransitioning = false
    lastRollCallMarked = null
    currentIndex--
  }

  function handleComplete(): void {
    completeRollCall()
    goto(`/conference/${conferenceId}`)
  }

  function handleBackToConference(): void {
    goto(`/conference/${conferenceId}`)
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (isComplete || isTransitioning) return
    if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
      markPresent()
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowRight') {
      markAbsent()
    } else if (e.key === 'Backspace') {
      goBack()
    }
  }
</script>

<svelte:head>
  <title>{VETO_NAME} - 点名</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full w-full flex-col bg-background">
  <!-- 顶部栏 -->
  <div class="flex items-center gap-4 border-b px-6 py-3">
    <Button variant="ghost" size="sm" class="gap-1.5 text-xs" onclick={handleBackToConference}>
      <ArrowLeft size={14} />
      返回大会
    </Button>
    <div class="h-4 w-px bg-border"></div>
    <span class="text-sm font-semibold text-foreground">点名</span>
    <span class="text-xs text-muted-foreground">{conf?.name}</span>

    <div class="ml-auto flex items-center gap-2">
      {#if wsPort !== null}
        <span
          class="select-none text-[11px] text-muted-foreground/70"
          title="WebSocket 端口：{wsPort}"
        >
          WS :{wsPort}
        </span>
      {/if}

      <Button size="sm" variant="outline" class="h-8 gap-1.5 text-xs" onclick={openDisplayWindow}>
        <Monitor size={12} />
        显示窗口
      </Button>
    </div>
  </div>

  <!-- 内容 -->
  <div class="flex flex-1 items-center justify-center overflow-hidden p-6">
    {#if conf && thresholds}
      {#if !isComplete}
        <!-- ===== 逐个点名 ===== -->
        <div class="flex w-full max-w-lg flex-col items-center gap-10">
          <!-- 进度 -->
          <div class="flex w-full flex-col items-center gap-2">
            <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <Users size={14} />
              <span>第 {currentIndex + 1} / {totalCount} 位</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-foreground/25 transition-all duration-300"
                style="width: {progress}%"
              ></div>
            </div>
            <div class="flex gap-4 text-xs text-muted-foreground">
              <span>已出席 <span class="font-semibold text-foreground">{presentCount}</span></span>
              <span>简单多数 <span class="font-semibold text-foreground">{thresholds.simpleMajorityThreshold}</span></span>
              <span>2/3多数 <span class="font-semibold text-foreground">{thresholds.twoThirdsThreshold}</span></span>
            </div>
          </div>

          <!-- 当前代表团 -->
          {#if currentDelegation}
            <div
              class="relative flex w-full flex-col items-center gap-6 rounded-lg border bg-card p-14 transition-all duration-500 {isTransitioning ? 'opacity-70' : ''}"
            >
              <!-- 代表团信息 -->

              <div class="text-center transition-opacity duration-300" class:opacity-30={isTransitioning}>
                <div class="text-3xl font-bold text-foreground">{currentDelegation.name}</div>
                {#if currentDelegation.shortName}
                  <div class="mt-1 text-lg text-muted-foreground">{currentDelegation.shortName}</div>
                {/if}
              </div>

              {#if !isTransitioning}
                <div class="mt-2 flex gap-4">
                  <Button
                    size="lg"
                    class="min-w-[160px] gap-2 text-base"
                    onclick={markPresent}
                    disabled={isTransitioning}
                  >
                    <Check size={20} />
                    出席
                    <span class="text-xs opacity-60">P</span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    class="min-w-[160px] gap-2 text-base"
                    onclick={markAbsent}
                    disabled={isTransitioning}
                  >
                    <X size={20} />
                    缺席
                    <span class="text-xs opacity-40">A</span>
                  </Button>
                </div>
              {:else if showConfirmOverlay && lastRollCallMarked}
                <!-- 点名结果 -->
                <div class="mt-2 flex flex-col items-center gap-2">
                  <span class="text-lg font-bold text-foreground">
                    {lastRollCallMarked.status === 'present' ? '出席' : '缺席'}
                  </span>
                </div>
              {/if}

              {#if currentIndex > 0}
                <button class="text-xs text-muted-foreground hover:text-foreground" onclick={goBack} disabled={isTransitioning}>
                  ← Backspace 返回上一位
                </button>
              {/if}
            </div>
          {/if}

          <!-- 快捷操作 -->
          <div class="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              class="gap-1.5 text-xs"
              onclick={markAllPresent}
              disabled={isTransitioning || currentIndex >= sortedDelegations.length}
            >
              <Check size={12} />
              全部出席
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="gap-1.5 text-xs"
              onclick={markAllAbsent}
              disabled={isTransitioning || currentIndex >= sortedDelegations.length}
            >
              <X size={12} />
              全部缺席
            </Button>
          </div>
        </div>

      {:else}
        <!-- ===== 点名完成 ===== -->
        <div class="flex w-full max-w-lg flex-col items-center gap-8">
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-foreground">点名完成</h2>
          </div>

          <div class="grid w-full grid-cols-3 gap-4">
            <div class="rounded-lg border bg-card p-6 text-center">
              <div class="text-3xl font-bold text-foreground">{presentCount}</div>
              <div class="mt-1 text-sm text-muted-foreground">出席 / {totalCount}</div>
            </div>
            <div class="rounded-lg border bg-card p-6 text-center">
              <div class="text-3xl font-bold text-foreground">{thresholds.simpleMajorityThreshold}</div>
              <div class="mt-1 text-sm text-muted-foreground">简单多数</div>
            </div>
            <div class="rounded-lg border bg-card p-6 text-center">
              <div class="text-3xl font-bold text-foreground">{thresholds.twoThirdsThreshold}</div>
              <div class="mt-1 text-sm text-muted-foreground">2/3 多数</div>
            </div>
          </div>

          <!-- 未出席列表 -->
          {#if absentDelegations.length > 0}
            <div class="w-full rounded-xl border bg-card">
              <div class="px-6 py-3 text-xs font-medium text-muted-foreground">
                未出席 ({absentDelegations.length})
              </div>
              <div class="divide-y px-6">
                {#each absentDelegations as delegation (delegation.id)}
                  <div class="flex items-center gap-3 py-2.5">
                    <span class="flex-1 text-sm text-muted-foreground/70">
                      {delegation.shortName ?? delegation.name}
                    </span>
                    <span class="text-xs text-muted-foreground">缺席</span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="text-sm font-medium">全部出席</p>
          {/if}

          <div class="flex gap-4">
            <Button variant="outline" size="lg" onclick={goBack}>
              ← 返回修改
            </Button>
            <Button size="lg" class="min-w-[160px] gap-2 text-base" onclick={handleComplete}>
              完成点名
            </Button>
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Users size={40} class="opacity-30" />
        <p class="text-lg font-medium">未找到代表团</p>
        <p class="text-sm opacity-70">请先创建大会并添加代表团</p>
      </div>
    {/if}
  </div>
</div>
