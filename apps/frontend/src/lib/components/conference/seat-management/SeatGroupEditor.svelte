<script lang="ts">
  import type { Capability, SeatGroup, SeatGroupType } from '$lib/classes/types/delegate'
  import { CAPABILITY_OPTIONS } from '$lib/classes/types/delegate'
  import { addSeatGroup, updateSeatGroup } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'

  interface Props {
    editingGroup?: SeatGroup | null
    onClose: () => void
  }

  let { editingGroup, onClose }: Props = $props()

  let name = $state(editingGroup?.name ?? '')
  let type = $state<SeatGroupType>(editingGroup?.type ?? 'cabinet')
  let selectedCapabilities = $state<Set<Capability>>(
    new Set(editingGroup?.defaultCapabilities ?? ['view_conference'])
  )

  const typeLabels: Record<SeatGroupType, string> = {
    cabinet: '内阁 / 委员会',
    mpc: 'MPC（新闻中心）'
  }

  function toggleCapability(capability: Capability): void {
    const next = new Set(selectedCapabilities)
    if (next.has(capability)) {
      next.delete(capability)
    } else {
      next.add(capability)
    }
    selectedCapabilities = next
  }

  function handleSave(): void {
    const nameTrimmed = name.trim()
    if (!nameTrimmed) return

    if (editingGroup) {
      updateSeatGroup(editingGroup.id, {
        name: nameTrimmed,
        type,
        defaultCapabilities: Array.from(selectedCapabilities)
      })
    } else {
      addSeatGroup(nameTrimmed, type, Array.from(selectedCapabilities))
    }
    onClose()
  }
</script>

<div class="flex flex-col gap-4 rounded-lg border p-4">
  <h4 class="text-base font-semibold">
    {editingGroup ? '编辑席位组' : '新建席位组'}
  </h4>

  <Field.FieldGroup class="gap-3">
    <Field.Field>
      <Field.FieldLabel for="sg-name">名称</Field.FieldLabel>
      <Input id="sg-name" bind:value={name} placeholder="如：美国内阁、MPC、学团 IPC" />
    </Field.Field>

    <Field.Field>
      <Field.FieldLabel for="sg-type">类型</Field.FieldLabel>
      <Select.Select type="single" bind:value={type}>
        <Select.SelectTrigger id="sg-type" class="w-full">
          {typeLabels[type]}
        </Select.SelectTrigger>
        <Select.SelectContent>
          <Select.SelectItem value="cabinet" label="内阁 / 委员会" />
          <Select.SelectItem value="mpc" label="MPC（新闻中心）" />
        </Select.SelectContent>
      </Select.Select>
    </Field.Field>
  </Field.FieldGroup>

  <Field.FieldSet>
    <Field.FieldLegend variant="label">默认能力</Field.FieldLegend>
    <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {#each CAPABILITY_OPTIONS as option (option.value)}
        <label
          for={`sg-cap-${option.value}`}
          class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Checkbox
            id={`sg-cap-${option.value}`}
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
      {editingGroup ? '保存' : '创建'}
    </Button>
  </div>
</div>
