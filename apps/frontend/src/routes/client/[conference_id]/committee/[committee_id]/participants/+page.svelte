<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { Users, RotateCcw } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { Switch } from '$lib/components/ui/switch'
  import * as Table from '$lib/components/ui/table'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
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
    loadConference,
    changeSeatAttendance,
    setSeatVotingRights,
    resetRollCall,
    saveConferencesNow
  } from '$lib/classes/stores/conference/conference-store'
  import {
    calculateMajorityThresholds,
    destroyAllTimers
  } from '$lib/classes/services/engine/conference-engine'
  import { VETO_NAME } from '$lib/classes/const'
  import type { Attendance } from '$lib/classes/types/conference'
  import { isParticipantSeat } from '$lib/classes/types/delegate'
  import { resolve } from '$app/paths'
  import PageTopBar from '$lib/components/conference/common/page-top-bar.svelte'

  const conferenceId = $derived($page.params.conference_id ?? null)
  const committeeId = $derived($page.params.committee_id ?? null)

  onMount(() => {
    if (conferenceId) {
      void loadConference(conferenceId, committeeId ?? undefined)
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
  const stats = $derived(
    thresholds
      ? [
          { value: thresholds.presentCount, label: `出席 / ${thresholds.totalCount}` },
          { value: thresholds.votingCount, label: '可投票' },
          { value: thresholds.simpleMajorityThreshold, label: '简单多数' },
          { value: thresholds.twoThirdsThreshold, label: '2/3 多数' }
        ]
      : []
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

<PageTopBar
  icon={Users}
  title="参会席位"
  subtitle={conf?.name}
  backHref={resolve(`/client/${conferenceId}/committee/${committeeId}`)}
>
  {#snippet actions()}
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
  {/snippet}
</PageTopBar>

<div class="flex-1 h-screen overflow-y-auto">
  <div class="mx-auto h-screen max-w-3xl px-6 py-6">
    {#if conf && thresholds}
      <!-- 统计卡片 -->
      <div class="mb-8 grid grid-cols-4 gap-4">
        {#each stats as stat (stat.label)}
          <Card>
            <CardContent class="flex flex-col items-center gap-1 p-5">
              <span class="text-2xl font-bold text-foreground">{stat.value}</span>
              <span class="text-sm text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        {/each}
      </div>

      <!-- 参会席位列表 -->
      <Card>
        <CardContent class="p-0">
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
          {:else}
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>席位</Table.Head>
                  <Table.Head class="w-36 text-center">出席状态</Table.Head>
                  <Table.Head class="w-24 text-center">投票权</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each sortedSeats as seat (seat.id)}
                  {@const isPresent = seat.procedure.attendance === 'present'}
                  {@const isObserver = isPresent && !seat.procedure.hasVotingRights}
                  <Table.Row>
                    <Table.Cell class="max-w-0">
                      <div class="flex min-w-0 flex-col gap-0.5">
                        <div class="flex min-w-0 items-center gap-2">
                          <span
                            class={cn(
                              'truncate text-sm font-medium',
                              !isPresent && 'text-muted-foreground/50 line-through'
                            )}
                          >
                            {seat.name}
                          </span>
                          {#if isObserver}
                            <Badge variant="outline">观察员</Badge>
                          {/if}
                        </div>
                        {#if seat.shortName}
                          <span class="truncate text-xs text-muted-foreground">
                            {seat.shortName}
                          </span>
                        {/if}
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div class="flex justify-center">
                        <ToggleGroup.Root
                          type="single"
                          variant="outline"
                          size="sm"
                          spacing={1}
                          value={seat.procedure.attendance}
                          onValueChange={(value: string) => handleAttendanceChange(seat.id, value)}
                          aria-label={`设置 ${seat.name} 的出席状态`}
                        >
                          <ToggleGroup.Item
                            value="present"
                            class="data-[state=on]:border-blue-300 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 dark:data-[state=on]:border-blue-700 dark:data-[state=on]:bg-blue-950/60 dark:data-[state=on]:text-blue-300"
                          >
                            出席
                          </ToggleGroup.Item>
                          <ToggleGroup.Item
                            value="absent"
                            class="data-[state=on]:border-border data-[state=on]:bg-muted data-[state=on]:text-muted-foreground"
                          >
                            缺席
                          </ToggleGroup.Item>
                        </ToggleGroup.Root>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div class="flex justify-center">
                        <Switch
                          checked={seat.procedure.hasVotingRights}
                          onCheckedChange={(checked: boolean) =>
                            handleVotingRightsToggle(seat.id, checked)}
                          disabled={!isPresent}
                          title={isPresent
                            ? seat.procedure.hasVotingRights
                              ? '拥有投票权'
                              : '观察员（无投票权）'
                            : '未出席，不可设置投票权'}
                          aria-label={`设置 ${seat.name} 的投票权`}
                        />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
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
