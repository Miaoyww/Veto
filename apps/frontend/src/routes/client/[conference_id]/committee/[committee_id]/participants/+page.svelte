<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { Plus, RotateCcw, Users } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { Switch } from '$lib/components/ui/switch'
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
  import {
    currentCommittee,
    currentConferenceRecord,
    loadConference,
    setSeatVotingRights,
    resetRollCall,
    saveConferencesNow
  } from '$lib/classes/stores/conference/conference-store'
  import { addSeat, updateSeat } from '$lib/classes/stores/delegate/delegate-store'
  import {
    calculateMajorityThresholds,
    destroyAllTimers
  } from '$lib/classes/services/engine/conference-engine'
  import { VETO_NAME } from '$lib/classes/const'
  import { isParticipantSeat } from '$lib/classes/types/delegate'
  import { resolve } from '$app/paths'
  import PageTopBar from '$lib/components/conference/common/page-top-bar.svelte'
  import ParticipantSeatTable from '$lib/components/conference/committee/participant-seat-table.svelte'
  import { ScrollArea } from '$lib/components/ui/scroll-area'

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
  const conference = $derived($currentConferenceRecord)
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

  const participantSeatGroupId = $derived.by(() => {
    const participantSeat = conf?.seats.find(isParticipantSeat)
    if (participantSeat) return participantSeat.seatGroupId
    return conference?.seatGroups.find((group) => group.type === 'cabinet')?.id ?? ''
  })

  // ---- 重新点名确认 ----
  let showResetConfirm = $state(false)
  let showAddSeatDialog = $state(false)
  let newSeatName = $state('')
  let newSeatShortName = $state('')
  let newSeatVotingRights = $state(true)
  let addSeatError = $state('')

  function openAddSeatDialog(): void {
    newSeatName = ''
    newSeatShortName = ''
    newSeatVotingRights = true
    addSeatError = ''
    showAddSeatDialog = true
  }

  function submitNewSeat(event: SubmitEvent): void {
    event.preventDefault()
    const name = newSeatName.trim()
    if (!name) {
      addSeatError = '请输入席位名称'
      return
    }
    if (!conf || !participantSeatGroupId) {
      addSeatError = '当前大会没有可用的参会席位组'
      return
    }

    const seatId = addSeat(name, participantSeatGroupId)
    if (!seatId) {
      addSeatError = '席位添加失败，请稍后重试'
      return
    }

    updateSeat(seatId, { shortName: newSeatShortName.trim() || undefined })
    setSeatVotingRights(seatId, newSeatVotingRights)
    showAddSeatDialog = false
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
    <Button size="sm" class="h-8 gap-1.5 text-xs" disabled={!conf} onclick={openAddSeatDialog}>
      <Plus size={12} />
      增加席位
    </Button>
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

<Dialog.Root bind:open={showAddSeatDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>增加席位</Dialog.Title>
      <Dialog.Description>为“{conf?.name ?? '当前委员会'}”添加一个参会席位。</Dialog.Description>
    </Dialog.Header>
    <form class="flex flex-col gap-4" onsubmit={submitNewSeat}>
      <Field.FieldGroup>
        <Field.Field>
          <Field.FieldLabel for="new-seat-name">席位名称</Field.FieldLabel>
          <Input
            id="new-seat-name"
            bind:value={newSeatName}
            placeholder="例如：法国"
            aria-invalid={!!addSeatError || undefined}
          />
        </Field.Field>
        <Field.Field>
          <Field.FieldLabel for="new-seat-short-name">席位简称（可选）</Field.FieldLabel>
          <Input id="new-seat-short-name" bind:value={newSeatShortName} placeholder="例如：FRA" />
        </Field.Field>
        <Field.Field>
          <div class="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
            <div class="space-y-0.5">
              <Field.FieldLabel for="new-seat-voting-rights">投票权</Field.FieldLabel>
              <p class="text-xs text-muted-foreground">关闭后该席位将作为观察员加入</p>
            </div>
            <Switch id="new-seat-voting-rights" bind:checked={newSeatVotingRights} />
          </div>
        </Field.Field>
      </Field.FieldGroup>
      {#if addSeatError}<Field.FieldError>{addSeatError}</Field.FieldError>{/if}
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (showAddSeatDialog = false)}>
          取消
        </Button>
        <Button type="submit">增加席位</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<ScrollArea class="min-h-0 flex-1">
  <div class="mx-auto max-w-4xl px-6 py-6">
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
      <ParticipantSeatTable seats={sortedSeats} />
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
</ScrollArea>
