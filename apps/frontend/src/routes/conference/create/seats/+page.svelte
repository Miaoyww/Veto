<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const showInvalidRole = $derived(
    wizard.attempted &&
      wizard.roles.length > 0 &&
      wizard.committees.some((committee) =>
        committee.seats.some((seat) => !wizard.roles.some((role) => role.id === seat.roleId))
      )
  )
</script>

<section class="flex flex-col gap-4">
  {#each wizard.committees as committee (committee.id)}
    {@const showNoSeats = wizard.attempted && committee.seats.length === 0}
    <article class="rounded-lg border p-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="truncate text-sm font-semibold">{committee.name || '未命名委员会'}</h2>
        <Button variant="outline" size="sm" onclick={() => wizard.addSeat(committee.id)}>
          <Plus data-icon="inline-start" />
          添加席位
        </Button>
      </div>

      <div class="mt-3 flex flex-col gap-2">
        {#each committee.seats as seat (seat.id)}
          {@const showSeatNameError = wizard.attempted && seat.name.trim().length === 0}
          <div class="flex flex-col gap-1">
            <div class="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_15rem_2.5rem]">
              <Input
                bind:value={seat.name}
                placeholder="席位名称"
                aria-label="席位名称"
                aria-invalid={showSeatNameError || undefined}
              />
              <Select.Select type="single" bind:value={seat.roleId}>
                <Select.SelectTrigger class="w-full" aria-label="角色">
                  {wizard.roleName(seat.roleId)}
                </Select.SelectTrigger>
                <Select.SelectContent>
                  {#each wizard.roles as role (role.id)}
                    <Select.SelectItem value={role.id} label={role.name || '未命名角色'} />
                  {/each}
                </Select.SelectContent>
              </Select.Select>
              <Button
                variant="ghost"
                size="icon"
                title="删除席位"
                onclick={() => wizard.removeSeat(committee.id, seat.id)}
              >
                <Trash2 class="text-destructive" />
              </Button>
            </div>
            {#if showSeatNameError}
              <Field.FieldError>请输入席位名称</Field.FieldError>
            {/if}
          </div>
        {:else}
          <p
            class="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground"
          >
            尚未分配席位
          </p>
        {/each}
      </div>

      {#if showNoSeats}
        <Field.FieldError class="mt-1">每个委员会至少分配一个席位</Field.FieldError>
      {/if}
      {#if showInvalidRole}
        <Field.FieldError class="mt-1">存在未匹配到角色的席位，请重新选择角色</Field.FieldError>
      {/if}
    </article>
  {/each}
</section>
