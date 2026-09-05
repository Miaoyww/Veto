<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { Users, RotateCcw } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import * as Select from '$lib/components/ui/select'
  import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription
  } from '$lib/components/ui/empty'
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
  } from '$lib/components/ui/alert-dialog'
  import { cn } from '$lib/classes/utils.js'
  import {
    currentCommittee,
    currentCommitteeId,
    currentConferenceId,
    loadConference,
    changeSeatAttendance,
    setSeatVotingRights,
    resetRollCall,
    saveConferencesNow
  } from '$lib/classes/stores/conference/conference-store'
  import { calculateMajorityThresholds, destroyAllTimers } from '$lib/classes/services/engine/conference-engine'
  import { VETO_NAME } from '$lib/classes/const'
  import type { Attendance } from '$lib/classes/types/conference'
  import { isParticipantSeat } from '$lib/classes/types/delegate'
  import { resolve } from '$app/paths'
  import PanelHeader from '$lib/components/conference/common/panel-header.svelte'

  const conferenceId = $derived($page.params.conference_id ?? null)
  const committeeId = $derived($page.params.committee_id ?? null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded =
        $currentConferenceId === conferenceId && $currentCommitteeId === committeeId
      if (!alreadyLoaded) {
        loadConference(conferenceId, committeeId ?? undefined)
      }
    }
  })

  onDestroy(async () => {
    await saveConferencesNow()
    destroyAllTimers()
  })

  const conf = $derived($currentCommittee)
  const sortedSeats = $derived(
    conf
      ? conf.seats
          .filter(isParticipantSeat)
          .sort((a, b) => a.procedure.sortOrder - b.procedure.sortOrder)
      : []
  )
  const thresholds = $derived(
    conf ? calculateMajorityThresholds(conf.seats.filter(isParticipantSeat)) : null
  )

  // ---- 重新点名确认 ----
  let showResetConfirm = $state(false)

  function handleAttendanceChange(seatId: string, value: string): void {
    changeSeatAttendance(seatId, value as Attendance)
  }

  function handleVotingRightsToggle(seatId: string, hasVotingRights: boolean): void {
    setSeatVotingRights(seatId, hasVotingRights)
  }
</script>

<svelte:head>
  <title>{VETO_NAME} - 参会席位</title>
</svelte:head>

<!-- 顶部栏 -->
<div class="flex items-center gap-4 border-b px-6 py-3">
  <PanelHeader icon={Users} title="参会席位" />
  <span class="text-xs text-muted-foreground">{conf?.name}</span>

  <div class="ml-auto flex items-center gap-2">
    <AlertDialog bind:open={showResetConfirm}>
      <AlertDialogTrigger>
        {#snippet child({ props })}
        <Button
          {...props}
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          disabled={!conf || sortedSeats.length === 0}
        >
          <RotateCcw size={12} />
          重新点名
        </Button>
        {/snippet}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>重新点名</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将把所有参会席位的出席状态重置为"缺席"，并将大会阶段回退到"点名"阶段。确定要继续吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onclick={() => {
              resetRollCall()
              showResetConfirm = false
              goto(resolve(`/conference/${conferenceId}/committee/${committeeId}/roll-call`))
            }}
          >
            确认重新点名
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
            <span class="text-2xl font-bold text-foreground"
              >{thresholds.simpleMajorityThreshold}</span
            >
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

      <!-- 参会席位列表 -->
      <Card>
        <CardContent class="p-0">
          <!-- 表头 -->
          <div
            class="flex items-center gap-3 border-b px-5 py-3 text-xs font-medium text-muted-foreground"
          >
            <div class="flex-1">席位</div>
            <div class="w-28 text-center">出席状态</div>
            <div class="w-20 text-center">投票权</div>
          </div>

          <div class="divide-y">
            {#each sortedSeats as seat (seat.id)}
              {@const isPresent = seat.procedure.attendance === 'present'}
              {@const isObserver = isPresent && !seat.procedure.hasVotingRights}
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
                    {seat.name}
                  </span>
                  {#if seat.procedure.shortName}
                    <span class="truncate text-xs text-muted-foreground"
                      >{seat.procedure.shortName}</span
                    >
                  {/if}
                </div>

                <!-- 出席状态选择 -->
                <div class="w-28">
                  <Select.Root
                    type="single"
                    value={seat.procedure.attendance}
                    onValueChange={(v: string) => handleAttendanceChange(seat.id, v)}
                  >
                    <Select.Trigger class="h-8 w-full text-xs">
                      {seat.procedure.attendance === 'present' ? '出席' : '缺席'}
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
                      checked={seat.procedure.hasVotingRights}
                      onchange={(e: Event) => {
                        const target = e.target as HTMLInputElement
                        handleVotingRightsToggle(seat.id, target.checked)
                      }}
                      disabled={!isPresent}
                      title={isPresent
                        ? seat.procedure.hasVotingRights
                          ? '拥有投票权'
                          : '观察员（无投票权）'
                        : '未出席，不可设置投票权'}
                    />
                    <span class="text-[11px] text-muted-foreground">
                      {seat.procedure.hasVotingRights ? '有' : '无'}
                    </span>
                  </label>
                </div>
              </div>
            {/each}
          </div>

          {#if sortedSeats.length === 0}
            <div class="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users size={24} />
                  </EmptyMedia>
                  <EmptyTitle>暂无参会席位</EmptyTitle>
                  <EmptyDescription>请在席位管理中配置参与议事的席位</EmptyDescription>
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
