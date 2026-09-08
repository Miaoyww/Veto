<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ArrowLeft, FileText } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Empty from '$lib/components/ui/empty'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  let ready = $state(false)
  onMount(() => { loadConference(conferenceId, committeeId); ready = true })
</script>

<div class="flex min-h-0 flex-1 flex-col bg-background">{#if !ready}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>{:else if !conference || !committee}<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">未找到委员会</div>{:else}
  <header class="shrink-0 border-b px-8 py-6"><p class="text-xs font-medium text-muted-foreground">{conference.name}</p><div class="mt-1 flex items-center gap-2"><FileText class="size-5 text-muted-foreground" /><h1 class="text-xl font-semibold">{committee.name} · 文件</h1></div><p class="mt-1 text-sm text-muted-foreground">查看本委员会已登记的文件</p></header>
  <div class="min-h-0 flex-1 overflow-auto px-8 py-6"><Button variant="ghost" size="sm" class="mb-5 gap-1.5 text-xs" onclick={() => goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))}><ArrowLeft data-icon="inline-start" /> 返回委员会</Button><p class="mb-5 text-sm text-muted-foreground">{committee.documentNames.length} 个文件</p><div class="grid gap-3 sm:grid-cols-2">{#each committee.documentNames as name (name)}<Card.Root><Card.Content class="flex items-center gap-3 py-4"><FileText class="size-5 text-muted-foreground" /><span class="text-sm font-medium">{name}</span></Card.Content></Card.Root>{:else}<Empty.Root class="col-span-full min-h-64"><Empty.Media variant="icon"><FileText /></Empty.Media><Empty.Header><Empty.Title>暂无文件</Empty.Title><Empty.Description>本委员会登记的文件会显示在这里。</Empty.Description></Empty.Header></Empty.Root>{/each}</div></div>
{/if}</div>
