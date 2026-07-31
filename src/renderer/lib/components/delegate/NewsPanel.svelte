<script lang="ts">
  import type { News, NewsStatus } from '$lib/types-delegate'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Badge } from '$lib/components/ui/badge'
  import { Plus, Newspaper, Clock, Send, CheckCircle2, XCircle, RotateCcw } from '@lucide/svelte'

  interface Props {
    newsList: News[]
    seatId: string
    seatGroupId: string
    canDraftNews: boolean
    onCreateNews: (data: { title: string; content: string; source: string }) => void
    onSubmitNews: (newsId: string) => void
  }

  let {
    newsList,
    seatId,
    seatGroupId,
    canDraftNews,
    onCreateNews,
    onSubmitNews
  }: Props = $props()

  let showForm = $state(false)
  let title = $state('')
  let content = $state('')
  let source = $state('')

  const statusBadgeVariant: Record<NewsStatus, string> = {
    draft: 'secondary',
    submitted: 'default',
    published: 'outline',
    rejected: 'destructive',
    retracted: 'secondary'
  }

  const statusLabels: Record<NewsStatus, string> = {
    draft: '草稿',
    submitted: '待审核',
    published: '已发布',
    rejected: '已驳回',
    retracted: '已撤回'
  }

  function handleSubmit(): void {
    if (!title.trim() || !content.trim()) return
    onCreateNews({
      title: title.trim(),
      content: content.trim(),
      source: source.trim() || '通讯社'
    })
    title = ''
    content = ''
    source = ''
    showForm = false
  }

  const publishedNews = $derived(newsList.filter((n) => n.status === 'published'))
  const myDrafts = $derived(newsList.filter((n) => n.authorId === seatId && n.status !== 'published'))
</script>

<div class="news-panel">
  <div class="panel-header">
    <h3 class="text-base font-semibold flex items-center gap-2">
      <Newspaper class="size-5" />
      新闻
    </h3>
    {#if canDraftNews}
      <Button size="sm" variant="outline" onclick={() => { showForm = !showForm }}>
        <Plus class="size-4 mr-1" />
        起草新闻
      </Button>
    {/if}
  </div>

  {#if showForm && canDraftNews}
    <div class="news-form">
      <div class="form-field">
        <Label for="news-title">标题</Label>
        <Input id="news-title" bind:value={title} placeholder="新闻标题" />
      </div>
      <div class="form-field">
        <Label for="news-source">来源</Label>
        <Input id="news-source" bind:value={source} placeholder="如：新华社、路透社" />
      </div>
      <div class="form-field">
        <Label for="news-content">正文（Markdown）</Label>
        <Textarea id="news-content" bind:value={content} placeholder="新闻正文..." rows={5} />
      </div>
      <div class="form-actions">
        <Button variant="outline" size="sm" onclick={() => { showForm = false }}>取消</Button>
        <Button size="sm" onclick={handleSubmit} disabled={!title.trim() || !content.trim()}>
          保存草稿
        </Button>
      </div>
    </div>
  {/if}

  <!-- 我的草稿 -->
  {#if myDrafts.length > 0}
    <div class="section">
      <h4 class="text-sm font-semibold text-muted-foreground">我的草稿</h4>
      {#each myDrafts as news (news.id)}
        <div class="news-card">
          <div class="news-header">
            <span class="font-medium">{news.title}</span>
            <Badge variant={statusBadgeVariant[news.status]}>
              {statusLabels[news.status]}
            </Badge>
          </div>
          <p class="news-preview">{news.content.slice(0, 100)}...</p>
          <div class="news-actions">
            <span class="text-xs text-muted-foreground flex items-center gap-1">
              <Clock class="size-3" />
              {new Date(news.createdAt).toLocaleString()}
            </span>
            {#if news.status === 'draft'}
              <Button size="sm" variant="outline" onclick={() => onSubmitNews(news.id)}>
                <Send class="size-3 mr-1" />
                提交审核
              </Button>
            {/if}
          </div>
          {#if news.reviewComment}
            <p class="text-xs text-muted-foreground">审核意见: {news.reviewComment}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- 已发布新闻 -->
  <div class="section">
    <h4 class="text-sm font-semibold text-muted-foreground">已发布新闻</h4>
    {#each publishedNews as news (news.id)}
      <div class="news-card published">
        <div class="news-header">
          <span class="font-medium">{news.title}</span>
          <div class="news-badges">
            <Badge variant="secondary" class="text-xs">{news.source}</Badge>
            <Badge variant={statusBadgeVariant[news.status]}>
              {statusLabels[news.status]}
            </Badge>
          </div>
        </div>
        <div class="news-content">
          {news.content}
        </div>
        <div class="news-footer">
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <Clock class="size-3" />
            {news.publishedAt ? new Date(news.publishedAt).toLocaleString() : new Date(news.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    {/each}
    {#if publishedNews.length === 0}
      <div class="empty-state">
        <Newspaper class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">暂无已发布新闻</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .news-panel {
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
  .news-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
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
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .news-card {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .news-card.published {
    border-left: 3px solid var(--primary);
  }
  .news-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .news-badges {
    display: flex;
    gap: 0.375rem;
  }
  .news-preview {
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }
  .news-content {
    font-size: 0.875rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .news-footer, .news-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
  }
</style>
