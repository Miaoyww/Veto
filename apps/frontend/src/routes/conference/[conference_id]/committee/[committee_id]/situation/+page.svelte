<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ArrowLeft, CalendarDays, Globe } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { loadHostConferenceContent, type HostConferenceContent } from '$lib/classes/services/host-content'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Empty from '$lib/components/ui/empty'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  let hostContent = $state<HostConferenceContent | null>(null)
  const updates = $derived((hostContent?.situations ?? conference?.situationUpdates ?? []).filter((item) => item.sourceCommitteeId === committeeId).sort((a, b) => b.createdAt - a.createdAt))
  let ready = $state(false)
  const statusLabels = { published: '已发布', retracted: '已撤回' } as const
  onMount(async () => { loadConference(conferenceId, committeeId); hostContent = await loadHostConferenceContent(conferenceId); ready = true })
</script>

<div class="flex min-h-0 flex-1 flex-col bg-background">{#if !ready}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>{:else if !conference || !committee}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">未找到委员会</div>{:else}
  <header class="shrink-0 border-b px-8 py-6"><p class="text-xs font-medium text-muted-foreground">{conference.name}</p><div class="mt-1 flex items-center gap-2"><Globe class="size-5 text-muted-foreground" /><h1 class="text-xl font-semibold">{committee.name} · 局势</h1></div><p class="mt-1 text-sm text-muted-foreground">查看本委员会发布的局势更新</p></header>
  <div class="min-h-0 flex-1 overflow-auto px-8 py-6"><Button variant="ghost" size="sm" class="mb-5 gap-1.5 text-xs" onclick={() => goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))}><ArrowLeft data-icon="inline-start" /> 返回委员会</Button><p class="mb-5 text-sm text-muted-foreground">{updates.length} 条局势更新</p><div class="flex flex-col gap-3">{#each updates as item (item.id)}<Card.Root><Card.Header class="pb-3"><div class="flex items-start justify-between gap-3"><Card.Title class="text-base">{item.title}</Card.Title><Badge variant={item.status === 'published' ? 'default' : 'outline'}>{statusLabels[item.status]}</Badge></div></Card.Header><Card.Content><p class="whitespace-pre-wrap text-sm leading-6">{item.content}</p><div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span class="inline-flex items-center gap-1"><CalendarDays class="size-3.5" />{new Date(item.createdAt).toLocaleString()}</span>{#if item.relatedLocation?.label}<span>地点：{item.relatedLocation.label}</span>{/if}</div></Card.Content></Card.Root>{:else}<Empty.Root class="min-h-64"><Empty.Media variant="icon"><Globe /></Empty.Media><Empty.Header><Empty.Title>暂无局势更新</Empty.Title><Empty.Description>本委员会发布的局势更新会显示在这里。</Empty.Description></Empty.Header></Empty.Root>{/each}</div></div>
{/if}</div>
