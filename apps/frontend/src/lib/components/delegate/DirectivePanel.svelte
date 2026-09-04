<script lang="ts">
  import type { Directive, Classification, DirectiveStatus } from '$lib/classes/types/delegate'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Badge } from '$lib/components/ui/badge'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select'
  import { Plus, Send, FileText, Clock, CheckCircle2, XCircle } from '@lucide/svelte'

  interface Props {
    directives: Directive[]
    seatId: string
    seatRole: string
    cabinetId: string
    onCreateDirective: (data: {
      title: string
      content: string
      target: string
      classification: Classification
    }) => void
    onResubmit: (directiveId: string) => void
  }

  let {
    directives,
    seatId,
    seatRole,
    cabinetId,
    onCreateDirective,
    onResubmit
  }: Props = $props()

  let showForm = $state(false)
  let title = $state('')
  let content = $state('')
  let target = $state('')
  let classification = $state<Classification>('confidential')

  const statusBadgeVariant: Record<DirectiveStatus, string> = {
    draft: 'secondary',
    submitted: 'default',
    approved: 'outline',
    rejected: 'destructive'
  }

  const statusLabels: Record<DirectiveStatus, string> = {
    draft: '草稿',
    submitted: '已提交',
    approved: '已通过',
    rejected: '已驳回'
  }

  const classificationLabels: Record<Classification, string> = {
    top_secret: '绝密',
    secret: '机密',
    confidential: '保密',
    public: '公开'
  }

  function handleSubmit(): void {
    if (!title.trim() || !content.trim()) return
    onCreateDirective({
      title: title.trim(),
      content: content.trim(),
      target: target.trim() || 'ipc',
      classification
    })
    title = ''
    content = ''
    target = ''
    classification = 'confidential'
    showForm = false
  }

  const filteredDirectives = $derived(
    directives.filter((d) => d.cabinetId === cabinetId)
  )
</script>

<div class="directive-panel">
  <div class="panel-header">
    <h3 class="text-base font-semibold flex items-center gap-2">
      <FileText class="size-5" />
      指令
    </h3>
    <Button size="sm" variant="outline" onclick={() => { showForm = !showForm }}>
      <Plus class="size-4 mr-1" />
      新建指令
    </Button>
  </div>

  {#if showForm}
    <div class="directive-form">
      <div class="form-row">
        <div class="form-field flex-1">
          <Label for="dir-title">标题</Label>
          <Input id="dir-title" bind:value={title} placeholder="指令标题" />
        </div>
        <div class="form-field" style="width: 120px">
          <Label for="dir-class">密级</Label>
          <Select bind:value={classification}>
            <SelectTrigger id="dir-class">
              {classificationLabels[classification]}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_secret" label="绝密" />
              <SelectItem value="secret" label="机密" />
              <SelectItem value="confidential" label="保密" />
              <SelectItem value="public" label="公开" />
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="form-field">
        <Label for="dir-target">接收方</Label>
        <Input id="dir-target" bind:value={target} placeholder="如：IPC、俄罗斯内阁" />
      </div>
      <div class="form-field">
        <Label for="dir-content">正文</Label>
        <Textarea id="dir-content" bind:value={content} placeholder="指令内容..." rows={4} />
      </div>
      <div class="form-actions">
        <Button variant="outline" size="sm" onclick={() => { showForm = false }}>取消</Button>
        <Button size="sm" onclick={handleSubmit} disabled={!title.trim() || !content.trim()}>
          <Send class="size-4 mr-1" />
          提交
        </Button>
      </div>
    </div>
  {/if}

  <div class="directive-list">
    {#each filteredDirectives as directive (directive.id)}
      <div class="directive-card">
        <div class="directive-header">
          <span class="font-medium">{directive.title}</span>
          <div class="directive-badges">
            <Badge variant={statusBadgeVariant[directive.status]}>
              {statusLabels[directive.status]}
            </Badge>
            <Badge variant="outline" class="text-xs">
              {classificationLabels[directive.classification]}
            </Badge>
          </div>
        </div>
        <p class="directive-content-preview">{directive.content.slice(0, 120)}{directive.content.length > 120 ? '...' : ''}</p>
        <div class="directive-meta">
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <Clock class="size-3" />
            {new Date(directive.createdAt).toLocaleString()}
          </span>
          {#if directive.status === 'rejected'}
            <Button size="sm" variant="outline" onclick={() => onResubmit(directive.id)}>
              修改重发
            </Button>
          {/if}
        </div>
        {#if directive.reviewComment}
          <div class="review-comment">
            <span class="text-xs text-muted-foreground">审核意见: {directive.reviewComment}</span>
          </div>
        {/if}
      </div>
    {/each}
    {#if filteredDirectives.length === 0}
      <div class="empty-state">
        <FileText class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">暂无指令</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .directive-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .directive-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .form-row {
    display: flex;
    gap: 0.75rem;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .directive-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .directive-card {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .directive-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .directive-badges {
    display: flex;
    gap: 0.375rem;
  }
  .directive-content-preview {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    line-height: 1.4;
  }
  .directive-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .review-comment {
    padding: 0.5rem;
    background: var(--muted);
    border-radius: var(--radius);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
  }
</style>
