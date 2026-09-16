<script lang="ts">
  import { Check, Copy, Pencil, RefreshCw } from '@lucide/svelte'
  import type { Seat, SeatAccess } from '$lib/classes/types/delegate'
  import { rotateSeatInviteCode, updateSeat } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Dialog from '$lib/components/ui/dialog'

  /**
   * committee-seat-table.svelte
   * ───────────────────────────
   * 席位表 —— 席位名称 / 简称 / 角色 / 访问 key，并就地提供
   * 复制 key、重新生成 key、重命名席位三个操作。
   * 依赖当前委员会已加载（updateSeat / rotateSeatInviteCode 作用于当前委员会）。
   */
  interface Props {
    seats: Seat[]
    /** 大会级访问记录，用于解析每个席位的邀请码 */
    seatAccesses?: SeatAccess[]
  }

  let { seats, seatAccesses = [] }: Props = $props()

  let copied = $state('')
  let editingSeat = $state<Seat | null>(null)
  let editorOpen = $state(false)
  let editName = $state('')

  function inviteCode(seatId: string): string {
    return seatAccesses.find((access) => access.seatId === seatId)?.inviteCode ?? ''
  }

  async function copyCode(code: string, seatId: string): Promise<void> {
    if (!code) return
    await navigator.clipboard.writeText(code)
    copied = seatId
    setTimeout(() => copied === seatId && (copied = ''), 1400)
  }

  function openEditor(seat: Seat): void {
    editingSeat = seat
    editName = seat.name
    editorOpen = true
  }

  function closeEditor(): void {
    editingSeat = null
    editorOpen = false
  }

  function saveName(): void {
    const seat = editingSeat
    const name = editName.trim()
    if (!seat || !name) return
    updateSeat(seat.id, { name })
    closeEditor()
  }
</script>

<div class="overflow-hidden rounded-lg border bg-card">
  <table class="w-full text-sm">
    <thead class="bg-muted/50 text-xs text-muted-foreground">
      <tr>
        <th class="px-4 py-3 text-left font-medium">席位</th>
        <th class="px-4 py-3 text-left font-medium">简称</th>
        <th class="px-4 py-3 text-left font-medium">角色</th>
        <th class="px-4 py-3 text-left font-medium">访问 key</th>
        <th class="px-4 py-3 text-right font-medium">操作</th>
      </tr>
    </thead>
    <tbody>
      {#each seats as seat (seat.id)}
        {@const code = inviteCode(seat.id)}
        <tr class="border-t">
          <td class="px-4 py-3 font-medium">{seat.name}</td>
          <td class="px-4 py-3 font-medium">{seat.shortName ?? '-'}</td>
          <td class="px-4 py-3 text-muted-foreground">{seat.role ?? '-'}</td>
          <td class="px-4 py-3"><code class="font-mono text-xs">{code || '未生成'}</code></td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="复制 key"
                aria-label="复制 key"
                disabled={!code}
                onclick={() => void copyCode(code, seat.id)}
              >
                {#if copied === seat.id}<Check />{:else}<Copy />{/if}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="重新生成 key"
                aria-label="重新生成 key"
                onclick={() => rotateSeatInviteCode(seat.id)}
              >
                <RefreshCw />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="重命名席位"
                aria-label="重命名席位"
                onclick={() => openEditor(seat)}
              >
                <Pencil />
              </Button>
            </div>
          </td>
        </tr>
      {:else}
        <tr>
          <td colspan="5" class="px-4 py-10 text-center text-muted-foreground">暂无席位</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<Dialog.Root bind:open={editorOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>重命名席位</Dialog.Title>
      <Dialog.Description>更新 host 和代表端看到的席位名称。</Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <Input
        bind:value={editName}
        aria-label="席位名称"
        onkeydown={(event) => event.key === 'Enter' && saveName()}
      />
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={closeEditor}>取消</Button>
      <Button disabled={!editName.trim()} onclick={saveName}>保存</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
