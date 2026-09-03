<script lang="ts">
  import { ChevronDown, Play } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { PHASE_LABELS } from '$lib/classes/services/engine/conference-engine'
  import { navigateToConference } from '$lib/classes/utils'
  import type { Committee } from '$lib/classes/types/conference'

  let {
    committee,
    conferenceId,
    copied,
    copyText
  }: {
    committee: Committee
    conferenceId: string
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
        <Button size="sm" class="gap-2" onclick={() => navigateToConference(conferenceId, committee.id)}>
          <Play class="size-4" />
          进入会议
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
              <tr class="border-t">
                <td class="px-3 py-2">{seat.name}</td>
                <td class="px-3 py-2 text-muted-foreground">{seat.role ?? '-'}</td>
                <td class="px-3 py-2 font-mono text-xs">{seat.inviteCode}</td>
                <td class="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => void copyText(seat.inviteCode, seat.id)}
                  >
                    {copied === seat.id ? '已复制' : '复制'}
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
  </article>
</Collapsible.Root>
