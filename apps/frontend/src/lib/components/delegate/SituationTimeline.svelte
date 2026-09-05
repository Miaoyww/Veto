<script lang="ts">
  import type { SituationUpdate } from '../../../../../shared'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Clock, Globe, MapPin, Plus, Send, Undo2 } from '@lucide/svelte'

  interface Props {
    updates: SituationUpdate[]
    timelines: Array<{ id: string; name: string; simulationTime: number; status: string }>
    canPublish: boolean
    canWithdraw: boolean
    onPublish: (data: { title: string; content: string; timelineId: string }) => void
    onWithdraw: (situationId: string, reason: string) => void
  }

  let { updates, timelines, canPublish, canWithdraw, onPublish, onWithdraw }: Props = $props()

  let showForm = $state(false)
  let title = $state('')
  let content = $state('')
  let timelineId = $state('')
  let withdrawalReasons = $state<Record<string, string>>({})

  const sortedUpdates = $derived([...updates].sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt)))

  function publish(): void {
    if (!title.trim() || !content.trim() || !timelineId.trim()) return
    onPublish({ title: title.trim(), content: content.trim(), timelineId: timelineId.trim() })
    title = ''
    content = ''
    timelineId = ''
    showForm = false
  }
</script>

<div class="situation-timeline">
  <div class="panel-header">
    <h3 class="text-base font-semibold flex items-center gap-2"><Globe class="size-5" />局势更新</h3>
    {#if canPublish}
      <Button size="sm" variant="outline" onclick={() => { showForm = !showForm }}><Plus class="size-4 mr-1" />发布更新</Button>
    {/if}
  </div>

  {#if showForm && canPublish}
    <div class="situation-form">
      <div class="form-field"><Label for="situation-title">标题</Label><Input id="situation-title" bind:value={title} placeholder="局势标题" /></div>
      <div class="form-field">
        <Label for="timeline-id">时间线</Label>
        <select id="timeline-id" bind:value={timelineId} class="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">请选择时间线</option>
          {#each timelines as timeline (timeline.id)}
            <option value={timeline.id}>{timeline.name}</option>
          {/each}
        </select>
      </div>
      <div class="form-field"><Label for="situation-content">正文</Label><Textarea id="situation-content" bind:value={content} placeholder="局势更新内容" rows={4} /></div>
      <div class="form-actions">
        <Button size="sm" variant="outline" onclick={() => { showForm = false }}>取消</Button>
        <Button size="sm" disabled={!title.trim() || !content.trim() || !timelineId.trim()} onclick={publish}><Send class="size-4 mr-1" />直接发布</Button>
      </div>
    </div>
  {/if}

  <div class="timeline">
    {#each sortedUpdates as update (update.id)}
      <article class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="update-header">
            <h4 class="font-medium">{update.title}</h4>
            <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="size-3" />{new Date(update.publishedAt ?? update.createdAt).toLocaleString()}</span>
          </div>
          <p class="update-body">{update.content}</p>
          {#if update.timeline}
            <span class="text-xs text-muted-foreground">{update.timeline.name} · {new Date(update.timeline.simulationTime).toLocaleString()}</span>
          {/if}
          {#if update.relatedLocation}
            <div class="update-location"><MapPin class="size-3" /><span class="text-xs">{update.relatedLocation.label ?? `${update.relatedLocation.lat.toFixed(2)}, ${update.relatedLocation.lng.toFixed(2)}`}</span></div>
          {/if}
          {#if canWithdraw && update.status === 'published'}
            <div class="withdraw-row">
              <Input bind:value={withdrawalReasons[update.id]} placeholder="撤回原因" />
              <Button size="sm" variant="outline" disabled={!withdrawalReasons[update.id]?.trim()} onclick={() => onWithdraw(update.id, withdrawalReasons[update.id].trim())}>
                <Undo2 class="size-4 mr-1" />撤回
              </Button>
            </div>
          {/if}
        </div>
      </article>
    {:else}
      <div class="empty-state"><Globe class="size-8 text-muted-foreground" /><p class="text-sm text-muted-foreground">暂无局势更新</p></div>
    {/each}
  </div>
</div>

<style>
  .situation-timeline, .situation-form, .form-field, .timeline, .timeline-content { display: flex; flex-direction: column; }
  .situation-timeline { gap: 1rem; padding: 1rem; }
  .situation-form, .form-field, .timeline, .timeline-content { gap: 0.625rem; }
  .panel-header, .form-actions, .update-header, .withdraw-row, .update-location { display: flex; align-items: center; gap: 0.75rem; }
  .panel-header, .form-actions, .update-header { justify-content: space-between; }
  .situation-form, .timeline-content { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); }
  .timeline-item { display: flex; gap: 0.75rem; position: relative; }
  .timeline-dot { width: 10px; height: 10px; margin-top: 1.1rem; flex: 0 0 auto; border-radius: 50%; background: var(--primary); }
  .update-body { white-space: pre-wrap; font-size: 0.875rem; line-height: 1.6; }
  .update-location { color: var(--muted-foreground); }
  .withdraw-row :global(input) { flex: 1; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem; }
</style>
