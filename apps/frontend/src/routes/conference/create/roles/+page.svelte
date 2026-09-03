<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import { CAPABILITY_OPTIONS } from '$lib/classes/types/delegate'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'

  const showNoRoles = $derived(wizard.attempted && wizard.roles.length === 0)
</script>

<section class="flex flex-col gap-4">
  {#if showNoRoles}
    <Field.FieldError>至少添加一个角色</Field.FieldError>
  {/if}

  {#each wizard.roles as role (role.id)}
    {@const showNameError = wizard.attempted && role.name.trim().length === 0}
    {@const showCapabilitiesError =
      wizard.attempted && role.capabilities.length === 0 && !showNameError}
    {@const usage = wizard.roleUsage().get(role.id) ?? 0}
    <article class="rounded-lg border p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex min-w-60 flex-1 flex-col gap-1.5">
          <Input
            bind:value={role.name}
            placeholder="角色名称"
            aria-label="角色名称"
            aria-invalid={showNameError || undefined}
            class="max-w-72"
          />
          {#if showNameError}
            <Field.FieldError>请输入角色名称</Field.FieldError>
          {/if}
        </div>
        <Badge variant="outline">{role.capabilities.length} 项权限</Badge>
        <Button
          variant="ghost"
          size="icon"
          title={usage > 0 ? '角色已被席位使用' : '删除角色'}
          disabled={usage > 0}
          onclick={() => wizard.removeRole(role.id)}
        >
          <Trash2 class="text-destructive" />
        </Button>
      </div>

      <Field.FieldSet class="mt-4">
        <Field.FieldLegend variant="label">权限</Field.FieldLegend>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {#each CAPABILITY_OPTIONS as option (option.value)}
            <label
              for={`capability-${role.id}-${option.value}`}
              class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[[data-slot='checkbox']]:hover:bg-accent/50"
            >
              <Checkbox
                id={`capability-${role.id}-${option.value}`}
                checked={role.capabilities.includes(option.value)}
                onCheckedChange={() => wizard.toggleCapability(role.id, option.value)}
              />
              <span class="min-w-0">{option.label}</span>
            </label>
          {/each}
        </div>
        {#if showCapabilitiesError}
          <Field.FieldError>请至少勾选一项权限</Field.FieldError>
        {/if}
      </Field.FieldSet>
    </article>
  {/each}

  <Button variant="outline" class="w-fit" onclick={() => wizard.addRole()}>
    <Plus data-icon="inline-start" />
    添加角色
  </Button>
</section>
