<script lang="ts">
  import type { Seat } from '$lib/classes/types/delegate'
  import { Button } from '$lib/components/ui/button'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog'
  import { Copy, Check, RefreshCw } from '@lucide/svelte'
  import { currentConferenceRecord } from '$lib/classes/stores/conference/conference-store'
  import { rotateSeatInviteCode } from '$lib/classes/stores/delegate/delegate-store'

  interface Props {
    seat: Seat | null
    conferenceId: string
    onClose: () => void
  }

  let { seat, conferenceId, onClose }: Props = $props()

  let copied = $state(false)
  const inviteCode = $derived(
    seat
      ? ($currentConferenceRecord?.seatAccesses.find((access) => access.seatId === seat.id)
          ?.inviteCode ?? '')
      : ''
  )
  const user = $derived(
    seat?.userId
      ? $currentConferenceRecord?.users.find((item) => item.id === seat.userId)
      : undefined
  )

  function copyInviteInfo(): void {
    if (!seat) return
    const text = [
      `会议 ID: ${conferenceId}`,
      `席位: ${seat.name}`,
      `邀请码: ${inviteCode}`,
      `密码: ${user?.passwordHash ? '使用者已设置' : '未设置，仅凭邀请码连接'}`,
      ``,
      `加入方式：`,
      `1. 打开 Veto 应用`,
      `2. 在首页点击"加入会议"`,
      `3. 输入邀请码、姓名和可选密码`
    ].join('\n')

    navigator.clipboard.writeText(text)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function copyInviteCode(): void {
    if (!seat) return
    navigator.clipboard.writeText(inviteCode)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function rotateInviteCode(): void {
    if (!seat) return
    rotateSeatInviteCode(seat.id)
    copied = false
  }
</script>

{#if seat}
  <Dialog open={true} onOpenChange={() => onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>邀请信息 — {seat.name}</DialogTitle>
        <DialogDescription>
          将此信息发送给参会者。首次连接时会认领席位并创建用户。
        </DialogDescription>
      </DialogHeader>

      <div class="invite-details">
        <div class="detail-row">
          <span class="detail-label">席位</span>
          <span class="detail-value">{seat.name}</span>
        </div>
        {#if seat.role}
          <div class="detail-row">
            <span class="detail-label">职务</span>
            <span class="detail-value">{seat.role}</span>
          </div>
        {/if}
        <div class="detail-row">
          <span class="detail-label">邀请码</span>
          <div class="code-row">
            <code class="invite-code-large">{inviteCode}</code>
            <Button size="icon-sm" variant="ghost" onclick={copyInviteCode}>
              {#if copied}
                <Check class="size-4 text-green-500" />
              {:else}
                <Copy class="size-4" />
              {/if}
            </Button>
            <Button size="icon-sm" variant="ghost" title="轮换邀请码" onclick={rotateInviteCode}>
              <RefreshCw class="size-4" />
            </Button>
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-label">会议 ID</span>
          <span class="detail-value text-xs font-mono">{conferenceId}</span>
        </div>
      </div>

      <div class="invite-actions">
        <Button variant="outline" onclick={onClose}>关闭</Button>
        <Button onclick={copyInviteInfo}>
          <Copy class="size-4 mr-1" />
          复制邀请信息
        </Button>
      </div>
    </DialogContent>
  </Dialog>
{/if}

<style>
  .invite-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }
  .detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .detail-label {
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }
  .detail-value {
    font-weight: 500;
  }
  .code-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .invite-code-large {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    font-family: monospace;
    background: var(--muted);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius);
  }
  .invite-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
