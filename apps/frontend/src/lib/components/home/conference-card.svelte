<script lang="ts">
  import {
    Trash2,
    Play,
    Pencil,
    Check,
    X,
    KeyRound,
    CalendarDays,
    Users,
    Building2
  } from '@lucide/svelte'
  import type { Conference } from '$lib/classes/types/conference'
  import {
    currentConferenceId,
    deleteConference,
    renameConference
  } from '$lib/classes/stores/conference/conference-store'
  import { navigateToConference } from '$lib/classes/utils'
  import { showConfirm } from '$lib/classes/stores/app/global-ui-store'
  import { Badge } from '$lib/components/ui/badge'
  import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

  let {
    conference,
    onJoin,
    onUpdatePassword,
    onDelete
  }: {
    conference: Conference
    onJoin?: (conference: Conference) => void
    onUpdatePassword?: (conference: Conference) => void
    onDelete?: (conference: Conference) => void
  } = $props()

  let editing = $state(false)
  let editName = $state('')
  let inputRef = $state<HTMLInputElement | null>(null)

  const isActive = $derived($currentConferenceId === conference.id)

  function handleLoad(): void {
    if (editing) return
    if (conference.source === 'cloud' && onJoin) {
      onJoin(conference)
      return
    }
    navigateToConference(conference.id)
  }

  function handleDelete(e: MouseEvent): void {
    e.stopPropagation()
    const isCloudConference = conference.source === 'cloud'
    showConfirm(
      isCloudConference ? '确认从本机移除' : '确认删除',
      isCloudConference
        ? `将从本机移除大会「${conference.name}」及保存的席位信息，不会删除云端大会。是否继续？`
        : `将永久删除大会「${conference.name}」，此操作无法撤销。是否继续？`,
      () => (isCloudConference ? onDelete?.(conference) : deleteConference(conference.id))
    )
  }

  function startEdit(e: MouseEvent): void {
    e.stopPropagation()
    editName = conference.name
    editing = true
    setTimeout(() => inputRef?.focus(), 0)
  }

  function commitEdit(): void {
    if (editName.trim()) renameConference(conference.id, editName)
    editing = false
  }

  function cancelEdit(): void {
    editName = conference.name
    editing = false
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    e.stopPropagation()
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') cancelEdit()
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  }
</script>

<Card
  class="group w-full gap-2 py-4 backdrop-blur-sm transition-all hover:shadow-md {isActive
    ? 'border-indigo-400 bg-card/90 dark:border-indigo-500'
    : 'bg-card/70 hover:bg-card/90'}"
>
  <CardHeader class="px-5">
    <CardTitle class="flex min-w-0 items-center gap-1.5 text-sm">
      {#if !conference.source && editing}
        <Input
          bind:ref={inputRef}
          bind:value={editName}
          class="h-7 min-w-0 flex-1 text-sm font-semibold"
          onclick={(e: MouseEvent) => e.stopPropagation()}
          onkeydown={handleInputKeydown}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          class="shrink-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300"
          title="保存"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            commitEdit()
          }}
        >
          <Check />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="shrink-0"
          title="取消"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            cancelEdit()
          }}
        >
          <X />
        </Button>
      {:else}
        <span class="truncate font-semibold">{conference.name}</span>
        {#if conference.source === 'cloud'}
          <Badge variant="outline" class="shrink-0">云端</Badge>
        {:else if conference.mode === 'singleton'}
          <Badge variant="outline" class="shrink-0">单例</Badge>
        {/if}
        {#if conference.source !== 'cloud'}
          <Button
            variant="ghost"
            size="icon-sm"
            class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            title="重命名"
            onclick={startEdit}
          >
            <Pencil />
          </Button>
        {/if}
      {/if}
    </CardTitle>

    <CardAction class="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
      <Button
        variant="outline"
        size="sm"
        class="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        onclick={(e: MouseEvent) => {
          e.stopPropagation()
          handleLoad()
        }}
      >
        <Play class="size-3" />
        {conference.source === 'cloud'
          ? '重新入会'
          : conference.mode === 'singleton'
            ? '主持'
            : '进入'}
      </Button>
      {#if conference.source === 'cloud'}
        <Button
          variant="ghost"
          size="icon-sm"
          title="重新填写密码"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            onUpdatePassword?.(conference)
          }}
        >
          <KeyRound />
        </Button>
      {/if}
      {#if conference.source !== 'cloud' || onDelete}
        <Button
          variant="destructive"
          size="icon-sm"
          title={conference.source === 'cloud' ? '从本机移除' : '删除大会'}
          onclick={handleDelete}
        >
          <Trash2 />
        </Button>
      {/if}
    </CardAction>
  </CardHeader>

  <CardContent class="px-5">
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="flex items-center gap-1">
        <Building2 class="size-3" />
        {conference.committees.length} 个会场
      </span>
      <span class="flex items-center gap-1">
        <CalendarDays class="size-3" />
        {formatDate(conference.createdAt)}
      </span>
      <span class="flex items-center gap-1">
        <Users class="size-3" />
        {conference.committees.reduce((count, committee) => count + committee.seats.length, 0)} 个席位
      </span>
    </div>
  </CardContent>
</Card>
