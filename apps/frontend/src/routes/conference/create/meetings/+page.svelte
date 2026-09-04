<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import type { SeatGroupType } from '$lib/classes/types/delegate'
  import { Button } from '$lib/components/ui/button'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const typeLabels: Record<SeatGroupType, string> = {
    cabinet: '常规',
    mpc: 'MPC',
    ipc: 'IPC'
  }

  const showNoCommittees = $derived(wizard.attempted && wizard.committees.length === 0)
</script>

<section class="flex flex-col gap-4">
  {#if showNoCommittees}
    <Field.FieldError>至少添加一个会场</Field.FieldError>
  {/if}

  {#each wizard.committees as committee (committee.id)}
    {@const showNameError = wizard.attempted && committee.name.trim().length === 0}
    <article class="rounded-lg border p-4">
      <div class="grid items-start gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_11rem_auto]">
        <Field.Field data-invalid={showNameError}>
          <Field.FieldLabel for={`committee-name-${committee.id}`}>会场名称</Field.FieldLabel>
          <Input
            id={`committee-name-${committee.id}`}
            bind:value={committee.name}
            aria-invalid={showNameError || undefined}
            aria-describedby={showNameError ? `committee-name-error-${committee.id}` : undefined}
          />
          {#if showNameError}
            <Field.FieldError id={`committee-name-error-${committee.id}`}
              >会场名称不能为空</Field.FieldError
            >
          {/if}
        </Field.Field>

        <Field.Field>
          <Field.FieldLabel for={`committee-type-${committee.id}`}>类型</Field.FieldLabel>
          <Select.Select type="single" bind:value={committee.type}>
            <Select.SelectTrigger id={`committee-type-${committee.id}`} class="w-full">
              {typeLabels[committee.type]}
            </Select.SelectTrigger>
            <Select.SelectContent>
              <Select.SelectItem value="cabinet" label="常规" />
              <Select.SelectItem value="mpc" label="MPC" />
              <Select.SelectItem value="ipc" label="IPC" />
            </Select.SelectContent>
          </Select.Select>
        </Field.Field>

        <div class="flex items-center justify-end md:pt-6">
          <Button
            variant="ghost"
            size="icon"
            title="删除委员会"
            onclick={() => wizard.removeCommittee(committee.id)}
          >
            <Trash2 class="text-destructive" />
          </Button>
        </div>
      </div>
    </article>
  {/each}

  <Button variant="outline" class="w-fit" onclick={() => wizard.addCommittee()}>
    <Plus data-icon="inline-start" />
    添加会场
  </Button>
</section>
