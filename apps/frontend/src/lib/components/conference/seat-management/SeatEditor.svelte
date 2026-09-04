<script lang="ts">
  import type { Capability, Seat } from '$lib/classes/types/delegate'
  import { CAPABILITY_OPTIONS } from '$lib/classes/types/delegate'
  import { addSeat, updateSeat } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'

  interface Props {
    seatGroupId: string
    editingSeat?: Seat | null
    onClose: () => void
  }

  let { seatGroupId, editingSeat, onClose }: Props = $props()

  let name = $state(editingSeat?.name ?? '')
  let role = $state(editingSeat?.role ?? '')

  // 能力覆盖：勾选 = 强制开启；未勾选 = 不写入覆盖（沿用席位组默认）
  let selectedCapabilities = $state<Set<Capability>>(
    new Set(
      editingSeat
        ? Object.entries(editingSeat.capabilityOverrides ?? {})
            .filter(([, enabled]) => enabled)
            .map(([capability]) => capability as Capability)
        : []
    )
  )

  function toggleCapability(capability: Capability): void {
    const next = new Set(selectedCapabilities)
    if (next.has(capability)) {
      next.delete(capability)
    } else {
      next.add(capability)
    }
    selectedCapabilities = next
  }

  function overridesFromSelection(): Partial<Record<Capability, boolean>> {
    return Object.fromEntries(
      CAPABILITY_OPTIONS.filter((option) => selectedCapabilities.has(option.value)).map(
        (option) => [option.value, true]
      )
    )
  }

  function handleSave(): void {
    const nameTrimmed = name.trim()
    if (!nameTrimmed) return

    const capabilityOverrides = overridesFromSelection()

    if (editingSeat) {
      updateSeat(editingSeat.id, {
        name: nameTrimmed,
        role: role.trim() || undefined,
        capabilityOverrides
      })
    } else {
      addSeat(nameTrimmed, seatGroupId, role.trim() || undefined, capabilityOverrides)
    }
    onClose()
  }
</script>

<div class="flex flex-col gap-4 rounded-lg border p-4">
  <h4 class="text-base font-semibold">
    {editingSeat ? '编辑席位' : '新建席位'}
  </h4>

  <Field.FieldGroup class="gap-3">
    <Field.Field>
      <Field.FieldLabel for="seat-name">席位名称</Field.FieldLabel>
      <Input id="seat-name" bind:value={name} placeholder="如：海军部长、新华社记者" />
    </Field.Field>

    <Field.Field>
      <Field.FieldLabel for="seat-role">职务/角色（可选）</Field.FieldLabel>
      <Input id="seat-role" bind:value={role} placeholder="如：外交部长" />
    </Field.Field>
  </Field.FieldGroup>

  <Field.FieldSet>
    <Field.FieldLegend variant="label">能力覆盖</Field.FieldLegend>
    <p class="-mt-2 text-xs text-muted-foreground">
      勾选 = 强制开启；不勾 = 不覆盖（沿用席位组默认）
    </p>
    <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {#each CAPABILITY_OPTIONS as option (option.value)}
        <label
          for={`seat-cap-${option.value}`}
          class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Checkbox
            id={`seat-cap-${option.value}`}
            checked={selectedCapabilities.has(option.value)}
            onCheckedChange={() => toggleCapability(option.value)}
          />
          <span class="min-w-0">{option.label}</span>
        </label>
      {/each}
    </div>
  </Field.FieldSet>

  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={onClose}>取消</Button>
    <Button onclick={handleSave} disabled={!name.trim()}>
      {editingSeat ? '保存' : '创建'}
    </Button>
  </div>
</div>
