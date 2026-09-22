<script lang="ts">
  import { onMount } from 'svelte'
  import { Activity, Clock3, Pause, Play, RefreshCw, Send, SkipForward } from '@lucide/svelte'
  import DOMPurify from 'dompurify'
  import { marked } from 'marked'
  import { cloudSession } from '$lib/classes/stores/cloud/cloud-session-store.svelte'
  import {
    CloudSituationError,
    controlCloudTimeline,
    getCloudTimeline,
    listCloudSituations,
    publishCloudSituation,
    withdrawCloudSituation
  } from '$lib/classes/clients/cloud-situation-client'
  import type { CloudSituation as SituationUpdate, CloudTimeline as TimelineProjection } from '$lib/classes/clients/cloud-situation-client'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Card from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'

  let situations = $state<SituationUpdate[]>([])
  let timeline = $state<TimelineProjection | null>(null)
  let timezone = $state('Asia/Shanghai')
  let content = $state('')
  let manualTime = $state('')
  let ratioInput = $state('')
  let jumpTime = $state('')
  let loading = $state(true)
  let submitting = $state(false)
  let controlling = $state(false)
  let error = $state('')
  let clockNow = $state(Date.now())
  let timelineReceivedAt = $state(Date.now())

  const token = $derived(cloudSession.session?.result.token ?? '')
  const canPublish = $derived(cloudSession.hasCapability('publish_situation'))
  const canWithdraw = $derived(cloudSession.hasCapability('withdraw_situation'))
  const canControl = $derived(cloudSession.hasCapability('control_timeline'))
  const currentTimelineTime = $derived(
    timeline
      ? timeline.currentTime + (timeline.paused ? 0 : (clockNow - timelineReceivedAt) * timeline.ratio)
      : null
  )

  function formatTime(value: number): string {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(value)
  }

  function parseChinaTime(value: string): number {
    return Date.parse(`${value}:00+08:00`)
  }

  function markdown(value: string): string {
    return DOMPurify.sanitize(marked.parse(value, { async: false }) as string)
  }

  async function load(silent = false): Promise<void> {
    if (!token) {
      loading = false
      return
    }
    if (!silent) loading = true
    try {
      const [situationResult, timelineResult] = await Promise.all([
        listCloudSituations(token),
        getCloudTimeline(token)
      ])
      situations = situationResult.situations
      timezone = situationResult.timezone
      timeline = timelineResult.timeline
      timelineReceivedAt = Date.now()
      error = ''
    } catch (caught) {
      error = caught instanceof CloudSituationError ? caught.message : '加载局势失败'
    } finally {
      loading = false
    }
  }

  async function publish(): Promise<void> {
    if (!token || !content.trim() || submitting) return
    if (!timeline && !manualTime) {
      error = '未配置时间线，请填写内容时间'
      return
    }
    submitting = true
    try {
      await publishCloudSituation(token, {
        content: content.trim(),
        ...(!timeline ? { contentTime: parseChinaTime(manualTime) } : {})
      })
      content = ''
      manualTime = ''
      await load(true)
    } catch (caught) {
      error = caught instanceof CloudSituationError ? caught.message : '发布局势失败'
    } finally {
      submitting = false
    }
  }

  async function withdraw(item: SituationUpdate): Promise<void> {
    if (!token) return
    const reason = window.prompt('请输入撤回原因')?.trim()
    if (!reason) return
    try {
      await withdrawCloudSituation(token, item.id, reason)
      await load(true)
    } catch (caught) {
      error = caught instanceof CloudSituationError ? caught.message : '撤回局势失败'
    }
  }

  async function control(
    input:
      | { action: 'pause' | 'resume' }
      | { action: 'set_ratio'; ratio: number }
      | { action: 'jump'; contentTime: number }
  ): Promise<void> {
    if (!token || controlling) return
    controlling = true
    try {
      const result = await controlCloudTimeline(token, input)
      timeline = result.timeline
      timelineReceivedAt = Date.now()
      ratioInput = ''
      jumpTime = ''
      error = ''
    } catch (caught) {
      error = caught instanceof CloudSituationError ? caught.message : '控制时间线失败'
    } finally {
      controlling = false
    }
  }

  onMount(() => {
    void load()
    const clock = window.setInterval(() => (clockNow = Date.now()), 1000)
    const refresh = window.setInterval(() => void load(true), 5000)
    return () => {
      window.clearInterval(clock)
      window.clearInterval(refresh)
    }
  })
</script>

<svelte:head><title>局势 · Veto</title></svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
  <header class="flex items-start justify-between gap-4">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-semibold"><Activity />局势</h1>
      <p class="mt-1 text-sm text-muted-foreground">大会统一局势时间线</p>
    </div>
    <Button variant="outline" size="sm" onclick={() => void load()} disabled={loading}>
      <RefreshCw class={loading ? 'animate-spin' : ''} />刷新
    </Button>
  </header>

  {#if !token}
    <Card.Root><Card.Content class="py-10 text-center text-muted-foreground">局势仅在 Cloud Conference 中提供。</Card.Content></Card.Root>
  {:else}
    {#if error}<p class="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>{/if}

    {#if timeline}
      <Card.Root>
        <Card.Header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <Card.Title class="flex items-center gap-2"><Clock3 />{timeline.name}</Card.Title>
              <Card.Description>{timeline.paused ? '已暂停' : `${timeline.ratio}x 运行中`}</Card.Description>
            </div>
            <Badge variant={timeline.paused ? 'secondary' : 'default'}>{timeline.paused ? '暂停' : '运行'}</Badge>
          </div>
        </Card.Header>
        <Card.Content class="space-y-4">
          <p class="font-mono text-3xl font-semibold">{formatTime(currentTimelineTime ?? timeline.currentTime)}</p>
          {#if canControl}
            <div class="flex flex-wrap items-end gap-2 border-t pt-4">
              <Button disabled={controlling} onclick={() => void control({ action: timeline?.paused ? 'resume' : 'pause' })}>
                {#if timeline.paused}<Play />启动{:else}<Pause />暂停{/if}
              </Button>
              <div class="space-y-1">
                <Label for="timeline-ratio">正整数倍率</Label>
                <div class="flex gap-2">
                  <Input id="timeline-ratio" class="w-32" type="number" min="1" step="1" bind:value={ratioInput} />
                  <Button variant="outline" disabled={!Number.isInteger(Number(ratioInput)) || Number(ratioInput) < 1 || controlling}
                    onclick={() => void control({ action: 'set_ratio', ratio: Number(ratioInput) })}>应用</Button>
                </div>
              </div>
              <div class="space-y-1">
                <Label for="timeline-jump">跳转时间</Label>
                <div class="flex gap-2">
                  <Input id="timeline-jump" type="datetime-local" bind:value={jumpTime} />
                  <Button variant="outline" disabled={!jumpTime || controlling}
                    onclick={() => void control({ action: 'jump', contentTime: parseChinaTime(jumpTime) })}><SkipForward />跳转</Button>
                </div>
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    {#if canPublish}
      <Card.Root>
        <Card.Header><Card.Title>发布局势更新</Card.Title><Card.Description>正文支持 Markdown，发布后不可修改。</Card.Description></Card.Header>
        <Card.Content class="space-y-4">
          {#if !timeline}
            <div class="space-y-1.5"><Label for="content-time">内容时间（UTC+8）</Label><Input id="content-time" type="datetime-local" bind:value={manualTime} /></div>
          {/if}
          <div class="space-y-1.5"><Label for="situation-content">正文</Label><Textarea id="situation-content" rows={8} maxlength={20000} bind:value={content} placeholder="输入 Markdown 正文…" /></div>
          <div class="flex justify-end"><Button disabled={!content.trim() || submitting} onclick={() => void publish()}><Send />{submitting ? '发布中…' : '立即发布'}</Button></div>
        </Card.Content>
      </Card.Root>
    {/if}

    <section class="space-y-3">
      <div class="flex items-center justify-between"><h2 class="font-semibold">已发布局势</h2><span class="text-xs text-muted-foreground">{situations.length} 条</span></div>
      {#if loading}
        <p class="py-10 text-center text-sm text-muted-foreground">正在加载…</p>
      {:else if situations.length === 0}
        <Card.Root><Card.Content class="py-10 text-center text-muted-foreground">暂无局势更新</Card.Content></Card.Root>
      {:else}
        {#each situations as item (item.id)}
          <Card.Root>
            <Card.Header>
              <div class="flex items-start justify-between gap-4">
                <div><Card.Title class="font-mono text-base">{formatTime(item.contentTime)}</Card.Title><Card.Description>{item.author?.committeeName} · {item.author?.seatName}{item.author?.role ? ` · ${item.author.role}` : ''}</Card.Description></div>
                {#if canWithdraw}<Button variant="destructive" size="sm" onclick={() => void withdraw(item)}>撤回</Button>{/if}
              </div>
            </Card.Header>
            <Card.Content><article class="markdown-body text-sm leading-7">{@html markdown(item.content)}</article></Card.Content>
          </Card.Root>
        {/each}
      {/if}
    </section>
  {/if}
</div>

<style>
  :global(.markdown-body p) { margin: 0.5rem 0; }
  :global(.markdown-body ul), :global(.markdown-body ol) { margin: 0.5rem 0; padding-left: 1.5rem; }
  :global(.markdown-body ul) { list-style: disc; }
  :global(.markdown-body ol) { list-style: decimal; }
  :global(.markdown-body h1), :global(.markdown-body h2), :global(.markdown-body h3) { margin: 1rem 0 0.5rem; font-weight: 650; }
  :global(.markdown-body code) { border-radius: 0.25rem; background: var(--muted); padding: 0.1rem 0.3rem; }
</style>
