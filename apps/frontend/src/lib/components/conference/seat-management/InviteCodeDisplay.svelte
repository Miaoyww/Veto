<script lang="ts">
  import type { Seat } from '$lib/types-delegate'
  import { Button } from '$lib/components/ui/button'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog'
  import { Copy, Check } from '@lucide/svelte'

  interface Props {
    seat: Seat | null
    conferenceId: string
    onClose: () => void
  }

  let { seat, conferenceId, onClose }: Props = $props()

  let copied = $state(false)

  function copyInviteInfo(): void {
    if (!seat) return
    const text = [
      `会议 ID: ${conferenceId}`,
      `席位: ${seat.name}`,
      `邀请码: ${seat.inviteCode}`,
      `密码: （已设置）`,
      ``,
      `加入方式：`,
      `1. 打开 Veto 应用`,
      `2. 在首页点击"加入会议"`,
      `3. 输入邀请码和密码`
    ].join('\n')

    navigator.clipboard.writeText(text)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function copyInviteCode(): void {
    if (!seat) return
    navigator.clipboard.writeText(seat.inviteCode)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
</script>

{#if seat}
  <Dialog open={true} onOpenChange={() => onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>邀请信息 — {seat.name}</DialogTitle>
        <DialogDescription>
          将此信息发送给参会代表，他们可以使用邀请码和密码加入会议。
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
            <code class="invite-code-large">{seat.inviteCode}</code>
            <Button size="icon-sm" variant="ghost" onclick={copyInviteCode}>
              {#if copied}
                <Check class="size-4 text-green-500" />
              {:else}
                <Copy class="size-4" />
              {/if}
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
