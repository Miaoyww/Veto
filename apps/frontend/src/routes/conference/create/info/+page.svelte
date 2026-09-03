<script lang="ts">
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const showNameError = $derived(wizard.attempted && wizard.eventName.trim().length === 0)
</script>

<Field.FieldGroup>
  <Field.Field data-invalid={showNameError}>
    <Field.FieldLabel for="event-name">
      大会名称<span class="text-destructive"> *</span>
    </Field.FieldLabel>
    <Input
      id="event-name"
      bind:value={wizard.eventName}
      aria-invalid={showNameError || undefined}
      aria-describedby={showNameError ? 'event-name-error' : undefined}
    />
    {#if showNameError}
      <Field.FieldError id="event-name-error">请输入大会名称</Field.FieldError>
    {/if}
  </Field.Field>

  <Field.Field>
    <Field.FieldLabel for="organizer">主办方</Field.FieldLabel>
    <Input id="organizer" bind:value={wizard.organizer} placeholder="主办单位或组织" />
  </Field.Field>

  <Field.Field>
    <Field.FieldLabel for="event-description">大会说明</Field.FieldLabel>
    <Textarea
      id="event-description"
      bind:value={wizard.eventDescription}
      class="min-h-28"
      placeholder="大会主题、范围或备注"
    />
  </Field.Field>
</Field.FieldGroup>
