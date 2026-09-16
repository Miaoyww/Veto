<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Check, Copy, Pencil, RefreshCw, Trash2, X } from '@lucide/svelte'
  import type { Seat, SeatAccess } from '$lib/classes/types/delegate'
  import {
    removeSeat,
    rotateSeatInviteCode,
    updateSeat
  } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import TextAnimate from '$lib/components/ui/text-animate.svelte'

  /**
   * committee-seat-table.svelte
   * ───────────────────────────
   * 席位表 —— 席位名称 / 简称 / 角色 / 访问 key，并就地提供
   * 复制 key、重新生成 key、编辑和删除席位等操作。
   * 依赖当前委员会已加载（席位操作均作用于当前委员会）。
   */
  interface Props {
    seats: Seat[]
    /** 大会级访问记录，用于解析每个席位的邀请码 */
    seatAccesses?: SeatAccess[]
  }

  let { seats, seatAccesses = [] }: Props = $props()

  let copied = $state('')
  let editingSeatId = $state('')
  let editName = $state('')
  let editShortName = $state('')
  let deleteConfirmSeatId = $state('')
  let deleteConfirmTimer: ReturnType<typeof setTimeout> | undefined

  function inviteCode(seatId: string): string {
    return seatAccesses.find((access) => access.seatId === seatId)?.inviteCode ?? ''
  }

  async function copyCode(code: string, seatId: string): Promise<void> {
    if (!code) return
    await navigator.clipboard.writeText(code)
    copied = seatId
    setTimeout(() => copied === seatId && (copied = ''), 1400)
  }

  function startEditing(seat: Seat): void {
    clearDeleteConfirmation()
    editingSeatId = seat.id
    editName = seat.name
    editShortName = seat.shortName ?? ''
  }

  function cancelEditing(): void {
    editingSeatId = ''
    editName = ''
    editShortName = ''
  }

  function saveSeat(seat: Seat): void {
    const name = editName.trim()
    if (!name) return
    updateSeat(seat.id, { name, shortName: editShortName.trim() || undefined })
    cancelEditing()
  }

  function handleEditorKeydown(event: KeyboardEvent, seat: Seat): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveSeat(seat)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
    }
  }

  function clearDeleteConfirmation(): void {
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = undefined
    deleteConfirmSeatId = ''
  }

  function handleDelete(seat: Seat): void {
    if (deleteConfirmSeatId !== seat.id) {
      clearDeleteConfirmation()
      deleteConfirmSeatId = seat.id
      deleteConfirmTimer = setTimeout(clearDeleteConfirmation, 3000)
      return
    }

    clearDeleteConfirmation()
    if (editingSeatId === seat.id) cancelEditing()
    removeSeat(seat.id)
  }

  onDestroy(clearDeleteConfirmation)
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
          <td class="px-4 py-3 font-medium">
            {#if editingSeatId === seat.id}
              <Input
                bind:value={editName}
                aria-label="席位名称"
                onkeydown={(event) => handleEditorKeydown(event, seat)}
              />
            {:else}
              {seat.name}
            {/if}
          </td>
          <td class="px-4 py-3 font-medium">
            {#if editingSeatId === seat.id}
              <Input
                bind:value={editShortName}
                aria-label="席位简称"
                placeholder="可选"
                onkeydown={(event) => handleEditorKeydown(event, seat)}
              />
            {:else}
              {seat.shortName ?? '-'}
            {/if}
          </td>
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
              {#if editingSeatId === seat.id}
                <Button
                  variant="ghost"
                  size="icon"
                  title="取消编辑"
                  aria-label="取消编辑"
                  onclick={cancelEditing}
                >
                  <X />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="保存席位"
                  aria-label="保存席位"
                  disabled={!editName.trim()}
                  onclick={() => saveSeat(seat)}
                >
                  <Check />
                </Button>
              {:else}
                <Button
                  variant="ghost"
                  size="icon"
                  title="编辑席位"
                  aria-label="编辑席位"
                  onclick={() => startEditing(seat)}
                >
                  <Pencil />
                </Button>
              {/if}
              <Button
                variant={deleteConfirmSeatId === seat.id ? 'destructive' : 'ghost'}
                size="sm"
                title="双击以删除席位"
                onclick={() => handleDelete(seat)}
              >
                <Trash2 data-icon="inline-start" />
                {#key deleteConfirmSeatId === seat.id}
                  删除
                {/key}
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
