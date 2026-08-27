<script lang="ts">
  import type { SeatGroup } from '$lib/types-delegate'
  import { seatGroups, removeSeatGroup } from '$lib/classes/stores/delegate/delegate-store'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Trash2, Edit3, Users } from '@lucide/svelte'

  interface Props {
    onEdit: (group: SeatGroup) => void
    onSelect: (group: SeatGroup) => void
    onCreateNew: () => void
    selectedId?: string
  }

  let { onEdit, onSelect, onCreateNew, selectedId }: Props = $props()

  const typeLabels: Record<string, string> = {
    cabinet: '内阁/委员会',
    mpc: 'MPC',
    ipc: '学团 IPC'
  }

  const typeBadgeVariants: Record<string, string> = {
    cabinet: 'default',
    mpc: 'secondary',
    ipc: 'outline'
  }

  function handleDelete(group: SeatGroup): void {
    removeSeatGroup(group.id)
  }
</script>

<div class="seat-group-list">
  <div class="header">
    <h3 class="text-lg font-semibold">席位组</h3>
    <Button size="sm" variant="outline" onclick={onCreateNew}>
      + 新建席位组
    </Button>
  </div>

  <div class="groups">
    {#each $seatGroups as group (group.id)}
      <button
        class="group-card"
        class:selected={selectedId === group.id}
        onclick={() => onSelect(group)}
      >
        <div class="group-info">
          <div class="group-name">
            <span>{group.name}</span>
            <Badge variant={typeBadgeVariants[group.type] ?? 'outline'}>
              {typeLabels[group.type] ?? group.type}
            </Badge>
            {#if group.mode}
              <Badge variant="secondary" class="mode-badge">
                {group.mode === 'crisis' ? '危机' : '常委'}
              </Badge>
            {/if}
          </div>
          <span class="text-xs text-muted-foreground">
            {group.defaultCapabilities.length} 项默认能力
          </span>
        </div>
        <div class="group-actions">
          <Button size="icon-sm" variant="ghost" onclick={(e) => { e.stopPropagation(); onEdit(group) }}>
            <Edit3 class="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onclick={(e) => { e.stopPropagation(); handleDelete(group) }}>
            <Trash2 class="size-4 text-destructive" />
          </Button>
        </div>
      </button>
    {/each}
    {#if $seatGroups.length === 0}
      <div class="empty-state">
        <Users class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">暂无席位组</p>
        <p class="text-xs text-muted-foreground">创建一个席位组来管理代表席位</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .seat-group-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .groups {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .group-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--background);
    cursor: pointer;
    transition: border-color 0.15s;
    text-align: left;
    width: 100%;
  }
  .group-card:hover {
    border-color: var(--primary);
  }
  .group-card.selected {
    border-color: var(--primary);
    background: var(--accent);
  }
  .group-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .group-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }
  .group-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .mode-badge {
    font-size: 0.65rem;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
  }
</style>
