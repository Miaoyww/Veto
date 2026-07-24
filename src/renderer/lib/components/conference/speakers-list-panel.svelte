<script lang="ts">
  import {
    Mic, MicOff, Clock, Trash2, Users, ArrowRight, MessageCircle,
    HelpCircle, UserPlus
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import {
    currentConference,
    addToSpeakersList,
    removeFromSpeakersList,
    startSpeaker,
    endSpeaker,
    handleYield
  } from '$lib/stores/conference/conference-store'
  import {
    startSpeakerTimer,
    stopSpeakerTimer,
    formatTime
  } from '$lib/engine/conference-engine'
  import type { YieldChoice } from '$lib/types-conference'

  const conf = $derived($currentConference)

  // ---- Speaker input ----
  let speakerInput = $state('')
  let showSuggestions = $state(false)

  // 模糊搜索
  const suggestions = $derived.by(() => {
    const query = speakerInput.trim().toLowerCase()
    if (!query || !conf) return [] as Array<{ id: string; name: string; shortName?: string; color: string }>
    return conf.delegations
      .filter((d) => {
        const matched =
          d.name.toLowerCase().includes(query) ||
          d.shortName?.toLowerCase().includes(query) ||
          false
        return matched
      })
      .slice(0, 5)
  })

  function addSpeaker(delegationId: string): void {
    addToSpeakersList(delegationId)
    speakerInput = ''
    showSuggestions = false
  }

  // ---- Timer ----
  let displayRemaining = $state(0)
  let displayElapsed = $state(0)
  let displayTotal = $state(0)

  function beginSpeaker(entryId: string): void {
    const entry = conf?.speakersList.find((s) => s.id === entryId)
    if (!entry) return

    startSpeaker(entryId)
    startSpeakerTimer(
      entry.allocatedTimeSec,
      (data) => {
        displayRemaining = data.remainingSec
        displayElapsed = data.elapsedSec
        displayTotal = data.totalSec
      },
      () => {
        endSpeaker()
        stopSpeakerTimer()
      }
    )
  }

  function finishSpeaker(yieldType?: YieldChoice['type']): void {
    stopSpeakerTimer()
    if (yieldType) {
      handleYield({ type: yieldType })
    } else {
      endSpeaker()
    }
  }

  const activeSpeaker = $derived(conf?.speakersList.find((s) => s.status === 'speaking') ?? null)
  const waitingSpeakers = $derived(conf?.speakersList.filter((s) => s.status === 'waiting') ?? [])
  const finishedSpeakers = $derived(conf?.speakersList.filter((s) => s.status === 'finished') ?? [])
  const isSpeakerActive = $derived(activeSpeaker !== null)
</script>

<div class="flex w-full max-w-3xl flex-col gap-4">
  <!-- 当前发言人 -->
  {#if isSpeakerActive && activeSpeaker && conf}
    {@const del = conf.delegations.find((d) => d.id === activeSpeaker.delegationId)}
    <div class="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-700 dark:bg-emerald-950/30">
      <div class="text-sm font-medium text-emerald-700 dark:text-emerald-400">正在发言</div>
      <div class="mt-1 text-2xl font-bold text-foreground">
        {del?.name ?? activeSpeaker.delegationId}
      </div>
      <div class="mt-3 font-mono text-5xl font-bold text-foreground tabular-nums">
        {formatTime(displayRemaining)}
      </div>
      <div class="mt-1 text-xs text-muted-foreground">
        已用 {Math.floor(displayElapsed)}秒 / 共 {displayTotal}秒
      </div>

      <!-- Yield 按钮组 -->
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => finishSpeaker()}>
          <MicOff size={12} class="mr-1" />
          结束发言
        </Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => finishSpeaker('chair')}>
          <Users size={12} class="mr-1" />
          Yield to Chair
        </Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => finishSpeaker('delegate')}>
          <ArrowRight size={12} class="mr-1" />
          Yield to Delegate
        </Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => finishSpeaker('question')}>
          <HelpCircle size={12} class="mr-1" />
          Yield to Question
        </Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" onclick={() => finishSpeaker('comment')}>
          <MessageCircle size={12} class="mr-1" />
          Yield to Comment
        </Button>
      </div>
    </div>
  {:else}
    <!-- 添加发言人 -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center gap-2">
        <UserPlus size={16} class="text-muted-foreground" />
        <span class="text-sm font-medium text-foreground">添加至主发言名单</span>
      </div>
      <div class="relative mt-2">
        <Input
          bind:value={speakerInput}
          placeholder="输入代表团名称（支持模糊搜索）..."
          class="h-9 text-sm"
          onfocus={() => (showSuggestions = true)}
          onblur={() => setTimeout(() => (showSuggestions = false), 200)}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' && suggestions.length === 1) {
              addSpeaker(suggestions[0].id)
            }
          }}
        />
        {#if showSuggestions && suggestions.length > 0}
          <div class="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-card shadow-lg">
            {#each suggestions as s}
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                onmousedown={() => addSpeaker(s.id)}
              >
                <div
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  style="background-color: {s.color}"
                ></div>
                <span class="text-foreground">{s.name}</span>
                {#if s.shortName}
                  <span class="text-xs text-muted-foreground">({s.shortName})</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <Separator />

  <!-- 等待发言列表 -->
  <div class="rounded-lg border bg-card">
    <div class="flex items-center gap-2 px-4 py-3">
      <Clock size={14} class="text-muted-foreground" />
      <span class="text-sm font-medium text-foreground">
        待发言 ({waitingSpeakers.length})
      </span>
    </div>

    {#if waitingSpeakers.length === 0 && finishedSpeakers.length === 0}
      <div class="px-4 pb-4 text-center text-xs text-muted-foreground">
        主发言名单为空，请添加代表团
      </div>
    {:else}
      <div class="divide-y">
        {#each waitingSpeakers as entry, i}
          {@const del = conf?.delegations.find((d) => d.id === entry.delegationId)}
          <div class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
            <div
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              style="background-color: {del?.color ?? '#888'}"
            ></div>
            <span class="min-w-0 flex-1 text-sm text-foreground">
              {del?.name ?? entry.delegationId}
            </span>
            <Badge variant="secondary" class="text-[10px]">
              {formatTime(entry.allocatedTimeSec)}
            </Badge>
            <div class="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                class="h-7 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                disabled={isSpeakerActive}
                onclick={() => beginSpeaker(entry.id)}
              >
                <Mic size={12} />
                发言
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="h-7 text-xs text-muted-foreground hover:text-red-500"
                disabled={isSpeakerActive}
                onclick={() => removeFromSpeakersList(entry.id)}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        {/each}

        <!-- 已完成发言 -->
        {#each finishedSpeakers as entry}
          {@const del = conf?.delegations.find((d) => d.id === entry.delegationId)}
          <div class="flex items-center gap-3 px-4 py-2.5 opacity-50">
            <span class="w-6 text-center font-mono text-xs text-muted-foreground">✓</span>
            <div
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              style="background-color: {del?.color ?? '#888'}"
            ></div>
            <span class="min-w-0 flex-1 text-sm line-through">
              {del?.name ?? entry.delegationId}
            </span>
            <span class="text-[10px] text-muted-foreground">已完成</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
