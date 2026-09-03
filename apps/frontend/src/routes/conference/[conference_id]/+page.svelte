<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { cn } from '$lib/classes/utils'
  import { Badge } from '$lib/components/ui/badge'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { ChevronDown, KeyRound, Newspaper, ShieldCheck } from '@lucide/svelte'
  import {
    conferenceEvents,
    conferenceEventsReady
  } from '$lib/classes/stores/conference/conference-event-store'
  import { conferences, unloadConference } from '$lib/classes/stores/conference/conference-store'
  import ConferenceCard from './conference-card.svelte'
  import * as Collapsible from '$lib/components/ui/collapsible'

  let ready = $state(false)
  let copied = $state('')
  let conferencesOpen = $state(true)

  // settings 挂在 [conference_id] 路由下：由当前小会议反查其所属大会
  const conferenceId = $derived($page.params.conference_id ?? '')
  const event = $derived.by(() => {
    const conference = $conferences.find((item) => item.id === conferenceId)
    if (!conference?.eventId) return null
    return $conferenceEvents.find((item) => item.id === conference.eventId) ?? null
  })
  const eventConferences = $derived(
    event ? $conferences.filter((conference) => conference.eventId === event.id) : []
  )
  const seatCount = $derived(eventConferences.reduce((sum, item) => sum + item.seats.length, 0))

  async function copyText(text: string, marker: string): Promise<void> {
    await navigator.clipboard.writeText(text)
    copied = marker
    setTimeout(() => {
      if (copied === marker) copied = ''
    }, 1600)
  }

  function allKeys(): string {
    return eventConferences
      .flatMap((conference) =>
        conference.seats.map(
          (seat) => `${conference.name},${seat.name},${seat.role ?? ''},${seat.inviteCode}`
        )
      )
      .join('\n')
  }

  onMount(() => {
    unloadConference()
    void conferenceEventsReady.then(() => {
      ready = true
    })
  })
</script>

<div class="flex h-screen min-h-0 flex-col bg-background">
  {#if !ready}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>
  {:else if !event}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      未找到大会
    </div>
  {:else}
    <header class="shrink-0 border-b px-8 py-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="truncate text-xl font-semibold">{event.name}</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {event.organizer ?? '未指定主办方'} · {new Date(event.createdAt).toLocaleDateString(
              'zh-CN'
            )}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="outline">{eventConferences.length} 场小会议</Badge>
          <Badge variant="outline">{seatCount} 个席位</Badge>
          <Button
            variant="outline"
            size="sm"
            class="gap-2"
            disabled={seatCount === 0}
            onclick={() => void copyText(allKeys(), 'all')}
          >
            <KeyRound class="size-4" />
            {copied === 'all' ? '已复制' : '复制全部 key'}
          </Button>
        </div>
      </div>
    </header>

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-6 px-8 py-6">
        <Collapsible.Root bind:open={conferencesOpen}>
          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold">小会议</h2>
              <Collapsible.Trigger
                aria-label={conferencesOpen ? '收起小会议列表' : '展开小会议列表'}
                title={conferencesOpen ? '收起小会议列表' : '展开小会议列表'}
                class={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'transition-transform',
                  conferencesOpen && 'rotate-180'
                )}
              >
                <ChevronDown />
                <span class="sr-only">{conferencesOpen ? '收起小会议列表' : '展开小会议列表'}</span>
              </Collapsible.Trigger>
            </div>
            <Collapsible.Content>
              <div class="grid gap-4 xl:grid-cols-2">
                {#each eventConferences as conference (conference.id)}
                  <ConferenceCard {conference} {copied} {copyText} />
                {:else}
                  <p
                    class="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    暂无小会议
                  </p>
                {/each}
              </div>
            </Collapsible.Content>
          </section>
        </Collapsible.Root>

        <section class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-lg border p-4">
            <div class="flex items-center gap-2">
              <ShieldCheck class="size-4 text-primary" />
              <h2 class="text-sm font-semibold">角色模板</h2>
            </div>
            <div class="mt-3 flex flex-col gap-2">
              {#each event.roleTemplates as role (role.id)}
                <div class="rounded-md border px-3 py-2">
                  <div class="text-sm font-medium">{role.name}</div>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {role.capabilities.length} 项权限
                  </p>
                </div>
              {/each}
            </div>
          </article>

          <article class="rounded-lg border p-4">
            <div class="flex items-center gap-2">
              <Newspaper class="size-4 text-primary" />
              <h2 class="text-sm font-semibold">全局内容</h2>
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-md border px-3 py-2">
                <dt class="text-xs text-muted-foreground">新闻</dt>
                <dd class="mt-1 font-medium">{event.news.length}</dd>
              </div>
              <div class="rounded-md border px-3 py-2">
                <dt class="text-xs text-muted-foreground">局势</dt>
                <dd class="mt-1 font-medium">{event.situationUpdates.length}</dd>
              </div>
            </dl>
          </article>
        </section>
      </div>
    </ScrollArea>
  {/if}
</div>
