<script lang="ts">
  import type { Directive, DirectiveStatus } from '../../../../../shared'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { CheckCircle2, Clock, FileText, Plus, Send, XCircle } from '@lucide/svelte'

  interface Props {
    directives: Directive[]
    workflowDirectives: Directive[]
    targets: Array<{ id: string; name: string }>
    seatId: string
    canSubmit: boolean
    canProcess: boolean
    onSubmit: (data: { title: string; content: string; targetCommitteeId: string }) => void
    onClaim: (directiveId: string) => void
    onApprove: (directiveId: string, processingNote: string) => void
    onReject: (directiveId: string, processingNote: string) => void
    onCancel: (directiveId: string, reason?: string) => void
  }

  let {
    directives,
    workflowDirectives,
    targets,
    seatId,
    canSubmit,
    canProcess,
    onSubmit,
    onClaim,
    onApprove,
    onReject,
    onCancel
  }: Props = $props()

  let showForm = $state(false)
  let title = $state('')
  let content = $state('')
  let targetCommitteeId = $state('')
  let notes = $state<Record<string, string>>({})
  let cancellationReasons = $state<Record<string, string>>({})

  const statusLabels: Record<DirectiveStatus, string> = {
    submitted: '待处理',
    processing: '处理中',
    approved: '已批准',
    rejected: '已驳回',
    cancelled: '已取消'
  }

  const statusVariant: Record<DirectiveStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    submitted: 'default',
    processing: 'secondary',
    approved: 'outline',
    rejected: 'destructive',
    cancelled: 'secondary'
  }

  function submit(): void {
    if (!title.trim() || !content.trim() || !targetCommitteeId.trim()) return
    onSubmit({ title: title.trim(), content: content.trim(), targetCommitteeId: targetCommitteeId.trim() })
    title = ''
    content = ''
    targetCommitteeId = ''
    showForm = false
  }

  function noteFor(id: string): string {
    return notes[id]?.trim() ?? ''
  }
</script>

<div class="directive-panel">
  <div class="panel-header">
    <h3 class="text-base font-semibold flex items-center gap-2"><FileText class="size-5" />指令</h3>
    {#if canSubmit}
      <Button size="sm" variant="outline" onclick={() => { showForm = !showForm }}>
        <Plus class="size-4 mr-1" />新建指令
      </Button>
    {/if}
  </div>

  {#if showForm && canSubmit}
    <div class="directive-form">
      <div class="form-field">
        <Label for="directive-title">标题</Label>
        <Input id="directive-title" bind:value={title} placeholder="指令标题" />
      </div>
      <div class="form-field">
        <Label for="directive-committee">目标委员会</Label>
        <select id="directive-committee" bind:value={targetCommitteeId} class="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">请选择一个委员会</option>
          {#each targets as target (target.id)}
            <option value={target.id}>{target.name}</option>
          {/each}
        </select>
      </div>
      <div class="form-field">
        <Label for="directive-content">正文</Label>
        <Textarea id="directive-content" bind:value={content} placeholder="指令内容" rows={4} />
      </div>
      <div class="form-actions">
        <Button size="sm" variant="outline" onclick={() => { showForm = false }}>取消</Button>
        <Button size="sm" disabled={!title.trim() || !content.trim() || !targetCommitteeId.trim()} onclick={submit}>
          <Send class="size-4 mr-1" />提交
        </Button>
      </div>
    </div>
  {/if}

  <div class="section">
    <h4 class="text-sm font-semibold text-muted-foreground">已授权指令</h4>
    {#each directives as directive (directive.id)}
      <article class="directive-card">
        <div class="directive-header">
          <span class="font-medium">{directive.title}</span>
          <Badge variant={statusVariant[directive.status]}>{statusLabels[directive.status]}</Badge>
        </div>
        <p class="text-sm text-muted-foreground">{directive.content}</p>
        <div class="directive-meta">
          <span>目标委员会：{directive.targetCommitteeId}</span>
          <span><Clock class="size-3" />{new Date(directive.createdAt).toLocaleString()}</span>
        </div>
        {#if directive.author}
          <span class="text-xs text-muted-foreground">{directive.author.committeeName} · {directive.author.seatName}{directive.author.role ? `（${directive.author.role}）` : ''}</span>
        {/if}
        {#if directive.processingNote}
          <p class="processing-note">处理说明：{directive.processingNote}</p>
        {/if}
        {#if directive.status === 'submitted' && directive.sourceSeatId === seatId}
          <div class="cancel-row">
            <Input bind:value={cancellationReasons[directive.id]} placeholder="取消原因（可选）" />
            <Button size="sm" variant="outline" onclick={() => onCancel(directive.id, cancellationReasons[directive.id]?.trim() || undefined)}>取消指令</Button>
          </div>
        {/if}
      </article>
    {:else}
      <div class="empty-state"><FileText class="size-8 text-muted-foreground" /><p class="text-sm text-muted-foreground">暂无授权指令</p></div>
    {/each}
  </div>

  {#if canProcess}
    <div class="section">
      <h4 class="text-sm font-semibold text-muted-foreground">处理队列</h4>
      {#each workflowDirectives as directive (directive.id)}
        <article class="directive-card workflow">
          <div class="directive-header">
            <span class="font-medium">{directive.title}</span>
            <Badge variant={statusVariant[directive.status]}>{statusLabels[directive.status]}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">{directive.content}</p>
          <span class="text-xs text-muted-foreground">目标委员会：{directive.targetCommitteeId}</span>
          {#if directive.status === 'submitted'}
            <Button size="sm" onclick={() => onClaim(directive.id)}>认领处理</Button>
          {:else if directive.status === 'processing' && directive.claimedBySeatId === seatId}
            <div class="form-field">
              <Label for={`directive-note-${directive.id}`}>处理说明</Label>
              <Textarea id={`directive-note-${directive.id}`} bind:value={notes[directive.id]} rows={2} placeholder="批准或驳回说明" />
            </div>
            <div class="form-actions">
              <Button size="sm" variant="outline" disabled={!noteFor(directive.id)} onclick={() => onReject(directive.id, noteFor(directive.id))}>
                <XCircle class="size-4 mr-1" />驳回
              </Button>
              <Button size="sm" disabled={!noteFor(directive.id)} onclick={() => onApprove(directive.id, noteFor(directive.id))}>
                <CheckCircle2 class="size-4 mr-1" />批准
              </Button>
            </div>
          {:else if directive.status === 'processing'}
            <span class="text-xs text-muted-foreground">已由其他处理者认领</span>
          {/if}
        </article>
      {:else}
        <div class="empty-state"><p class="text-sm text-muted-foreground">没有待处理指令</p></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .directive-panel, .section, .directive-card, .directive-form, .form-field { display: flex; flex-direction: column; }
  .directive-panel { gap: 1rem; padding: 1rem; }
  .section, .directive-card, .directive-form, .form-field { gap: 0.625rem; }
  .panel-header, .directive-header, .directive-meta, .form-actions, .cancel-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .directive-form, .directive-card { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); }
  .workflow { border-left: 3px solid var(--primary); }
  .directive-meta { color: var(--muted-foreground); font-size: 0.75rem; }
  .directive-meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
  .processing-note { padding: 0.5rem; border-radius: var(--radius); background: var(--muted); font-size: 0.75rem; }
  .cancel-row :global(input) { flex: 1; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; }
</style>
