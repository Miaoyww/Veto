<script lang="ts">
  import { ChevronDown, Trash2 } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import type { RoleTemplate } from '$lib/classes/types/event'
  import { CAPABILITY_OPTIONS } from '$lib/classes/types/delegate'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import { Badge } from '$lib/components/ui/badge'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'

  let { role }: { role: RoleTemplate } = $props()

  const attempted = $derived(wizard.attempted)
  const showNameError = $derived(attempted && role.name.trim().length === 0)
  const showCapabilitiesError = $derived(
    attempted && role.capabilities.length === 0 && !showNameError
  )
  const usage = $derived(wizard.roleUsage().get(role.id) ?? 0)

  let open = $state(false)

  // 提交校验失败时自动展开权限区，保证错误信息可见
  $effect(() => {
    if (showCapabilitiesError) open = true
  })
</script>

<Collapsible.Root bind:open>
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
      <Badge variant={showCapabilitiesError ? 'destructive' : 'outline'}>
        {role.capabilities.length} 项权限
      </Badge>
      <Collapsible.Trigger
        aria-label={open ? '收起权限' : '展开权限'}
        title={open ? '收起权限' : '展开权限'}
        class={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'transition-transform',
          open && 'rotate-180'
        )}
      >
        <ChevronDown />
        <span class="sr-only">{open ? '收起权限' : '展开权限'}</span>
      </Collapsible.Trigger>
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

    <Collapsible.Content>
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
    </Collapsible.Content>
  </article>
</Collapsible.Root>
