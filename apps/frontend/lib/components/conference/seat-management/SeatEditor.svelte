<script lang="ts">
  import type { Seat, Capability } from '$lib/types-delegate'
  import { addSeat, updateSeat, setSeatPassword } from '$lib/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  interface Props {
    seatGroupId: string
    editingSeat?: Seat | null
    onClose: () => void
  }

  let { seatGroupId, editingSeat, onClose }: Props = $props()

  let name = $state(editingSeat?.name ?? '')
  let role = $state(editingSeat?.role ?? '')
  let password = $state('')
  let passwordConfirm = $state('')
  let passwordError = $state('')

  // Simplified capability overrides
  let overrideCaps = $state<Record<string, boolean>>({})

  const allCapabilities: Array<{ value: Capability; label: string }> = [
    { value: 'view_conference', label: '查看会议' },
    { value: 'draft_news', label: '起草新闻' },
    { value: 'review_news', label: '审核新闻' },
    { value: 'submit_directive', label: '提交指令' },
    { value: 'process_directive', label: '处理指令' },
    { value: 'publish_situation', label: '发布局势更新' },
    { value: 'control_conference', label: '控制会议' }
  ]

  function handleSave(): void {
    const nameTrimmed = name.trim()
    if (!nameTrimmed) return

    // Validate password if set
    if (password && password !== passwordConfirm) {
      passwordError = '两次密码不一致'
      return
    }
    passwordError = ''

    if (editingSeat) {
      updateSeat(editingSeat.id, {
        name: nameTrimmed,
        role: role.trim() || undefined,
        capabilityOverrides: overrideCaps as Partial<Record<Capability, boolean>>
      })
      if (password) {
        // Simple client-side hash - in production this would use the main process crypto
        setSeatPassword(editingSeat.id, password, '')
      }
    } else {
      const seatId = addSeat(nameTrimmed, seatGroupId, role.trim() || undefined)
      if (password && seatId) {
        setSeatPassword(seatId, password, '')
      }
    }
    onClose()
  }
</script>

<div class="seat-editor">
  <h4 class="text-base font-semibold">
    {editingSeat ? '编辑席位' : '新建席位'}
  </h4>

  <div class="form-field">
    <Label for="seat-name">席位名称</Label>
    <Input id="seat-name" bind:value={name} placeholder="如：海军部长、新华社记者" />
  </div>

  <div class="form-field">
    <Label for="seat-role">职务/角色（可选）</Label>
    <Input id="seat-role" bind:value={role} placeholder="如：外交部长" />
  </div>

  {#if !editingSeat}
    <div class="form-field">
      <Label for="seat-password">密码（可选）</Label>
      <Input
        id="seat-password"
        type="password"
        bind:value={password}
        placeholder="设置代表登录密码"
      />
    </div>
    {#if password}
      <div class="form-field">
        <Label for="seat-password-confirm">确认密码</Label>
        <Input
          id="seat-password-confirm"
          type="password"
          bind:value={passwordConfirm}
          placeholder="再次输入密码"
        />
        {#if passwordError}
          <span class="text-xs text-destructive">{passwordError}</span>
        {/if}
      </div>
    {/if}
  {/if}

  <div class="editor-actions">
    <Button variant="outline" onclick={onClose}>取消</Button>
    <Button onclick={handleSave} disabled={!name.trim()}>
      {editingSeat ? '保存' : '创建'}
    </Button>
  </div>
</div>

<style>
  .seat-editor {
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
  .editor-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
