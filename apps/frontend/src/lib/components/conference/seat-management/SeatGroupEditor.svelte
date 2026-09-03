<script lang="ts">
  import type { SeatGroup, SeatGroupType, Capability } from '$lib/classes/types/delegate'
  import { addSeatGroup, updateSeatGroup } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select'

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

  const allCapabilities: Array<{ value: Capability; label: string }> = [
    { value: 'view_conference', label: '查看会议' },
    { value: 'draft_news', label: '起草新闻' },
    { value: 'review_news', label: '审核新闻' },
    { value: 'submit_directive', label: '提交指令' },
    { value: 'process_directive', label: '处理指令' },
    { value: 'publish_situation', label: '发布局势更新' },
    { value: 'control_conference', label: '控制会议' },
    { value: 'draft_resolution', label: '起草决议' },
    { value: 'internal_vote', label: '内部投票' }
  ]

  function toggleCapability(cap: Capability): void {
    const next = new Set(selectedCapabilities)
    if (next.has(cap)) {
      next.delete(cap)
    } else {
      next.add(cap)
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

<div class="seat-group-editor">
  <h4 class="text-base font-semibold">
    {editingGroup ? '编辑席位组' : '新建席位组'}
  </h4>

  <div class="form-field">
    <Label for="sg-name">名称</Label>
    <Input id="sg-name" bind:value={name} placeholder="如：美国内阁、MPC、学团 IPC" />
  </div>

  <div class="form-field">
    <Label for="sg-type">类型</Label>
    <Select bind:value={type}>
      <SelectTrigger id="sg-type">
        {type === 'cabinet' ? '内阁/委员会' : type === 'mpc' ? 'MPC（新闻中心）' : '学团 IPC'}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cabinet" label="内阁/委员会" />
        <SelectItem value="mpc" label="MPC（新闻中心）" />
        <SelectItem value="ipc" label="学团 IPC" />
      </SelectContent>
    </Select>
  </div>

  <div class="form-field">
    <Label>默认能力</Label>
    <div class="capability-grid">
      {#each allCapabilities as cap (cap.value)}
        <label class="capability-item">
          <input
            type="checkbox"
            checked={selectedCapabilities.has(cap.value)}
            onchange={() => toggleCapability(cap.value)}
          />
          <span class="text-sm">{cap.label}</span>
        </label>
      {/each}
    </div>
  </div>

  <div class="editor-actions">
    <Button variant="outline" onclick={onClose}>取消</Button>
    <Button onclick={handleSave} disabled={!name.trim()}>
      {editingGroup ? '保存' : '创建'}
    </Button>
  </div>
</div>

<style>
  .seat-group-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .capability-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }
  .capability-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .editor-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
