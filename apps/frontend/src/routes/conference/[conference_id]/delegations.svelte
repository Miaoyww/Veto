<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
  import { ArrowLeft, Users, Plus, Trash2, UserRoundCheck, RotateCcw } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import * as Select from '$lib/components/ui/select'
  import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '$lib/components/ui/empty'
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
    changeDelegationAttendance,
    setDelegationVetoPower,
    addDelegation,
    removeDelegation,
    resetRollCall,
    saveConferencesNow
  } from '$lib/stores/conference/conference-store'
  import { calculateMajorityThresholds, destroyAllTimers } from '$lib/engine/conference-engine'
  import { VETO_NAME } from '$lib/const'
  import type { Attendance } from '$lib/types-conference'

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
  let newShortName = $state('')

  // ---- 重新点名确认 ----
  let showResetConfirm = $state(false)

  function handleAdd(): void {
    const name = newName.trim()
    if (!name) return
    addDelegation(name, newShortName.trim() || undefined)
    newName = ''
    newShortName = ''
    showAddForm = false
  }

  function handleRemove(id: string): void {
    removeDelegation(id)
  }

  function handleAttendanceChange(delegationId: string, value: string): void {
    changeDelegationAttendance(delegationId, value as Attendance)
  }

  function handleVetoPowerToggle(delegationId: string, vetoPower: boolean): void {
    setDelegationVetoPower(delegationId, vetoPower)
  }

  function handleBack(): void {
    navigate(`/conference/${conferenceId}`)
  }
</script>

<svelte:head>
  <title>{VETO_NAME} - 代表管理</title>
</svelte:head>

<div class="flex h-full w-full flex-col bg-background">
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
            class="h-8 gap-1.5 text-xs"
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
            <AlertDialogAction onclick={() => {
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
        <div class="mb-8 grid grid-cols-4 gap-4">
          <Card>
            <CardContent class="flex flex-col items-center gap-1 p-5">
              <span class="text-2xl font-bold text-foreground">{thresholds.presentCount}</span>
              <span class="text-sm text-muted-foreground">出席 / {thresholds.totalCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="flex flex-col items-center gap-1 p-5">
              <span class="text-2xl font-bold text-foreground">{thresholds.votingCount}</span>
              <span class="text-sm text-muted-foreground">可投票</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="flex flex-col items-center gap-1 p-5">
              <span class="text-2xl font-bold text-foreground">{thresholds.simpleMajorityThreshold}</span>
              <span class="text-sm text-muted-foreground">简单多数</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="flex flex-col items-center gap-1 p-5">
              <span class="text-2xl font-bold text-foreground">{thresholds.twoThirdsThreshold}</span>
              <span class="text-sm text-muted-foreground">2/3 多数</span>
            </CardContent>
          </Card>
        </div>

        <!-- 添加代表团表单 -->
        {#if showAddForm}
          <Card class="mb-6 border-indigo-200 dark:border-indigo-800">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">添加代表团</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-[1fr_1fr_auto] gap-4">
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
                <div class="flex flex-col gap-1.5">
                  <Label for="new-short-name" class="text-xs">简称 <span class="text-muted-foreground/60">（可选）</span></Label>
                  <Input
                    id="new-short-name"
                    bind:value={newShortName}
                    placeholder="如：中国"
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
            </CardContent>
          </Card>
        {/if}

        <!-- 代表团列表 -->
        <Card>
          <CardContent class="p-0">
            <!-- 表头 -->
            <div class="flex items-center gap-3 border-b px-5 py-3 text-xs font-medium text-muted-foreground">
              <div class="flex-1">代表团</div>
              <div class="w-28 text-center">出席状态</div>
              <div class="w-20 text-center">投票权</div>
              <div class="w-12"></div>
            </div>

            <div class="divide-y">
              {#each sortedDelegations as delegation (delegation.id)}
                {@const isPresent = delegation.attendance === 'present'}
                {@const isObserver = isPresent && delegation.vetoPower === false}
                <div class="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                  <!-- 名称 -->
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span
                      class={cn(
                        'truncate text-sm font-medium',
                        !isPresent && 'text-muted-foreground/50 line-through',
                        isObserver && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {delegation.name}
                    </span>
                    {#if delegation.shortName}
                      <span class="truncate text-xs text-muted-foreground">{delegation.shortName}</span>
                    {/if}
                  </div>

                  <!-- 出席状态选择 -->
                  <div class="w-28">
                    <Select.Root
                      type="single"
                      value={delegation.attendance}
                      onValueChange={(v: string) => handleAttendanceChange(delegation.id, v)}
                    >
                      <Select.Trigger class="h-8 w-full text-xs">
                        {delegation.attendance === 'present' ? '出席' : '缺席'}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="present" label="出席" />
                        <Select.Item value="absent" label="缺席" />
                      </Select.Content>
                    </Select.Root>
                  </div>

                  <!-- 投票权开关 -->
                  <div class="w-20 text-center">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={delegation.vetoPower !== false}
                        onchange={(e: Event) => {
                          const target = e.target as HTMLInputElement
                          handleVetoPowerToggle(delegation.id, target.checked)
                        }}
                        disabled={!isPresent}
                        title={isPresent ? (delegation.vetoPower !== false ? '拥有投票权' : '观察员（无投票权）') : '未出席，不可设置投票权'}
                      />
                      <span class="text-[11px] text-muted-foreground">
                        {delegation.vetoPower !== false ? '有' : '无'}
                      </span>
                    </label>
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
              <div class="py-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users size={24} />
                    </EmptyMedia>
                    <EmptyTitle>暂无代表团</EmptyTitle>
                    <EmptyDescription>点击"添加代表团"按钮添加</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            {/if}
          </CardContent>
        </Card>
      {:else}
        <div class="py-12">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users size={24} />
              </EmptyMedia>
              <EmptyTitle>未找到大会</EmptyTitle>
              <EmptyDescription>请先创建大会</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      {/if}
    </div>
  </div>
</div>
