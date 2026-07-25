<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
  import { ArrowLeft, Users, Plus, Trash2, Flag, UserRoundCheck, RotateCcw } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '$lib/components/ui/alert-dialog'
  import { cn } from '$lib/utils.js'
  import {
    currentConference,
    currentConferenceId,
    loadConference,
    setAttendance,
    updateDelegation,
    addDelegation,
    removeDelegation,
    resetRollCall,
    saveConferencesNow
  } from '$lib/stores/conference/conference-store'
  import { calculateMajorityThresholds, destroyAllTimers } from '$lib/engine/conference-engine'
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

  onDestroy(async () => {
    await saveConferencesNow()
    destroyAllTimers()
  })

  const conf = $derived($currentConference)
  const sortedDelegations = $derived(
    conf ? [...conf.delegations].sort((a, b) => a.sortOrder - b.sortOrder) : []
  )
  const thresholds = $derived(
    conf ? calculateMajorityThresholds(conf.delegations) : null
  )

  // ---- 添加代表团表单 ----
  let showAddForm = $state(false)
  let newName = $state('')

  // ---- 重新点名确认 ----
  let showResetConfirm = $state(false)

  function handleAdd(): void {
    const name = newName.trim()
    if (!name) return
    addDelegation(name)
    newName = ''
    showAddForm = false
  }

  function handleRemove(id: string): void {
    removeDelegation(id)
  }

  function handleAttendanceChange(delegationId: string, value: string): void {
    setAttendance(delegationId, value as 'present' | 'absent')
    // 同步更新到 Display 窗口
    const c = $currentConference
    if (c) {
      const del = c.delegations.find((d) => d.id === delegationId)
      const isPresent = value === 'present'
      const freshThresholds = calculateMajorityThresholds(c.delegations)
      const idx = [...c.delegations].sort((a, b) => a.sortOrder - b.sortOrder).findIndex((d) => d.id === delegationId)
      getDisplayBridge().sendUpdate(
        buildDisplayData(c, {
          rollCall: {
            currentIndex: 0,
            totalCount: c.delegations.length,
            currentDelegationName: del?.name,
            currentDelegationShortName: del?.shortName,
            presentCount: freshThresholds.presentCount,
            simpleMajorityThreshold: freshThresholds.simpleMajorityThreshold,
            twoThirdsThreshold: freshThresholds.twoThirdsThreshold,
            lastMarked: {
              delegationName: del?.name ?? '',
              shortName: del?.shortName,
              status: isPresent ? 'present' : 'absent',
              index: idx >= 0 ? idx : 0
            }
          }
        })
      )
    }
  }

  function handleBack(): void {
    navigate(`/conference/${conferenceId}`)
  }
</script>

<svelte:head>
  <title>{VETO_NAME} - 代表管理</title>
</svelte:head>

<div class="flex h-[calc(100vh-2.25rem)] w-screen flex-col bg-background">
  <!-- 顶部栏 -->
  <div class="flex items-center gap-4 border-b px-6 py-3">
    <Button variant="ghost" size="sm" class="gap-1.5 text-xs" onclick={handleBack}>
      <ArrowLeft size={14} />
      返回大会
    </Button>
    <div class="h-4 w-px bg-border"></div>
    <UserRoundCheck size={16} class="text-indigo-500" />
    <span class="text-sm font-semibold text-foreground">代表管理</span>
    <span class="text-xs text-muted-foreground">{conf?.name}</span>

    <div class="ml-auto flex items-center gap-2">
      <AlertDialog open={showResetConfirm} onopenchange={(v: boolean) => (showResetConfirm = v)}>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            class="h-8 gap-1.5 text-xs text-amber-600 hover:text-amber-700 border-amber-300 hover:border-amber-400 dark:text-amber-400 dark:border-amber-700 dark:hover:text-amber-300 dark:hover:border-amber-600"
            disabled={!conf || sortedDelegations.length === 0}
          >
            <RotateCcw size={12} />
            重新点名
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新点名</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将把所有代表团的出席状态重置为"缺席"，并将大会阶段回退到"点名"阶段。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              class="bg-amber-600 hover:bg-amber-700"
              onclick={() => {
                resetRollCall()
                showResetConfirm = false
                navigate(`/conference/${conferenceId}/roll-call`)
              }}
            >
              确认重新点名
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        size="sm"
        class="h-8 gap-1.5 text-xs"
        onclick={() => (showAddForm = true)}
        disabled={showAddForm}
      >
        <Plus size={12} />
        添加代表团
      </Button>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-3xl px-6 py-6">
      {#if conf && thresholds}
        <!-- 统计卡片 -->
        <div class="mb-8 grid grid-cols-3 gap-4">
          <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
            <div class="flex items-center justify-center gap-2">
              <Users size={16} class="text-emerald-600 dark:text-emerald-400" />
              <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{thresholds.presentCount}</div>
            </div>
            <div class="mt-1 text-sm text-muted-foreground">出席 / {thresholds.totalCount}</div>
          </div>
          <div class="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <div class="flex items-center justify-center gap-2">
              <Flag size={16} class="text-amber-600 dark:text-amber-400" />
              <div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{thresholds.simpleMajorityThreshold}</div>
            </div>
            <div class="mt-1 text-sm text-muted-foreground">简单多数</div>
          </div>
          <div class="rounded-xl border-2 border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-800 dark:bg-rose-950/30">
            <div class="flex items-center justify-center gap-2">
              <Flag size={16} class="text-rose-600 dark:text-rose-400" />
              <div class="text-2xl font-bold text-rose-700 dark:text-rose-400">{thresholds.twoThirdsThreshold}</div>
            </div>
            <div class="mt-1 text-sm text-muted-foreground">2/3 多数</div>
          </div>
        </div>

        <!-- 添加代表团表单 -->
        {#if showAddForm}
          <div class="mb-6 rounded-xl border-2 border-indigo-200 bg-card p-5 dark:border-indigo-800">
            <h3 class="mb-4 text-sm font-semibold text-foreground">添加代表团</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="new-name" class="text-xs">名称</Label>
                <Input
                  id="new-name"
                  bind:value={newName}
                  placeholder="国家/组织全名"
                  class="h-9 text-sm"
                  onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleAdd() }}
                />
              </div>
              <div class="flex items-end justify-end gap-2">
                <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => (showAddForm = false)}>
                  取消
                </Button>
                <Button size="sm" class="h-8 text-xs" onclick={handleAdd} disabled={!newName.trim()}>
                  <Plus size={12} />
                  添加
                </Button>
              </div>
            </div>
          </div>
        {/if}

        <!-- 代表团列表 -->
        <div class="rounded-xl border bg-card">
          <!-- 表头 -->
          <div class="flex items-center gap-3 border-b px-5 py-3 text-xs font-medium text-muted-foreground">
            <div class="flex-1">代表团</div>
            <div class="w-36 text-center">出席状态</div>
            <div class="w-12"></div>
          </div>

          <div class="divide-y">
            {#each sortedDelegations as delegation (delegation.id)}
              {@const isPresent = delegation.attendance === 'present'}
              <div class="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                <!-- 名称 -->
                <div class="flex min-w-0 flex-1 flex-col">
                  <span
                    class={cn(
                      'truncate text-sm font-medium',
                      !isPresent && 'text-muted-foreground/50 line-through'
                    )}
                  >
                    {delegation.name}
                  </span>
                  {#if delegation.shortName}
                    <span class="truncate text-xs text-muted-foreground">{delegation.shortName}</span>
                  {/if}
                </div>

                <!-- 出席状态选择 -->
                <div class="w-36">
                  <select
                    class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={delegation.attendance}
                    onchange={(e: Event) => {
                      const target = e.target as HTMLSelectElement
                      handleAttendanceChange(delegation.id, target.value)
                    }}
                  >
                    <option value="present">出席</option>

                    <option value="absent">缺席</option>
                  </select>
                </div>

                <!-- 删除 -->
                <div class="w-12 text-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        class="rounded p-1 text-muted-foreground/40 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                        title="删除代表团"
                      >
                        <Trash2 size={14} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除代表团</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除 <span class="font-semibold text-foreground">{delegation.name}</span> 吗？此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          class="bg-red-600 hover:bg-red-700"
                          onclick={() => handleRemove(delegation.id)}
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            {/each}
          </div>

          {#if sortedDelegations.length === 0}
            <div class="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Users size={40} class="opacity-30" />
              <p class="text-lg font-medium">暂无代表团</p>
              <p class="text-sm opacity-70">点击"添加代表团"按钮添加</p>
            </div>
          {/if}
        </div>
      {:else}
        <div class="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Users size={40} class="opacity-30" />
          <p class="text-lg font-medium">未找到大会</p>
          <p class="text-sm opacity-70">请先创建大会</p>
        </div>
      {/if}
    </div>
  </div>
</div>
