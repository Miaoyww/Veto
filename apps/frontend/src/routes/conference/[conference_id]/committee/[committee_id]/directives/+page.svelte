<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ArrowLeft, Radio } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { loadHostConferenceContent, type HostConferenceContent } from '$lib/classes/services/host-content'
  import { Button } from '$lib/components/ui/button'
  import * as Empty from '$lib/components/ui/empty'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  let hostContent = $state<HostConferenceContent | null>(null)
  let ready = $state(false)
  onMount(async () => {
    loadConference(conferenceId, committeeId)
    hostContent = await loadHostConferenceContent(conferenceId)
    ready = true
  })
  const directives = $derived(
    hostContent?.directives.filter((item) => item.targetCommitteeId === committeeId) ?? []
  )
</script>

<div class="flex min-h-0 flex-1 flex-col bg-background">{#if !ready}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>{:else if !conference || !committee}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">未找到委员会</div>{:else}
  <header class="shrink-0 border-b px-8 py-6"><p class="text-xs font-medium text-muted-foreground">{conference.name}</p><div class="mt-1 flex items-center gap-2"><Radio class="size-5 text-muted-foreground" /><h1 class="text-xl font-semibold">{committee.name} · 指令</h1></div><p class="mt-1 text-sm text-muted-foreground">查看发送至本委员会的指令</p></header>
  <div class="min-h-0 flex-1 overflow-auto px-8 py-6"><Button variant="ghost" size="sm" class="mb-5 gap-1.5 text-xs" onclick={() => goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))}><ArrowLeft data-icon="inline-start" /> 返回委员会</Button><p class="mb-5 text-sm text-muted-foreground">{directives.length} 条指令</p><div class="flex flex-col gap-3">{#each directives as item (item.id)}<article class="rounded-lg border bg-card p-4"><div class="flex flex-wrap items-start justify-between gap-3"><h2 class="text-sm font-semibold">{item.title}</h2><span class="text-xs text-muted-foreground">{item.status}</span></div><p class="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content}</p><div class="mt-3 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}{#if item.author} · {item.author.committeeName} · {item.author.seatName}{/if}</div></article>{:else}<Empty.Root class="min-h-64"><Empty.Media variant="icon"><Radio /></Empty.Media><Empty.Header><Empty.Title>暂无指令</Empty.Title><Empty.Description>发送至本委员会的指令会显示在这里。</Empty.Description></Empty.Header></Empty.Root>{/each}</div></div>
{/if}</div>
