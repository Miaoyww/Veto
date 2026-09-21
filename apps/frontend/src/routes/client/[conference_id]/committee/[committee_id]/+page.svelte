<script lang="ts">
  import { PanelLeft } from '@lucide/svelte'
  import { page } from '$app/stores'

  import { cloudSession } from '$lib/classes/stores/cloud/cloud-session-store.svelte'
  import { conferences } from '$lib/classes/stores/conference/conference-store'
  import * as Empty from '$lib/components/ui/empty'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived(
    $conferences.find((candidate) => candidate.id === conferenceId) ?? null
  )
  const committee = $derived(
    conference?.committees.find((candidate) => candidate.id === committeeId) ?? null
  )
  const cloudProjection = $derived(
    cloudSession.chairProjection?.conference.id === conferenceId &&
      cloudSession.chairProjection?.committee.id === committeeId
      ? cloudSession.chairProjection
      : null
  )
  const cloudResult = $derived(
    cloudSession.session?.result.conferenceId === conferenceId &&
      cloudSession.session.result.committeeId === committeeId
      ? cloudSession.session.result
      : null
  )

  const conferenceName = $derived(
    cloudProjection?.conference.name ?? conference?.name ?? '当前大会'
  )
  const committeeName = $derived(cloudProjection?.committee.name ?? committee?.name ?? '当前委员会')
  const organizer = $derived(
    cloudProjection?.conference.organizer ?? conference?.organizer ?? '未填写'
  )
  const seatName = $derived(cloudResult ? cloudResult.seatShortName || cloudResult.seatName : null)
  const participantCount = $derived(
    cloudProjection
      ? cloudProjection.seats.filter((seat) => seat.id !== cloudProjection.chairSeat.id).length
      : (committee?.participantSeats.length ?? 0)
  )
</script>

<div class="flex h-full min-h-0 items-center justify-center p-6">
  <Empty.Root class="max-w-2xl border bg-card/45 py-10 shadow-sm">
    <Empty.Header>
      <Empty.Media variant="icon">
        <PanelLeft class="size-5" />
      </Empty.Media>
      <Empty.Title>从侧边栏开始你的会议</Empty.Title>
      <Empty.Description>选择左侧可用功能，查看会议内容或进入主席台。</Empty.Description>
    </Empty.Header>

    <Empty.Content class="max-w-xl">
      <dl class="grid w-full gap-3 text-left sm:grid-cols-2">
        <div class="rounded-lg border bg-background/60 p-3">
          <dt class="text-xs text-muted-foreground">大会</dt>
          <dd class="mt-1 truncate text-sm font-medium text-foreground">{conferenceName}</dd>
        </div>
        <div class="rounded-lg border bg-background/60 p-3">
          <dt class="text-xs text-muted-foreground">委员会</dt>
          <dd class="mt-1 truncate text-sm font-medium text-foreground">{committeeName}</dd>
        </div>
        <div class="rounded-lg border bg-background/60 p-3">
          <dt class="text-xs text-muted-foreground">组织方</dt>
          <dd class="mt-1 truncate text-sm font-medium text-foreground">{organizer}</dd>
        </div>
        <div class="rounded-lg border bg-background/60 p-3">
          {#if seatName && cloudResult}
            <dt class="text-xs text-muted-foreground">当前身份</dt>
            <dd class="mt-1 truncate text-sm font-medium text-foreground">
              {seatName} · {cloudResult.roleName}
            </dd>
          {:else}
            <dt class="text-xs text-muted-foreground">参会席位</dt>
            <dd class="mt-1 text-sm font-medium text-foreground">{participantCount} 个</dd>
          {/if}
        </div>
      </dl>
    </Empty.Content>
  </Empty.Root>
</div>
