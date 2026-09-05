<script lang="ts">
  import { ChevronDown, Play, Settings } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { PHASE_LABELS } from '$lib/classes/services/engine/conference-engine'
  import { navigateToCommittee } from '$lib/classes/utils'
  import type { Committee } from '$lib/classes/types/conference'
  import type { SeatAccess } from '$lib/classes/types/delegate'

  let {
    committee,
    conferenceId,
    copied,
    seatAccesses,
    copyText
  }: {
    committee: Committee
    conferenceId: string
    seatAccesses: SeatAccess[]
    copied: string
    copyText: (text: string, marker: string) => Promise<void>
  } = $props()

  let open = $state(true)
</script>

<Collapsible.Root bind:open>
  <article class="rounded-lg border p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-base font-semibold">{committee.name}</h3>
        <p class="mt-1 text-xs text-muted-foreground">
          {PHASE_LABELS[committee.phase] ?? committee.phase}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Collapsible.Trigger
          aria-label={open ? '收起席位' : '展开席位'}
          title={open ? '收起席位' : '展开席位'}
          class={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'transition-transform',
            open && 'rotate-180'
          )}
        >
          <ChevronDown />
          <span class="sr-only">{open ? '收起席位' : '展开席位'}</span>
        </Collapsible.Trigger>
        <Button
          size="icon"
          class="gap-2"
          variant="ghost"
          onclick={() => navigateToCommittee(conferenceId, committee.id)}
        >
          <Settings class="size-4" />
        </Button>
      </div>
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
                seatAccesses.find((access) => access.seatId === seat.id)?.inviteCode ?? ''}
              <tr class="border-t">
                <td class="px-3 py-2">{seat.name}</td>
                <td class="px-3 py-2 text-muted-foreground">{seat.role ?? '-'}</td>
                <td class="px-3 py-2 font-mono text-xs">{inviteCode || '未生成'}</td>
                <td class="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => void copyText(inviteCode, seat.id)}
                    disabled={!inviteCode}
                  >
                    {copied === seat.id ? '已复制' : '复制'}
                  </Button>
                </td>
              </tr>
            {:else}
              <tr class="border-t">
                <td class="px-3 py-4 text-center text-muted-foreground" colspan="4"> 无席位 </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Collapsible.Content>
  </article>
</Collapsible.Root>
