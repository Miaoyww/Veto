<script lang="ts">
  import { ChevronDown } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { CAPABILITY_LABELS } from '$lib/classes/types/delegate'
  import type { Capability } from '$lib/classes/types/delegate'
  import { Badge } from '$lib/components/ui/badge'
  import { buttonVariants } from '$lib/components/ui/button'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import CommitteeCard from './meeting-card.svelte'

  const capabilityLabel = (capability: Capability): string =>
    CAPABILITY_LABELS[capability] ?? capability

  let rolesOpen = $state(true)
</script>

<section class="flex flex-col gap-5">
  <article class="rounded-lg border p-4">
    <h2 class="truncate text-sm font-semibold">{wizard.eventName || '未命名大会'}</h2>
    <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt class="text-xs text-muted-foreground">委员会</dt>
        <dd class="mt-1 font-medium">{wizard.committees.length}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">角色模板</dt>
        <dd class="mt-1 font-medium">{wizard.roles.length}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">席位</dt>
        <dd class="mt-1 font-medium">{wizard.totalSeatCount}</dd>
      </div>
    </dl>
  </article>

  <div class="grid gap-4 lg:grid-cols-2">
    {#each wizard.committees as committee (committee.id)}
      <CommitteeCard {committee} />
    {/each}
  </div>

  <Collapsible.Root bind:open={rolesOpen}>
    <article class="rounded-lg border p-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold">角色权限</h3>
        <Collapsible.Trigger
          aria-label={rolesOpen ? '收起角色权限' : '展开角色权限'}
          title={rolesOpen ? '收起角色权限' : '展开角色权限'}
          class={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'transition-transform',
            rolesOpen && 'rotate-180'
          )}
        >
          <ChevronDown />
          <span class="sr-only">{rolesOpen ? '收起角色权限' : '展开角色权限'}</span>
        </Collapsible.Trigger>
      </div>

      <Collapsible.Content>
        <div class="mt-3 flex flex-col gap-2">
          {#each wizard.roles as role (role.id)}
            <div class="rounded-md border px-3 py-2">
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-sm font-medium">{role.name}</span>
                <Badge variant="outline">{wizard.roleUsage().get(role.id) ?? 0} 个席位</Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {role.capabilities.map(capabilityLabel).join('、')}
              </p>
            </div>
          {/each}
        </div>
      </Collapsible.Content>
    </article>
  </Collapsible.Root>

  {#if wizard.createError}
    <p class="text-sm text-destructive" role="alert">{wizard.createError}</p>
  {/if}
</section>
