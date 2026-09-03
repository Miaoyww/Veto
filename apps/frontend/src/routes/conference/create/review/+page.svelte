<script lang="ts">
  import { CAPABILITY_LABELS } from '$lib/classes/types/delegate'
  import type { Capability } from '$lib/classes/types/delegate'
  import { Badge } from '$lib/components/ui/badge'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const capabilityLabel = (capability: Capability): string =>
    CAPABILITY_LABELS[capability] ?? capability
</script>

<section class="flex flex-col gap-5">
  <article class="rounded-lg border p-4">
    <h2 class="truncate text-sm font-semibold">{wizard.eventName || '未命名大会'}</h2>
    <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt class="text-xs text-muted-foreground">小会议</dt>
        <dd class="mt-1 font-medium">{wizard.meetings.length}</dd>
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
    {#each wizard.meetings as meeting (meeting.id)}
      <article class="rounded-lg border p-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="truncate text-sm font-semibold">{meeting.name}</h3>
          <Badge variant="outline">{meeting.seats.length} 个席位</Badge>
        </div>
        <ul class="mt-3 flex flex-col gap-2 text-sm">
          {#each meeting.seats as seat (seat.id)}
            <li class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <span class="min-w-0 flex-1 truncate">{seat.name}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{wizard.roleName(seat.roleId)}</span>
            </li>
          {/each}
        </ul>
      </article>
    {/each}
  </div>

  <article class="rounded-lg border p-4">
    <h3 class="text-sm font-semibold">角色权限</h3>
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
  </article>

  {#if wizard.createError}
    <p class="text-sm text-destructive" role="alert">{wizard.createError}</p>
  {/if}
</section>
