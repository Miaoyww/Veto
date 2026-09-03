<script lang="ts">
  import { Check, X, Users, Flag } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import {
    currentConference,
    changeDelegationAttendance,
    completeRollCall
  } from '$lib/classes/stores/conference/conference-store'
  import { calculateMajorityThresholds } from '$lib/classes/services/engine/conference-engine'
  import { cn } from '$lib/classes/utils.js'

  const conf = $derived($currentConference)

  // 按 sortOrder 排序的代表团列表
  const sortedDelegations = $derived(
    conf ? [...conf.delegations].sort((a, b) => a.sortOrder - b.sortOrder) : []
  )

  // 当前正在点名的代表团的索引（0-based）
  let currentIndex = $state(0)

  const currentDelegation = $derived(sortedDelegations[currentIndex] ?? null)
  const isComplete = $derived(currentIndex >= sortedDelegations.length)

  // 实时统计
  const thresholds = $derived(
    conf ? calculateMajorityThresholds(conf.delegations) : null
  )
  const presentCount = $derived(thresholds?.presentCount ?? 0)
  const totalCount = $derived(thresholds?.totalCount ?? 0)
  const progress = $derived(totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0)

  function markPresent(): void {
    if (!currentDelegation) return
    changeDelegationAttendance(currentDelegation.id, 'present', { silent: true })
    currentIndex++
  }

  function markAbsent(): void {
    if (!currentDelegation) return
    changeDelegationAttendance(currentDelegation.id, 'absent', { silent: true })
    currentIndex++
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (isComplete) return
    if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
      markPresent()
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowRight') {
      markAbsent()
    }
  }

  function handleComplete(): void {
    completeRollCall()
  }

  // 后退一步
  function goBack(): void {
    if (currentIndex <= 0) return
    currentIndex--
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full w-full flex-col items-center justify-center">
  {#if conf && thresholds}
    {#if !isComplete}
      <!-- ===== 逐个点名视图 ===== -->
      <div class="flex w-full max-w-lg flex-col items-center gap-10">
        <!-- 进度条 + 计数 -->
        <div class="flex w-full flex-col items-center gap-2">
          <div class="flex items-center gap-3 text-sm text-muted-foreground">
            <Users size={14} />
            <span>点名中 · 第 {currentIndex + 1} / {totalCount} 位</span>
          </div>
          <!-- 进度条 -->
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style="width: {progress}%"
            ></div>
          </div>
          <!-- 实时统计 -->
          <div class="flex gap-4 text-xs text-muted-foreground">
            <span>已出席 <span class="font-semibold text-emerald-600">{presentCount}</span></span>
            <span>简单多数 <span class="font-semibold text-amber-600">{thresholds.simpleMajorityThreshold}</span></span>
            <span>2/3多数 <span class="font-semibold text-rose-600">{thresholds.twoThirdsThreshold}</span></span>
          </div>
        </div>

        <!-- 当前代表团卡片 -->
        {#if currentDelegation}
          <div class="flex w-full flex-col items-center gap-6 rounded-2xl border-2 border-indigo-200 bg-card p-12 shadow-lg dark:border-indigo-800">
            <!-- 国旗/色块 -->
            <div
              class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-border text-3xl font-bold text-foreground shadow-inner bg-muted"
            >
              {#if currentDelegation.flagUrl}
                <img src={currentDelegation.flagUrl} alt="" class="h-full w-full rounded-full object-cover" />
              {:else}
                {currentDelegation.shortName?.charAt(0) ?? currentDelegation.name.charAt(0)}
              {/if}
            </div>

            <!-- 名称 -->
            <div class="text-center">
              <div class="text-3xl font-bold text-foreground">{currentDelegation.name}</div>
              {#if currentDelegation.shortName}
                <div class="mt-1 text-lg text-muted-foreground">{currentDelegation.shortName}</div>
              {/if}
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-4">
              <Button
                size="lg"
                class="min-w-[140px] gap-2 bg-emerald-600 text-base hover:bg-emerald-700"
                onclick={markPresent}
              >
                <Check size={20} />
                出席
                <span class="text-xs opacity-60">P</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                class="min-w-[140px] gap-2 text-base"
                onclick={markAbsent}
              >
                <X size={20} />
                缺席
                <span class="text-xs opacity-40">A</span>
              </Button>
            </div>

            <!-- 返回上一步 -->
            {#if currentIndex > 0}
              <button
                class="text-xs text-muted-foreground hover:text-foreground"
                onclick={goBack}
              >
                ← 返回上一位
              </button>
            {/if}
          </div>
        {/if}
      </div>

    {:else}
      <!-- ===== 点名完成视图 ===== -->
      <div class="flex w-full max-w-lg flex-col items-center gap-8">
        <div class="flex items-center gap-2">
          <Flag size={24} class="text-indigo-500" />
          <h2 class="text-2xl font-bold text-foreground">点名完成</h2>
        </div>

        <!-- 统计卡片 -->
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

        <!-- 点名结果摘要 -->
        <div class="w-full rounded-xl border bg-card">
          <div class="divide-y px-6">
            {#each sortedDelegations as delegation (delegation.id)}
              {@const isPresent = delegation.attendance === 'present'}
              <div class="flex items-center gap-3 py-2.5">
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

        <!-- 返回修改 + 完成 -->
        <div class="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            onclick={goBack}
          >
            ← 返回修改
          </Button>
          <Button
            size="lg"
            class="min-w-[160px] gap-2 bg-indigo-600 text-base hover:bg-indigo-700"
            onclick={handleComplete}
          >
            <Flag size={18} />
            完成点名
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
