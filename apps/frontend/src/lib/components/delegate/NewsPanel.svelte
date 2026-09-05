<script lang="ts">
  import type { News, NewsStatus } from '../../../../../shared'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { CheckCircle2, Clock, Newspaper, Plus, Send, Undo2, XCircle } from '@lucide/svelte'

  interface Props {
    news: News[]
    workflowNews: News[]
    canDraft: boolean
    canReview: boolean
    canWithdraw: boolean
    onSubmit: (data: { title: string; content: string; source: string }) => void
    onReview: (newsId: string, decision: 'publish' | 'reject', note?: string) => void
    onWithdraw: (newsId: string, reason: string) => void
  }

  let {
    news,
    workflowNews,
    canDraft,
    canReview,
    canWithdraw,
    onSubmit,
    onReview,
    onWithdraw
  }: Props = $props()

  let showForm = $state(false)
  let title = $state('')
  let content = $state('')
  let source = $state('')
  let reviewNotes = $state<Record<string, string>>({})
  let withdrawalReasons = $state<Record<string, string>>({})

  const statusLabels: Record<NewsStatus, string> = {
    submitted: '待审核',
    published: '已发布',
    rejected: '已驳回',
    retracted: '已撤回'
  }
  const statusVariant: Record<NewsStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    submitted: 'default',
    published: 'outline',
    rejected: 'destructive',
    retracted: 'secondary'
  }

  function submit(): void {
    if (!title.trim() || !content.trim() || !source.trim()) return
    onSubmit({ title: title.trim(), content: content.trim(), source: source.trim() })
    title = ''
    content = ''
    source = ''
    showForm = false
  }

  function reviewNote(id: string): string | undefined {
    return reviewNotes[id]?.trim() || undefined
  }
</script>

<div class="news-panel">
  <div class="panel-header">
    <h3 class="text-base font-semibold flex items-center gap-2"><Newspaper class="size-5" />新闻</h3>
    {#if canDraft}
      <Button size="sm" variant="outline" onclick={() => { showForm = !showForm }}><Plus class="size-4 mr-1" />起草并提交</Button>
    {/if}
  </div>

  {#if showForm && canDraft}
    <div class="news-form">
      <div class="form-field"><Label for="news-title">标题</Label><Input id="news-title" bind:value={title} placeholder="新闻标题" /></div>
      <div class="form-field"><Label for="news-source">来源</Label><Input id="news-source" bind:value={source} placeholder="如：新华社、路透社" /></div>
      <div class="form-field"><Label for="news-content">正文</Label><Textarea id="news-content" bind:value={content} placeholder="新闻正文" rows={5} /></div>
      <div class="form-actions">
        <Button size="sm" variant="outline" onclick={() => { showForm = false }}>取消</Button>
        <Button size="sm" disabled={!title.trim() || !content.trim() || !source.trim()} onclick={submit}><Send class="size-4 mr-1" />提交审核</Button>
      </div>
    </div>
  {/if}

  <div class="section">
    <h4 class="text-sm font-semibold text-muted-foreground">已发布新闻</h4>
    {#each news as item (item.id)}
      <article class="news-card">
        <div class="news-header">
          <span class="font-medium">{item.title}</span>
          <div class="news-badges"><Badge variant="secondary">{item.source}</Badge><Badge variant={statusVariant[item.status]}>{statusLabels[item.status]}</Badge></div>
        </div>
        <p class="news-content">{item.content}</p>
        {#if item.author}
          <span class="text-xs text-muted-foreground">{item.author.committeeName} · {item.author.seatName}{item.author.role ? `（${item.author.role}）` : ''}</span>
        {/if}
        <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="size-3" />{new Date(item.publishedAt ?? item.createdAt).toLocaleString()}</span>
        {#if canWithdraw && item.status === 'published'}
          <div class="withdraw-row">
            <Input bind:value={withdrawalReasons[item.id]} placeholder="撤回原因" />
            <Button size="sm" variant="outline" disabled={!withdrawalReasons[item.id]?.trim()} onclick={() => onWithdraw(item.id, withdrawalReasons[item.id].trim())}>
              <Undo2 class="size-4 mr-1" />撤回
            </Button>
          </div>
        {/if}
      </article>
    {:else}
      <div class="empty-state"><Newspaper class="size-8 text-muted-foreground" /><p class="text-sm text-muted-foreground">暂无已发布新闻</p></div>
    {/each}
  </div>

  {#if canReview}
    <div class="section">
      <h4 class="text-sm font-semibold text-muted-foreground">审核队列</h4>
      {#each workflowNews as item (item.id)}
        <article class="news-card workflow">
          <div class="news-header"><span class="font-medium">{item.title}</span><Badge variant={statusVariant[item.status]}>{statusLabels[item.status]}</Badge></div>
          <span class="text-xs text-muted-foreground">来源：{item.source}</span>
          <p class="news-content">{item.content}</p>
          {#if item.status === 'submitted'}
            <div class="form-field"><Label for={`review-note-${item.id}`}>审核说明</Label><Textarea id={`review-note-${item.id}`} bind:value={reviewNotes[item.id]} rows={2} placeholder="驳回时必填" /></div>
            <div class="form-actions">
              <Button size="sm" variant="outline" disabled={!reviewNote(item.id)} onclick={() => onReview(item.id, 'reject', reviewNote(item.id))}><XCircle class="size-4 mr-1" />驳回</Button>
              <Button size="sm" onclick={() => onReview(item.id, 'publish', reviewNote(item.id))}><CheckCircle2 class="size-4 mr-1" />发布</Button>
            </div>
          {:else if item.reviewNote}
            <p class="review-note">审核说明：{item.reviewNote}</p>
          {/if}
        </article>
      {:else}
        <div class="empty-state"><p class="text-sm text-muted-foreground">没有待审核新闻</p></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .news-panel, .section, .news-card, .news-form, .form-field { display: flex; flex-direction: column; }
  .news-panel { gap: 1rem; padding: 1rem; }
  .section, .news-card, .news-form, .form-field { gap: 0.625rem; }
  .panel-header, .news-header, .news-badges, .form-actions, .withdraw-row { display: flex; align-items: center; gap: 0.75rem; }
  .panel-header, .news-header, .form-actions { justify-content: space-between; }
  .news-form, .news-card { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); }
  .workflow { border-left: 3px solid var(--primary); }
  .news-content { white-space: pre-wrap; font-size: 0.875rem; line-height: 1.6; }
  .withdraw-row :global(input) { flex: 1; }
  .review-note { padding: 0.5rem; background: var(--muted); border-radius: var(--radius); font-size: 0.75rem; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; }
</style>
