<script lang="ts">
  import { onMount } from 'svelte'
  import { CircleAlert, Download, FileUp, FolderOpen, RefreshCw, RotateCcw } from '@lucide/svelte'
  import { cloudSession } from '$lib/classes/stores/cloud/cloud-session-store.svelte'
  import {
    CloudFileError, downloadCloudFile, listCloudFiles, uploadCloudFile, withdrawCloudFile
  } from '$lib/classes/clients/cloud-file-client'
  import type { FileContent } from '$lib/classes/clients/cloud-file-client'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'
  import * as Alert from '$lib/components/ui/alert'
  import * as Empty from '$lib/components/ui/empty'
  import { Badge } from '$lib/components/ui/badge'

  let files = $state<FileContent[]>([])
  let selectedFile = $state<globalThis.File | null>(null)
  let title = $state('')
  let fileType = $state('会议材料')
  let agendaItem = $state('')
  let loading = $state(true)
  let busy = $state(false)
  let error = $state('')
  let notice = $state('')
  let withdrawalId = $state<string | null>(null)
  let reason = $state('')
  let loadSequence = 0

  const token = $derived(cloudSession.session?.result.token ?? '')
  const canView = $derived(cloudSession.hasCapability('view_files'))
  const canSend = $derived(cloudSession.hasCapability('send_files'))
  const canWithdraw = $derived(cloudSession.hasCapability('withdraw_files'))

  async function load(silent = false): Promise<void> {
    if (!token || !canView || busy) {
      loading = false
      return
    }
    const sequence = ++loadSequence
    if (!silent) loading = true
    try {
      const result = await listCloudFiles(token)
      if (sequence !== loadSequence || token !== cloudSession.session?.result.token) return
      files = result.files
      error = ''
    } catch (caught) {
      if (sequence !== loadSequence) return
      error = caught instanceof CloudFileError ? caught.message : '加载文件失败'
    } finally {
      if (sequence === loadSequence) loading = false
    }
  }

  async function send(): Promise<void> {
    if (!token || !selectedFile || !canSend || busy) return
    if (!title.trim() || !fileType.trim()) {
      error = '请填写标题和文件类型'
      return
    }
    if (selectedFile.size === 0 || selectedFile.size > 20 * 1024 * 1024) {
      error = '请选择不超过 20 MiB 的非空文件'
      return
    }
    busy = true
    try {
      await uploadCloudFile(token, selectedFile, {
        title: title.trim(), fileType: fileType.trim(), agendaItem: agendaItem.trim() || undefined
      })
      selectedFile = null
      title = ''
      agendaItem = ''
      notice = '文件已发布到当前委员会'
      const input = document.getElementById('file-upload') as HTMLInputElement | null
      if (input) input.value = ''
      busy = false
      await load(true)
    } catch (caught) {
      error = caught instanceof CloudFileError ? caught.message : '上传文件失败'
    } finally {
      busy = false
    }
  }

  async function download(item: FileContent): Promise<void> {
    if (!token) return
    try {
      await downloadCloudFile(token, item)
    } catch (caught) {
      error = caught instanceof CloudFileError ? caught.message : '下载文件失败'
    }
  }

  async function withdraw(item: FileContent): Promise<void> {
    if (!token || !canWithdraw || withdrawalId !== item.id || !reason.trim() || busy) return
    busy = true
    try {
      await withdrawCloudFile(token, item.id, reason.trim())
      withdrawalId = null
      reason = ''
      busy = false
      await load(true)
    } catch (caught) {
      error = caught instanceof CloudFileError ? caught.message : '撤回文件失败'
    } finally {
      busy = false
    }
  }

  onMount(() => {
    void load()
    const refresh = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(refresh)
  })
</script>

<svelte:head><title>文件 · Veto</title></svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
  <header class="flex items-start justify-between gap-4">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-semibold"><FolderOpen />文件</h1>
      <p class="mt-1 text-sm text-muted-foreground">文件仅在当前委员会内可见</p>
    </div>
    {#if token && canView}
      <Button variant="outline" size="sm" onclick={() => void load()} disabled={loading || busy}>
        <RefreshCw data-icon="inline-start" />刷新
      </Button>
    {/if}
  </header>

  {#if !token}
    <Empty.Root class="border bg-card/45 py-10">
      <Empty.Header>
        <Empty.Media variant="icon"><FolderOpen /></Empty.Media>
        <Empty.Title>文件仅在云端大会中提供</Empty.Title>
        <Empty.Description>加入云端大会后即可查看当前委员会的文件。</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:else}
    {#if error}
      <Alert.Root variant="destructive"><CircleAlert /><Alert.Description>{error}</Alert.Description></Alert.Root>
    {/if}
    {#if notice}<p class="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{notice}</p>{/if}

    {#if canSend}
      <Card.Root>
        <Card.Header>
          <Card.Title>发布文件</Card.Title>
          <Card.Description>发布后当前委员会中拥有文件查看能力的席位即可下载。</Card.Description>
        </Card.Header>
        <Card.Content class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <Label for="file-upload">选择文件（最大 20 MiB）</Label>
            <Input id="file-upload" type="file" class="mt-2" disabled={busy}
              onchange={(event) => {
                selectedFile = event.currentTarget.files?.[0] ?? null
                if (selectedFile && !title) title = selectedFile.name.replace(/\.[^.]+$/, '')
              }} />
          </div>
          <div><Label for="file-title">标题</Label><Input id="file-title" class="mt-2" maxlength={200} bind:value={title} /></div>
          <div><Label for="file-type">文件类型</Label><Input id="file-type" class="mt-2" maxlength={60} bind:value={fileType} /></div>
          <div class="sm:col-span-2"><Label for="file-agenda">议程项（可选）</Label><Input id="file-agenda" class="mt-2" maxlength={200} bind:value={agendaItem} /></div>
        </Card.Content>
        <Card.Footer class="justify-end">
          <Button disabled={busy || !selectedFile || !title.trim() || !fileType.trim()} onclick={() => void send()}>
            <FileUp data-icon="inline-start" />{busy ? '上传中…' : '发布文件'}
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}

    {#if canView}
      <section class="flex flex-col gap-3">
        <h2 class="font-semibold">委员会文件 <span class="text-xs text-muted-foreground">{files.length}</span></h2>
        {#if loading && files.length === 0}
          <Card.Root><Card.Content class="py-8 text-sm text-muted-foreground">正在加载文件…</Card.Content></Card.Root>
        {:else if files.length === 0}
          <Card.Root><Card.Content class="py-8 text-sm text-muted-foreground">当前委员会暂无文件</Card.Content></Card.Root>
        {:else}
          {#each files as item (item.id)}
            <Card.Root>
              <Card.Header>
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Card.Title>{item.title}</Card.Title>
                    <Card.Description class="mt-1">{item.author.committeeName} / {item.author.seatName} · {new Date(item.createdAt).toLocaleString('zh-CN')}</Card.Description>
                  </div>
                  <Badge variant="secondary">{item.fileType}</Badge>
                </div>
              </Card.Header>
              <Card.Content class="space-y-2 text-sm text-muted-foreground">
                <p>{item.fileName} · {(item.size / 1024).toFixed(1)} KiB</p>
                {#if item.agendaItem}<p>议程项：{item.agendaItem}</p>{/if}
                {#if withdrawalId === item.id}
                  <div class="flex flex-col gap-2 border-t pt-3">
                    <Label for={`withdraw-file-${item.id}`}>撤回原因</Label>
                    <Input id={`withdraw-file-${item.id}`} maxlength={500} bind:value={reason} />
                    <div class="flex justify-end gap-2">
                      <Button variant="outline" disabled={busy} onclick={() => { withdrawalId = null; reason = '' }}>取消</Button>
                      <Button variant="destructive" disabled={busy || !reason.trim()} onclick={() => void withdraw(item)}>确认撤回</Button>
                    </div>
                  </div>
                {/if}
              </Card.Content>
              <Card.Footer class="justify-end gap-2">
                {#if canWithdraw && withdrawalId !== item.id}
                  <Button variant="outline" size="sm" onclick={() => { withdrawalId = item.id; reason = '' }}><RotateCcw data-icon="inline-start" />撤回</Button>
                {/if}
                <Button size="sm" onclick={() => void download(item)}><Download data-icon="inline-start" />下载</Button>
              </Card.Footer>
            </Card.Root>
          {/each}
        {/if}
      </section>
    {/if}
  {/if}
</div>
