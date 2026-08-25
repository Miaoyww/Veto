<script lang="ts">
  import {
    Trash2,
    Play,
    Pencil,
    Check,
    X,
    CalendarDays,
    Users,
    Building2,
    Mic,
    Bell
  } from '@lucide/svelte'
  import type { Conference } from '$lib/types-conference'
  import {
    currentConferenceId,
    deleteConference,
    renameConference
  } from '$lib/stores/conference/conference-store'
  import { navigateToConference } from '$lib/utils'
  import { showConfirm } from '$lib/stores/app/global-ui-store'
  import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { getCurrentSpeakerName, getPendingMotionCount } from './conference-status'

  let { conference }: { conference: Conference } = $props()

  const currentSpeaker = $derived(getCurrentSpeakerName(conference))
  const pendingCount = $derived(getPendingMotionCount(conference))

  let editing = $state(false)
  let editName = $state('')
  let inputRef = $state<HTMLInputElement | null>(null)

  const isActive = $derived($currentConferenceId === conference.id)

  function handleLoad(): void {
    if (editing) return
    navigateToConference(conference.id)
  }

  function handleDelete(e: MouseEvent): void {
    e.stopPropagation()
    showConfirm(
      '确认删除',
      `将永久删除大会「${conference.name}」，此操作无法撤销。是否继续？`,
      () => deleteConference(conference.id)
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
      {#if editing}
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
        进入
      </Button>
      <Button variant="destructive" size="icon-sm" title="删除大会" onclick={handleDelete}>
        <Trash2 />
      </Button>
    </CardAction>
  </CardHeader>

  <CardContent class="px-5">
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="flex items-center gap-1">
        <Building2 class="size-3" />
        {conference.venue}
      </span>
      <span class="flex items-center gap-1">
        <CalendarDays class="size-3" />
        {formatDate(conference.createdAt)}
      </span>
      <span class="flex items-center gap-1">
        <Users class="size-3" />
        {conference.delegations.length} 个代表团
      </span>
      <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {PHASE_LABELS[conference.phase] ?? conference.phase}
      </span>
      {#if currentSpeaker}
        <span class="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
          <Mic class="size-3" />
          {currentSpeaker}
        </span>
      {/if}
      {#if pendingCount > 0}
        <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Bell class="size-3" />
          {pendingCount} 待处理
        </span>
      {/if}
    </div>
  </CardContent>
</Card>
