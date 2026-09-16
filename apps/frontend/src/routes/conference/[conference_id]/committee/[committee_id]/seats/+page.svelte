<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ArrowLeft, KeyRound, Users } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { Button } from '$lib/components/ui/button'
  import CommitteeSeatTable from '$lib/components/conference/committee/committee-seat-table.svelte'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  let ready = $state(false)

  onMount(() => {
    loadConference(conferenceId, committeeId)
    ready = true
  })
</script>

<div class="flex min-h-0 flex-1 flex-col bg-background">
  {#if !ready}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>
  {:else if !conference || !committee}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      未找到委员会
    </div>
  {:else}
    <header class="shrink-0 border-b px-8 py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-muted-foreground">{conference.name}</p>
          <h1 class="mt-1 text-xl font-semibold">{committee.name}</h1>
          <p class="mt-1 text-sm text-muted-foreground">席位管理 · 重命名与访问 key</p>
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Users class="size-4" />{committee.seats.length} 个席位
        </div>
      </div>
    </header>
    <div class="min-h-0 flex-1 overflow-auto px-8 py-6">
      <Button
        variant="ghost"
        size="sm"
        class="mb-4 gap-1.5 text-xs"
        onclick={() => goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))}
      >
        <ArrowLeft /> 返回委员会
      </Button>
      <CommitteeSeatTable seats={committee.seats} seatAccesses={conference.seatAccesses} />
      <p class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound class="size-3.5" />重新生成后，旧 key 会立即失效。
      </p>
    </div>
  {/if}
</div>
