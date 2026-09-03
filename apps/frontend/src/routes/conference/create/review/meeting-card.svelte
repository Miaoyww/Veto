<script lang="ts">
  import { ChevronDown } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { Badge } from '$lib/components/ui/badge'
  import { buttonVariants } from '$lib/components/ui/button'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import type { MeetingDraft } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  let { meeting }: { meeting: MeetingDraft } = $props()

  let open = $state(true)
</script>

<Collapsible.Root bind:open>
  <article class="rounded-lg border p-4">
    <div class="flex items-center gap-3">
      <h3 class="min-w-0 flex-1 truncate text-sm font-semibold">{meeting.name}</h3>
      <Badge variant="outline">{meeting.seats.length} 个席位</Badge>
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
    </div>

    <Collapsible.Content>
      <ul class="mt-3 flex flex-col gap-2 text-sm">
        {#each meeting.seats as seat (seat.id)}
          <li class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span class="min-w-0 flex-1 truncate">{seat.name}</span>
            <span class="shrink-0 text-xs text-muted-foreground">
              {wizard.roleName(seat.roleId)}
            </span>
          </li>
        {/each}
      </ul>
    </Collapsible.Content>
  </article>
</Collapsible.Root>
