<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import type { SeatGroupType } from '$lib/classes/types/delegate'
  import { Button } from '$lib/components/ui/button'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const typeLabels: Record<SeatGroupType, string> = {
    cabinet: '内阁 / 委员会',
    mpc: 'MPC'
  }

  const showNoMeetings = $derived(wizard.attempted && wizard.meetings.length === 0)
</script>

<section class="flex flex-col gap-4">
  {#if showNoMeetings}
    <Field.FieldError>至少添加一场小会议</Field.FieldError>
  {/if}

  {#each wizard.meetings as meeting (meeting.id)}
    {@const showNameError = wizard.attempted && meeting.name.trim().length === 0}
    <article class="rounded-lg border p-4">
      <div
        class="grid items-start gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_auto]"
      >
        <Field.Field data-invalid={showNameError}>
          <Field.FieldLabel for={`meeting-name-${meeting.id}`}>会议名称</Field.FieldLabel>
          <Input
            id={`meeting-name-${meeting.id}`}
            bind:value={meeting.name}
            aria-invalid={showNameError || undefined}
            aria-describedby={showNameError ? `meeting-name-error-${meeting.id}` : undefined}
          />
          {#if showNameError}
            <Field.FieldError id={`meeting-name-error-${meeting.id}`}
              >请输入会议名称</Field.FieldError
            >
          {/if}
        </Field.Field>

        <Field.Field>
          <Field.FieldLabel for={`meeting-venue-${meeting.id}`}>会场</Field.FieldLabel>
          <Input
            id={`meeting-venue-${meeting.id}`}
            bind:value={meeting.venue}
            placeholder="会场地址或房间"
          />
        </Field.Field>

        <Field.Field>
          <Field.FieldLabel for={`meeting-type-${meeting.id}`}>类型</Field.FieldLabel>
          <Select.Select type="single" bind:value={meeting.type}>
            <Select.SelectTrigger id={`meeting-type-${meeting.id}`} class="w-full">
              {typeLabels[meeting.type]}
            </Select.SelectTrigger>
            <Select.SelectContent>
              <Select.SelectItem value="cabinet" label="内阁 / 委员会" />
              <Select.SelectItem value="mpc" label="MPC" />
            </Select.SelectContent>
          </Select.Select>
        </Field.Field>

        <div class="flex items-center justify-end md:pt-6">
          <Button
            variant="ghost"
            size="icon"
            title="删除会议"
            onclick={() => wizard.removeMeeting(meeting.id)}
          >
            <Trash2 class="text-destructive" />
          </Button>
        </div>
      </div>
    </article>
  {/each}

  <Button variant="outline" class="w-fit" onclick={() => wizard.addMeeting()}>
    <Plus data-icon="inline-start" />
    添加分会议
  </Button>
</section>
