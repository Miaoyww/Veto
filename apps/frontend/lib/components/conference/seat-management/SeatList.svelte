<script lang="ts">
  import type { Seat, SeatGroup } from '$lib/types-delegate'
  import { seats, removeSeat } from '$lib/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Trash2, Edit3, UserPlus, Copy, Eye } from '@lucide/svelte'
  import { derived } from 'svelte/store'

  interface Props {
    selectedGroup: SeatGroup | null
    onEdit: (seat: Seat) => void
    onCreateNew: () => void
    onShowInvite: (seat: Seat) => void
  }

  let { selectedGroup, onEdit, onCreateNew, onShowInvite }: Props = $props()

  const filteredSeats = derived(seats, ($seats) =>
    selectedGroup ? $seats.filter((s) => s.seatGroupId === selectedGroup.id) : $seats
  )
</script>

<div class="seat-list">
  <div class="header">
    <h4 class="text-base font-semibold">
      {selectedGroup ? `${selectedGroup.name} — 席位` : '席位'}
    </h4>
    {#if selectedGroup}
      <Button size="sm" variant="outline" onclick={onCreateNew}>
        <UserPlus class="size-4 mr-1" />
        新建席位
      </Button>
    {/if}
  </div>

  <div class="seats">
    {#each $filteredSeats as seat (seat.id)}
      <div class="seat-card">
        <div class="seat-info">
          <div class="seat-name">
            <span class="font-medium">{seat.name}</span>
            {#if seat.role}
              <Badge variant="secondary" class="text-xs">{seat.role}</Badge>
            {/if}
          </div>
          <div class="seat-meta">
            <span class="text-xs text-muted-foreground">
              邀请码: <code class="invite-code">{seat.inviteCode}</code>
            </span>
            <button class="copy-btn" onclick={() => onShowInvite(seat)} title="查看邀请信息">
              <Eye class="size-3" />
            </button>
          </div>
        </div>
        <div class="seat-actions">
          <Button size="icon-sm" variant="ghost" onclick={() => onEdit(seat)}>
            <Edit3 class="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onclick={() => removeSeat(seat.id)}>
            <Trash2 class="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    {/each}
    {#if $filteredSeats.length === 0}
      <div class="empty-state">
        <p class="text-sm text-muted-foreground">
          {selectedGroup ? '该席位组暂无席位' : '请先选择一个席位组'}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .seat-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .seats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .seat-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--background);
  }
  .seat-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .seat-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .seat-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .invite-code {
    font-family: monospace;
    letter-spacing: 0.05em;
    font-weight: 600;
    background: var(--muted);
    padding: 0.05rem 0.375rem;
    border-radius: 3px;
  }
  .copy-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--muted-foreground);
    border-radius: 3px;
  }
  .copy-btn:hover {
    color: var(--foreground);
    background: var(--muted);
  }
  .seat-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .empty-state {
    padding: 2rem;
    text-align: center;
  }
</style>
