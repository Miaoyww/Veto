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

  const isSingleton = $derived(wizard.mode === 'singleton')
  const showNoCommittees = $derived(wizard.attempted && wizard.committees.length === 0)
  const singletonCommittee = $derived(isSingleton ? wizard.committees[0] ?? null : null)
</script>

<section class="flex flex-col gap-4">
  {#if isSingleton}
    <p class="text-sm text-muted-foreground">单例模式聚焦单一场会，会场数量已固定为一个。</p>
  {/if}

  {#if showNoCommittees}
    <Field.FieldError>至少添加一个会场</Field.FieldError>
  {/if}

  {#each wizard.committees as committee (committee.id)}
    {@const showNameError = wizard.attempted && committee.name.trim().length === 0}
    <article class="rounded-lg border p-4">
      <div
        class={isSingleton
          ? 'grid items-start gap-y-3'
          : 'grid items-start gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_11rem_auto]'}
      >
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

        {#if !isSingleton}
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
        {/if}

        {#if !isSingleton}
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
        {/if}
      </div>
    </article>
  {/each}

  {#if singletonCommittee}
    <article class="rounded-lg border p-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">会议议程</h2>
        <Button variant="outline" size="sm" onclick={() => wizard.addAgendaItem()}>
          <Plus data-icon="inline-start" />
          添加议程
        </Button>
      </div>

      <div class="mt-4 flex flex-col gap-3">
        {#each wizard.agendaItems as item (item.id)}
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input bind:value={item.title} placeholder="议程标题" aria-label="议程标题" />
            <Input
              bind:value={item.description}
              placeholder="议程说明（可选）"
              aria-label="议程说明"
            />
            <Button
              variant="ghost"
              size="icon"
              title="删除议程"
              onclick={() => wizard.removeAgendaItem(item.id)}
            >
              <Trash2 class="text-destructive" />
            </Button>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">暂无议程；可以创建后在主持端继续维护。</p>
        {/each}
      </div>
    </article>
  {/if}

  {#if !isSingleton}
    <Button variant="outline" class="w-fit" onclick={() => wizard.addCommittee()}>
      <Plus data-icon="inline-start" />
      添加会场
    </Button>
  {/if}
</section>
