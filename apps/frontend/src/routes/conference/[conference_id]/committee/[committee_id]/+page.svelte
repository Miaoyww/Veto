<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import {
    ChevronDown,
    FileText,
    KeyRound,
    Newspaper,
    Radio,
    SquarePen,
    Users
  } from '@lucide/svelte'
  import { MorphIcon } from 'morphicons/svelte'
  import { Check, Copy } from 'lucide'
  import { cn } from '$lib/classes/utils'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/classes/services/engine/conference-engine'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { ScrollArea } from '$lib/components/ui/scroll-area'

  let seatsOpen = $state(true)
  let ready = $state(false)

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  const committeeNews = $derived(
    conference?.news.filter((item) => item.sourceCommitteeId === committeeId) ?? []
  )
  const committeeSituation = $derived(
    conference?.situationUpdates.filter((item) => item.sourceCommitteeId === committeeId) ?? []
  )
  const event = $derived.by(() => {
    return $conferences.find((conference) => conference.id === conferenceId) ?? null
  })
  onMount(() => {
    loadConference(conferenceId, committeeId)
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

          <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-lg border bg-card p-4">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Users class="size-4" />
                <dt class="text-xs font-medium">席位</dt>
              </div>
              <dd class="mt-3 text-2xl font-semibold">{committee.seats.length}</dd>
            </div>
            <div class="rounded-lg border bg-card p-4">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Radio class="size-4" />
                <dt class="text-xs font-medium">指令</dt>
              </div>
              <dd class="mt-3 text-2xl font-semibold">0</dd>
            </div>
            <div class="rounded-lg border bg-card p-4">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Newspaper class="size-4" />
                <dt class="text-xs font-medium">新闻</dt>
              </div>
              <dd class="mt-3 text-2xl font-semibold">{committeeNews.length}</dd>
            </div>
            <div class="rounded-lg border bg-card p-4">
              <div class="flex items-center gap-2 text-muted-foreground">
                <FileText class="size-4" />
                <dt class="text-xs font-medium">文件</dt>
              </div>
              <dd class="mt-3 text-2xl font-semibold">0</dd>
            </div>
          </dl>
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

            <Collapsible.Content>
              <div class="mt-4 overflow-hidden rounded-md border">
                <table class="w-full text-sm">
                  <thead class="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium">席位</th>
                      <th class="px-3 py-2 text-left font-medium">角色</th>
                      <th class="px-3 py-2 text-left font-medium">Key</th>
                      <th class="w-20 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each committee.seats as seat (seat.id)}
                      {@const inviteCode =
                        event?.seatAccesses?.find((access) => access.seatId === seat.id)
                          ?.inviteCode ?? ''}
                      <tr class="border-t">
                        <td class="px-3 py-2">{seat.name}</td>
                        <td class="px-3 py-2 text-muted-foreground">{seat.role ?? '-'}</td>
                        <td class="px-3 py-2 font-mono text-xs">{inviteCode || '未生成'}</td>
                        <td class="px-3 py-2 text-right flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            onclick={() => void copyText(inviteCode, seat.id)}
                            disabled={!inviteCode}
                            aria-label={copied === seat.id ? '已复制' : '复制'}
                            title={copied === seat.id ? '已复制' : '复制'}
                          >
                            <MorphIcon icon={copied === seat.id ? Check : Copy} />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="编辑" title="编辑">
                            <SquarePen />
                          </Button>
                        </td>
                      </tr>
                    {:else}
                      <tr class="border-t">
                        <td class="px-3 py-4 text-center text-muted-foreground" colspan="4">
                          无席位
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        </section>
      </div>

      <div class="h-8"></div>
    </ScrollArea>
  {/if}
</div>
