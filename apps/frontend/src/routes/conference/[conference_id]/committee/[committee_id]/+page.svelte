<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { resolve } from '$app/paths'
  import {
    ChevronDown,
    FileText,
    Globe,
    KeyRound,
    Newspaper,
    Radio,
    Plus,
    Users
  } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { addSeat, updateSeat } from '$lib/classes/stores/delegate/delegate-store'
  import {
    loadHostConferenceContent,
    type HostConferenceContent
  } from '$lib/classes/services/host-content'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import CommitteeOverviewCard from '$lib/components/conference/committee/committee-overview-card.svelte'
  import CommitteeSeatTable from '$lib/components/conference/committee/committee-seat-table.svelte'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { ScrollArea } from '$lib/components/ui/scroll-area'

  let seatsOpen = $state(true)
  let addSeatDialogOpen = $state(false)
  let newSeatName = $state('')
  let newSeatShortName = $state('')
  let newSeatRole = $state('')
  let addSeatError = $state('')
  let ready = $state(false)
  let hostContent = $state<HostConferenceContent | null>(null)

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  const committeeNews = $derived(
    (hostContent?.news ?? conference?.news ?? []).filter(
      (item) => item.sourceCommitteeId === committeeId
    )
  )
  const committeeSituation = $derived(
    (hostContent?.situations ?? conference?.situationUpdates ?? []).filter(
      (item) => item.sourceCommitteeId === committeeId
    )
  )
  const committeeFiles = $derived(committee?.documentNames ?? [])
  const overviewCards = $derived([
    {
      icon: Users,
      label: '席位',
      value: committee?.seats.length ?? 0,
      href: resolve(`/conference/${conferenceId}/committee/${committeeId}`)
    },
    {
      icon: Radio,
      label: '指令',
      value: 0,
      href: resolve(`/conference/${conferenceId}/committee/${committeeId}/directives`)
    },
    {
      icon: Newspaper,
      label: '新闻',
      value: committeeNews.length,
      href: resolve(`/conference/${conferenceId}/committee/${committeeId}/news`)
    },
    {
      icon: FileText,
      label: '文件',
      value: committeeFiles.length,
      href: resolve(`/conference/${conferenceId}/committee/${committeeId}/files`)
    },
    {
      icon: Globe,
      label: '局势',
      value: committeeSituation.length,
      href: resolve(`/conference/${conferenceId}/committee/${committeeId}/situation`)
    }
  ])
  const event = $derived.by(() => {
    return $conferences.find((conference) => conference.id === conferenceId) ?? null
  })
  onMount(async () => {
    loadConference(conferenceId, committeeId)
    hostContent = await loadHostConferenceContent(conferenceId)
    ready = true
  })
  let copied = $state('')

  async function copyText(text: string, marker: string): Promise<void> {
    await navigator.clipboard.writeText(text)
    copied = marker
    setTimeout(() => {
      if (copied === marker) copied = ''
    }, 1600)
  }

  function allKeys(): string {
    return (
      event?.committees
        .flatMap((committee) =>
          committee.seats.map((seat) => {
            const inviteCode =
              event?.seatAccesses.find((access) => access.seatId === seat.id)?.inviteCode ?? ''
            return `${committee.name},${seat.name},${seat.role ?? ''},${inviteCode}`
          })
        )
        .join('\n') ?? ''
    )
  }

  function openSeats(): void {
    newSeatName = ''
    newSeatShortName = ''
    newSeatRole = ''
    addSeatError = ''
    addSeatDialogOpen = true
  }

  function submitNewSeat(event: SubmitEvent): void {
    event.preventDefault()
    const name = newSeatName.trim()
    if (!name) {
      addSeatError = '请输入席位名称'
      return
    }
    if (!committee) return

    const seatGroupId =
      committee.seats[0]?.seatGroupId ??
      conference?.seatGroups.find((group) => group.name === committee.name)?.id ??
      conference?.seatGroups[0]?.id
    if (!seatGroupId) {
      addSeatError = '当前大会没有可用的席位组'
      return
    }

    const id = addSeat(name, seatGroupId, newSeatRole.trim() || undefined)
    if (!id) {
      addSeatError = '席位添加失败，请稍后重试'
      return
    }
    const shortName = newSeatShortName.trim()
    if (shortName) updateSeat(id, { shortName })
    addSeatDialogOpen = false
  }
</script>

<div class="flex h-screen min-h-0 flex-col bg-background">
  {#if !ready}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>
  {:else if !conference || !committee}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      未找到委员会
    </div>
  {:else}
    <header class="shrink-0 border-b px-8 py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted-foreground">{conference.name}</p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <h1 class="min-w-0 text-xl font-semibold">{committee.name}</h1>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">委员会工作区</p>
        </div>
        <div class="flex items-center gap-4 text-sm text-muted-foreground flex-col">
          <div class="flex items-center gap-1">
            <Users class="size-4" />
            <span>{committee.seats.length} 个席位</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="gap-2"
            disabled={committee.seats.length === 0}
            onclick={() => void copyText(allKeys(), 'all')}
          >
            <KeyRound class="size-4" />
            {copied === 'all' ? '已复制' : '复制全部 key'}
          </Button>
        </div>
      </div>
    </header>

    <ScrollArea class="min-h-0 flex-1">
      <div class="flex flex-col gap-8 px-8 py-6">
        <section class="flex flex-col gap-3">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Overview
              </p>
              <h2 class="mt-1 text-base font-semibold">委员会内容</h2>
            </div>
            <span class="text-xs text-muted-foreground">按来源委员会统计</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {#each overviewCards as card (card.label)}
              <CommitteeOverviewCard {...card} />
            {/each}
          </div>
        </section>
        <section class="flex flex-col gap-3">
          <Collapsible.Root bind:open={seatsOpen}>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Roster
                </p>
                <h2 class="mt-1 text-base font-semibold">席位</h2>
              </div>
              <div class="flex items-center gap-1">
                <Button variant="ghost" size="sm" class="gap-1.5 text-xs" onclick={openSeats}>
                  <Plus data-icon="inline-start" />添加席位
                </Button>
                <Collapsible.Trigger
                  aria-label={seatsOpen ? '收起席位列表' : '展开席位列表'}
                  title={seatsOpen ? '收起席位列表' : '展开席位列表'}
                  class={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'transition-transform',
                    seatsOpen && 'rotate-180'
                  )}
                >
                  <ChevronDown />
                  <span class="sr-only">{seatsOpen ? '收起席位列表' : '展开席位列表'}</span>
                </Collapsible.Trigger>
              </div>
            </div>

            <Collapsible.Content class="mt-4">
              <CommitteeSeatTable seats={committee.seats} seatAccesses={conference.seatAccesses} />
            </Collapsible.Content>
          </Collapsible.Root>
        </section>
      </div>

      <div class="h-8"></div>
    </ScrollArea>
  {/if}
</div>

<Dialog.Root bind:open={addSeatDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>添加席位</Dialog.Title>
      <Dialog.Description>为“{committee?.name ?? '当前委员会'}”添加一个新席位。</Dialog.Description>
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
            autofocus
          />
        </Field.Field>
        <Field.Field>
          <Field.FieldLabel for="new-seat-short-name">席位简称（可选）</Field.FieldLabel>
          <Input id="new-seat-short-name" bind:value={newSeatShortName} placeholder="例如：FRA" />
        </Field.Field>
        <Field.Field>
          <Field.FieldLabel for="new-seat-role">角色/职务（可选）</Field.FieldLabel>
          <Input id="new-seat-role" bind:value={newSeatRole} placeholder="例如：外交部长" />
        </Field.Field>
      </Field.FieldGroup>
      {#if addSeatError}<Field.FieldError>{addSeatError}</Field.FieldError>{/if}
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (addSeatDialogOpen = false)}>取消</Button>
        <Button type="submit">添加席位</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
