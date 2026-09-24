<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Download, FileUp, FolderOpen, RefreshCw, RotateCcw } from '@lucide/svelte'
  import { cloudSession } from '$lib/classes/stores/cloud/cloud-session-store.svelte'
  import {
    CloudFileError, downloadCloudFile, listCloudFiles, uploadCloudFile, withdrawCloudFile
  } from '$lib/classes/clients/cloud-file-client'
  import type { FileContent } from '$lib/classes/clients/cloud-file-client'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'
  import * as Select from '$lib/components/ui/select'
  import * as Table from '$lib/components/ui/table'
  import * as Alert from '$lib/components/ui/alert'
  import * as Empty from '$lib/components/ui/empty'
  import { Badge } from '$lib/components/ui/badge'

  let files = $state<FileContent[]>([])
  let selectedFile = $state<globalThis.File | null>(null)
  let title = $state('')
  let selectedType = $state('会议材料')
  let customType = $state('')
  const customTypeValue = '__custom__'
  let sortKey = $state<'fileType' | 'createdAt' | 'author' | 'fileName'>('createdAt')
  let sortDirection = $state<'asc' | 'desc'>('desc')
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
  const fileTypes = $derived([...new Set(['会议材料', ...files.map((item) => item.fileType.trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'zh-CN')))
  const fileType = $derived(selectedType === customTypeValue ? customType : selectedType)
  const sortedFiles = $derived([...files].sort((a, b) => {
    const compare = sortKey === 'createdAt'
      ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
      : sortKey === 'author'
        ? `${a.author.committeeName} / ${a.author.seatName}`.localeCompare(`${b.author.committeeName} / ${b.author.seatName}`, 'zh-CN', { numeric: true })
        : a[sortKey].localeCompare(b[sortKey], 'zh-CN', { numeric: true })
    return (sortDirection === 'asc' ? compare : -compare) || a.id.localeCompare(b.id)
  }))

  function sortBy(key: typeof sortKey): void {
    if (sortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    else {
      sortKey = key
      sortDirection = key === 'createdAt' ? 'desc' : 'asc'
    }
  }

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
        title: title.trim(), fileType: fileType.trim()
      })
      selectedFile = null
      title = ''
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
          <div class="flex flex-col gap-2">
            <Label for="file-type">文件类型</Label>
            <Select.Root type="single" bind:value={selectedType} items={[...fileTypes.map((value) => ({ value, label: value })), { value: customTypeValue, label: '自定义类型…' }]}>
              <Select.Trigger id="file-type" class="w-full"><Select.Value placeholder="选择文件类型" /></Select.Trigger>
              <Select.Content><Select.Group>
                {#each fileTypes as type (type)}<Select.Item value={type}>{type}</Select.Item>{/each}
                <Select.Item value={customTypeValue}>自定义类型…</Select.Item>
              </Select.Group></Select.Content>
            </Select.Root>
            {#if selectedType === customTypeValue}
              <Input aria-label="自定义文件类型" placeholder="输入文件类型" maxlength={60} bind:value={customType} />
            {/if}
          </div>
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
        <div class="rounded-lg border bg-card">
          <Table.Root class="min-w-[900px]">
            <Table.Header><Table.Row>
              <Table.Head>标题</Table.Head>
              {#each [{ key: 'fileType', label: '类型' }, { key: 'createdAt', label: '时间' }, { key: 'author', label: '上传者' }, { key: 'fileName', label: '文件名' }] as column (column.key)}
                <Table.Head aria-sort={sortKey === column.key ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}><button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => sortBy(column.key as typeof sortKey)} aria-label={`按${column.label}排序`}>
                  {column.label}
                  {#if sortKey === column.key}{#if sortDirection === 'asc'}<ArrowUp class="size-3.5" />{:else}<ArrowDown class="size-3.5" />{/if}{:else}<ArrowUpDown class="size-3.5" />{/if}
                </button></Table.Head>
              {/each}
              <Table.Head>状态</Table.Head><Table.Head class="text-right">操作</Table.Head>
            </Table.Row></Table.Header>
            <Table.Body>
              {#if files.length === 0}
                <Table.Row><Table.Cell colspan={7} class="py-8 text-center text-muted-foreground">{loading ? '正在加载文件…' : '当前委员会暂无文件'}</Table.Cell></Table.Row>
              {:else}
                {#each sortedFiles as item (item.id)}
                  <Table.Row>
                    <Table.Cell class="min-w-40 font-medium">{item.title}{#if item.withdrawalReason}<p class="mt-1 max-w-56 whitespace-normal text-xs text-destructive">撤回原因：{item.withdrawalReason}</p>{/if}</Table.Cell>
                    <Table.Cell>{item.fileType}</Table.Cell>
                    <Table.Cell>{new Date(item.createdAt).toLocaleString('zh-CN')}</Table.Cell>
                    <Table.Cell>{item.author.committeeName} / {item.author.seatName}</Table.Cell>
                    <Table.Cell><span title={item.fileName}>{item.fileName}</span><span class="ml-2 text-xs text-muted-foreground">{(item.size / 1024).toFixed(1)} KiB</span></Table.Cell>
                    <Table.Cell><Badge variant={item.status === 'published' ? 'default' : 'secondary'}>{item.status === 'published' ? '已发布' : '已撤回'}</Badge></Table.Cell>
                    <Table.Cell class="text-right">
                      {#if item.status === 'published'}
                        <div class="flex justify-end gap-2">
                          {#if canWithdraw && withdrawalId !== item.id}<Button variant="outline" size="sm" onclick={() => { withdrawalId = item.id; reason = '' }}><RotateCcw data-icon="inline-start" />撤回</Button>{/if}
                          <Button size="sm" onclick={() => void download(item)}><Download data-icon="inline-start" />下载</Button>
                        </div>
                        {#if withdrawalId === item.id}
                          <div class="mt-2 flex min-w-56 flex-col gap-2 text-left">
                            <Label for={`withdraw-file-${item.id}`}>撤回原因</Label>
                            <Input id={`withdraw-file-${item.id}`} maxlength={500} bind:value={reason} />
                            <div class="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={busy} onclick={() => { withdrawalId = null; reason = '' }}>取消</Button><Button variant="destructive" size="sm" disabled={busy || !reason.trim()} onclick={() => void withdraw(item)}>确认撤回</Button></div>
                          </div>
                        {/if}
                      {/if}
                    </Table.Cell>
                  </Table.Row>
                {/each}
              {/if}
            </Table.Body>
          </Table.Root>
        </div>
      </section>
    {/if}
  {/if}
</div>
