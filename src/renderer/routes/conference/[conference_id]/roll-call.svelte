<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
  import { ArrowLeft, Check, X, Users, Flag, Monitor } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { cn } from '$lib/utils.js'
  import {
    currentConference,
    currentConferenceId,
    loadConference,
    setAttendance,
    completeRollCall,
    setPhase
  } from '$lib/stores/conference/conference-store'
  import { calculateMajorityThresholds } from '$lib/engine/conference-engine'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import { VETO_NAME } from '$lib/const'

  const conferenceId = $derived(currentRoute?.params?.conference_id ?? null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded = $currentConferenceId === conferenceId
      if (!alreadyLoaded) {
        loadConference(conferenceId)
      }
    }
  })

  onDestroy(() => {
    if (transitionTimeout) clearTimeout(transitionTimeout)
  })

  // 刚标记的代表团（传给 Display 端展示确认动画，发送后即清除）
  let lastRollCallMarked = $state<{
    delegationName: string
    shortName?: string
    color: string
    status: 'present' | 'absent'
    index: number
  } | null>(null)

  // 自动同步当前状态到 Display 窗口（含点名进度）
  $effect(() => {
    const c = $currentConference
    if (c) {
      // 点名进行中发送完整数据，完成后发送汇总
      const rollCallInfo = thresholds
        ? {
            currentIndex,
            totalCount,
            presentCount: thresholds.presentCount,
            simpleMajorityThreshold: thresholds.simpleMajorityThreshold,
            twoThirdsThreshold: thresholds.twoThirdsThreshold,
            ...(currentDelegation
              ? {
                  currentDelegationName: currentDelegation.name,
                  currentDelegationShortName: currentDelegation.shortName,
                  currentDelegationColor: currentDelegation.color,
                }
              : {}),
            lastMarked: lastRollCallMarked ?? undefined,
          }
        : undefined

      getDisplayBridge().sendUpdate(buildDisplayData(c, { rollCall: rollCallInfo }))
    }
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

  function markPresent(): void {
    if (!currentDelegation || isTransitioning) return
    setAttendance(currentDelegation.id, 'present')
    lastRollCallMarked = {
      delegationName: currentDelegation.name,
      shortName: currentDelegation.shortName,
      color: currentDelegation.color,
      status: 'present',
      index: currentIndex,
    }
    isTransitioning = true
    transitionTimeout = setTimeout(() => {
      isTransitioning = false
      lastRollCallMarked = null
      currentIndex++
    }, 1800)
  }

  function markAbsent(): void {
    if (!currentDelegation || isTransitioning) return
    setAttendance(currentDelegation.id, 'absent')
    lastRollCallMarked = {
      delegationName: currentDelegation.name,
      shortName: currentDelegation.shortName,
      color: currentDelegation.color,
      status: 'absent',
      index: currentIndex,
    }
    isTransitioning = true
    transitionTimeout = setTimeout(() => {
      isTransitioning = false
      lastRollCallMarked = null
      currentIndex++
    }, 1800)
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
    navigate(`/conference/${conferenceId}`)
  }

  function handleBackToConference(): void {
    navigate(`/conference/${conferenceId}`)
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

<div class="flex h-[calc(100vh-2.25rem)] w-screen flex-col bg-background">
  <!-- 顶部栏 -->
  <div class="flex items-center gap-4 border-b px-6 py-3">
    <Button variant="ghost" size="sm" class="gap-1.5 text-xs" onclick={handleBackToConference}>
      <ArrowLeft size={14} />
      返回大会
    </Button>
    <div class="h-4 w-px bg-border"></div>
    <span class="text-sm font-semibold text-foreground">点名</span>
    <span class="text-xs text-muted-foreground">{conf?.name}</span>

    <div class="ml-auto">
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
                class="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style="width: {progress}%"
              ></div>
            </div>
            <div class="flex gap-4 text-xs text-muted-foreground">
              <span>已出席 <span class="font-semibold text-emerald-600">{presentCount}</span></span>
              <span>简单多数 <span class="font-semibold text-amber-600">{thresholds.simpleMajorityThreshold}</span></span>
              <span>2/3多数 <span class="font-semibold text-rose-600">{thresholds.twoThirdsThreshold}</span></span>
            </div>
          </div>

          <!-- 当前代表团 -->
          {#if currentDelegation}
            {@const statusClass = lastRollCallMarked?.status === 'present'
              ? 'border-emerald-400 bg-emerald-50/30 dark:border-emerald-600 dark:bg-emerald-950/20'
              : 'border-muted-foreground/30 bg-muted/10 dark:border-muted-foreground/20'}
            <div
              class="relative flex w-full flex-col items-center gap-6 rounded-2xl border-2 bg-card p-14 shadow-lg transition-all duration-500 {isTransitioning ? statusClass : 'border-indigo-200 dark:border-indigo-800'}"
            >
              <!-- 确认浮层 -->
              {#if showConfirmOverlay && lastRollCallMarked}
                <div class="absolute inset-0 flex items-center justify-center rounded-2xl {lastRollCallMarked.status === 'present' ? 'bg-emerald-500/8' : 'bg-muted-foreground/5'}">
                  <div class="flex flex-col items-center gap-3">
                    {#if lastRollCallMarked.status === 'present'}
                      <div class="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-200 dark:bg-emerald-900/40 dark:ring-emerald-700/50">
                        <Check size={40} class="text-emerald-600 dark:text-emerald-400" stroke-width={3} />
                      </div>
                      <span class="text-xl font-bold text-emerald-700 dark:text-emerald-400">出席</span>
                    {:else}
                      <div class="flex h-20 w-20 items-center justify-center rounded-full bg-muted ring-4 ring-muted-foreground/20 dark:bg-muted/30 dark:ring-muted-foreground/30">
                        <X size={40} class="text-muted-foreground" stroke-width={3} />
                      </div>
                      <span class="text-xl font-bold text-muted-foreground">缺席</span>
                    {/if}
                  </div>
                </div>
              {/if}

              <div
                class="flex h-28 w-28 items-center justify-center rounded-full border-4 border-border text-4xl font-bold text-white shadow-inner transition-opacity duration-300"
                class:opacity-30={isTransitioning}
                style="background-color: {currentDelegation.color}"
              >
                {currentDelegation.shortName?.charAt(0) ?? currentDelegation.name.charAt(0)}
              </div>

              <div class="text-center transition-opacity duration-300" class:opacity-30={isTransitioning}>
                <div class="text-3xl font-bold text-foreground">{currentDelegation.name}</div>
                {#if currentDelegation.shortName}
                  <div class="mt-1 text-lg text-muted-foreground">{currentDelegation.shortName}</div>
                {/if}
              </div>

              {#if currentDelegation.vetoPower && !isTransitioning}
                <Badge variant="outline" class="border-red-300 bg-red-50 px-3 py-1 text-sm font-bold text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
                  否决权 VETO POWER
                </Badge>
              {/if}

              <div class="mt-2 flex gap-4">
                <Button
                  size="lg"
                  class="min-w-[160px] gap-2 bg-emerald-600 text-base hover:bg-emerald-700"
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

              {#if currentIndex > 0}
                <button class="text-xs text-muted-foreground hover:text-foreground" onclick={goBack} disabled={isTransitioning}>
                  ← Backspace 返回上一位
                </button>
              {/if}
            </div>
          {/if}
        </div>

      {:else}
        <!-- ===== 点名完成 ===== -->
        <div class="flex w-full max-w-lg flex-col items-center gap-8">
          <div class="flex items-center gap-2">
            <Flag size={24} class="text-indigo-500" />
            <h2 class="text-2xl font-bold text-foreground">点名完成</h2>
          </div>

          <div class="grid w-full grid-cols-3 gap-4">
            <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
              <div class="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</div>
              <div class="mt-1 text-sm text-muted-foreground">出席 / {totalCount}</div>
            </div>
            <div class="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
              <div class="text-3xl font-bold text-amber-700 dark:text-amber-400">{thresholds.simpleMajorityThreshold}</div>
              <div class="mt-1 text-sm text-muted-foreground">简单多数</div>
            </div>
            <div class="rounded-xl border-2 border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-950/30">
              <div class="text-3xl font-bold text-rose-700 dark:text-rose-400">{thresholds.twoThirdsThreshold}</div>
              <div class="mt-1 text-sm text-muted-foreground">2/3 多数</div>
            </div>
          </div>

          <!-- 结果列表 -->
          <div class="w-full rounded-xl border bg-card">
            <div class="divide-y px-6">
              {#each sortedDelegations as delegation (delegation.id)}
                {@const isPresent = delegation.attendance === 'present' || delegation.attendance === 'present_and_voting'}
                <div class="flex items-center gap-3 py-2.5">
                  <div class="h-3 w-3 shrink-0 rounded-full" style="background-color: {delegation.color}"></div>
                  <span class={cn('flex-1 text-sm', isPresent ? 'text-foreground' : 'text-muted-foreground/50 line-through')}>
                    {delegation.name}
                  </span>
                  <span class={cn('text-xs font-medium', isPresent ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {isPresent ? '出席' : '缺席'}
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <div class="flex gap-4">
            <Button variant="outline" size="lg" onclick={goBack}>
              ← 返回修改
            </Button>
            <Button size="lg" class="min-w-[160px] gap-2 bg-indigo-600 text-base hover:bg-indigo-700" onclick={handleComplete}>
              <Flag size={18} />
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
