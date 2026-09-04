<script lang="ts">
  import type { SituationUpdate } from '$lib/classes/types/delegate'
  import { Clock, MapPin, Globe } from '@lucide/svelte'

  interface Props {
    updates: SituationUpdate[]
  }

  let { updates }: Props = $props()

  const sortedUpdates = $derived(
    [...updates].sort((a, b) => b.createdAt - a.createdAt)
  )
</script>

<div class="situation-timeline">
  <h3 class="text-base font-semibold flex items-center gap-2 px-4 pt-4">
    <Globe class="size-5" />
    局势更新
  </h3>

  <div class="timeline">
    {#each sortedUpdates as update (update.id)}
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="update-header">
            <h4 class="font-medium">{update.title}</h4>
            <span class="text-xs text-muted-foreground flex items-center gap-1">
              <Clock class="size-3" />
              {new Date(update.createdAt).toLocaleString()}
            </span>
          </div>
          <div class="update-body">
            {update.content}
          </div>
          {#if update.relatedLocation}
            <div class="update-location">
              <MapPin class="size-3" />
              <span class="text-xs">
                {update.relatedLocation.label ?? `${update.relatedLocation.lat.toFixed(2)}, ${update.relatedLocation.lng.toFixed(2)}`}
              </span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    {#if sortedUpdates.length === 0}
      <div class="empty-state">
        <Globe class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">暂无局势更新</p>
        <p class="text-xs text-muted-foreground">等待 IPC 发布</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .situation-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .timeline {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1.5rem 2rem;
  }
  .timeline-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    position: relative;
  }
  .timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 0.3125rem;
    top: 1.75rem;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }
  .timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary);
    margin-top: 0.375rem;
    flex-shrink: 0;
  }
  .timeline-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
  }
  .update-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .update-body {
    font-size: 0.875rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .update-location {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--muted-foreground);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 3rem;
  }
</style>
