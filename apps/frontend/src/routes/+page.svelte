<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  import { Search, Plus, Users, Monitor, UserPlus, Play, Mic, Bell, Clock } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js'
  import * as InputGroup from '$lib/components/ui/input-group/index.js'
  import * as Card from '$lib/components/ui/card/index.js'
  import {
    conferences,
    lastOpenedConferenceId,
    unloadConference,
    getPresentCount
  } from '$lib/classes/stores/conference/conference-store'
  import ConferenceCard from '$lib/components/home/conference-card.svelte'
  import CreateConferenceDialog from '$lib/components/home/create-conference-dialog.svelte'
  import JoinConferenceDialog from '$lib/components/home/join-conference-dialog.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { PHASE_LABELS } from '$lib/classes/services/engine/conference-engine'
  import {
    getCurrentSpeakerName,
    getPendingMotionCount
  } from '$lib/components/home/conference-status'
  import { navigateToConference } from '$lib/classes/utils'
  import { fly } from 'svelte/transition'

  let query = $state('')
  let joinDialogOpen = $state(false)
  let displayOnlyDialogOpen = $state(false)

  const filteredConferences = $derived(
    query.trim()
      ? $conferences.filter(
          (c) =>
            c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            c.venue.toLowerCase().includes(query.trim().toLowerCase())
        )
      : $conferences
  )

  const lastOpened = $derived(
    $lastOpenedConferenceId
      ? ($conferences.find((c) => c.id === $lastOpenedConferenceId) ?? null)
      : null
  )
  const currentSpeaker = $derived(lastOpened ? getCurrentSpeakerName(lastOpened) : null)
  const pendingCount = $derived(lastOpened ? getPendingMotionCount(lastOpened) : 0)

  onMount(() => {
    unloadConference()
  })

  function formatActiveTime(ts: number): string {
    return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  }
</script>

<div class="flex h-full w-full flex-row" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
  <div
    class="flex h-full min-w-0 flex-1 flex-col bg-background"
    in:fly={{ y: 8, duration: 320, opacity: 0 }}
  >
    {#if $conferences.length === 0}
      <!-- 空状态引导 -->
      <div class="flex flex-1 items-center justify-center p-8">
        <div class="flex flex-col items-center gap-6 text-center">
          <Users size={56} class="opacity-30" />
          <div>
            <h2 class="text-2xl font-semibold text-foreground">开始你的第一场大会</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              创建一场新大会，或通过邀请码加入已有大会
            </p>
          </div>
          <div class="flex gap-3">
            <Button size="lg" class="gap-2" onclick={() => goto(resolve('/conference-events/new'))}>
              <Plus size={18} />
              创建新大会
            </Button>
            <Button
              size="lg"
              variant="outline"
              class="gap-2"
              onclick={() => (joinDialogOpen = true)}
            >
              <UserPlus size={18} />
              加入已有大会
            </Button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Header -->
      <div class="grid grid-cols-3 items-center gap-6 border-b px-8 py-5">
        <!-- 中间：搜索 -->
        <InputGroup.Root>
          <InputGroup.Input bind:value={query} placeholder="搜索大会..." />
          <InputGroup.Addon>
            <Search class="h-4 w-4" />
          </InputGroup.Addon>
        </InputGroup.Root>

        <div class="flex justify-end">
          <Button class="gap-2" onclick={() => goto(resolve('/conference-events/new'))}>
            <Plus size={16} />
            创建大会
          </Button>
        </div>
      </div>

      <!-- Conference List -->
      <ScrollArea class="flex-1">
        <div class="px-8 py-6">
          {#if lastOpened && !query.trim()}
            <!-- 继续上次横幅 -->
            <Card.Root
              class="group mb-4 cursor-pointer border-indigo-300/50 bg-card/80 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-indigo-800/60"
              onclick={() => navigateToConference(lastOpened.id)}
            >
              <Card.Content class="flex items-center gap-4 p-5">
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"
                >
                  <Play size={22} />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    继续上次
                  </p>
                  <div class="mt-0.5 flex items-center gap-2">
                    <span class="truncate text-base font-semibold text-foreground">
                      {lastOpened.name}
                    </span>
                    <Badge variant="outline" class="shrink-0 text-[10px]">
                      {PHASE_LABELS[lastOpened.phase] ?? lastOpened.phase}
                    </Badge>
                  </div>
                  <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Users class="size-3" />
                      {getPresentCount(lastOpened.delegations)}/{lastOpened.delegations.length}
                      出席
                    </span>
                    {#if currentSpeaker}
                      <span class="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <Mic class="size-3" />
                        正在发言：{currentSpeaker}
                      </span>
                    {/if}
                    {#if pendingCount > 0}
                      <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Bell class="size-3" />
                        {pendingCount} 个待处理动议
                      </span>
                    {/if}
                    <span class="flex items-center gap-1">
                      <Clock class="size-3" />
                      {formatActiveTime(lastOpened.updatedAt)}
                    </span>
                  </div>
                </div>
                <div class="shrink-0">
                  <Button class="gap-2">
                    <Play size={15} />
                    进入
                  </Button>
                </div>
              </Card.Content>
            </Card.Root>
          {/if}

          {#if filteredConferences.length === 0}
            <Card.Root class="border-dashed bg-card/30 py-16 text-center shadow-none">
              <Card.Content class="p-0">
                <p class="text-muted-foreground">未找到匹配的大会</p>
                <p class="mt-1 text-sm text-muted-foreground/70">试试其他关键词？</p>
              </Card.Content>
            </Card.Root>
          {:else}
            <div class="flex flex-col gap-3">
              {#each filteredConferences as conf (conf.id)}
                <ConferenceCard conference={conf} />
              {/each}
            </div>
          {/if}
        </div>
      </ScrollArea>
    {/if}
  </div>
</div>

<JoinConferenceDialog bind:open={joinDialogOpen} />

<DisplayOnlyDialog bind:open={displayOnlyDialogOpen} />
