<script lang="ts">
  import {
    Mic, MicOff, Clock, Trash2, Users, ArrowRight, MessageCircle,
    HelpCircle, UserPlus, Pause, Play
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { get } from 'svelte/store'
  import {
    currentConference,
    addToSpeakersList,
    removeFromSpeakersList,
    readySpeaker,
    startSpeaker,
    pauseSpeaker,
    resumeSpeaker,
    endSpeaker,
    handleYield
  } from '$lib/stores/conference/conference-store'
  import {
    startSpeakerTimer,
    pauseSpeakerTimer,
    resumeSpeakerTimer,
    stopSpeakerTimer,
    formatTime
  } from '$lib/engine/conference-engine'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import type { YieldChoice } from '$lib/types-conference'
  import Fuse from 'fuse.js'
  import PinyinMatch from 'pinyin-match'

  const conf = $derived($currentConference)

  // ---- Fuse.js 实例（delegations 变化时重建） ----
  const fuse = $derived.by(() => {
    const delegations = conf?.delegations ?? []
    return new Fuse(delegations, {
      keys: ['name', 'shortName'],
      threshold: 0.4,
      includeScore: true
    })
  })

  // ---- Speaker input ----
  let speakerInput = $state('')
  let showSuggestions = $state(false)

  // 模糊搜索（fuse.js + pinyin-match）
  const suggestions = $derived.by(() => {
    const query = speakerInput.trim().toLowerCase()
    if (!query || !conf) return [] as Array<{ id: string; name: string; shortName?: string; color: string }>

    const results: Array<{ id: string; name: string; shortName?: string; color: string; _score: number }> = []
    const seen = new Set<string>()

    const addResult = (d: typeof conf.delegations[number], score: number) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      results.push({ id: d.id, name: d.name, shortName: d.shortName, color: d.color, _score: score })
    }

    // 1. 直接子串匹配（最高优先级）
    for (const d of conf.delegations) {
      if (
        d.name.toLowerCase().includes(query) ||
        d.shortName?.toLowerCase().includes(query)
      ) {
        addResult(d, 0)
      }
    }

    // 2. 拼音匹配（全拼 & 首字母）
    for (const d of conf.delegations) {
      const matchName = PinyinMatch.match(d.name, query)
      const matchShort = d.shortName ? PinyinMatch.match(d.shortName, query) : false
      if (matchName || matchShort) {
        addResult(d, 0.1)
      }
    }

    // 3. Fuse.js 模糊匹配（容错拼写）
    const fuseResults = fuse.search(query)
    for (const r of fuseResults) {
      addResult(r.item, (r.score ?? 0.5) + 0.2)
    }

    // 按得分排序，取前 6
    return results.sort((a, b) => a._score - b._score).slice(0, 6)
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
  let isPaused = $state(false)

  function onTick(data: { remainingSec: number; elapsedSec: number; totalSec: number }): void {
    displayRemaining = data.remainingSec
    displayElapsed = data.elapsedSec
    displayTotal = data.totalSec
  }

  function onExpire(): void {
    endSpeaker()
    stopSpeakerTimer()
    isPaused = false
  }

  /** Step 1: 预发言 — 标记代表团准备发言 */
  function prepareSpeaker(entryId: string): void {
    readySpeaker(entryId)
  }

  /** Step 2: 开始计时 — 从 ready 转为 speaking，启动倒计时 */
  function beginSpeaking(entryId: string): void {
    const entry = conf?.speakersList.find((s) => s.id === entryId)
    if (!entry) return

    startSpeaker(entryId)
    isPaused = false
    startSpeakerTimer(entry.allocatedTimeSec, onTick, onExpire)
    // 立即同步到 Display（确保 ready→speaking 切换及时）
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  /** 暂停计时 */
  function pauseSpeaking(): void {
    const remaining = pauseSpeakerTimer()
    displayRemaining = remaining
    isPaused = true
    pauseSpeaker()
    // 立即同步到 Display（确保暂停状态及时送达）
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  /** 继续计时 */
  function resumeSpeaking(): void {
    isPaused = false
    resumeSpeaker(displayRemaining)
    resumeSpeakerTimer(onTick, onExpire)
    // 立即同步到 Display
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  function finishSpeaker(yieldType?: YieldChoice['type']): void {
    stopSpeakerTimer()
    isPaused = false
    if (yieldType) {
      handleYield({ type: yieldType })
    } else {
      endSpeaker()
    }
  }

  const activeSpeaker = $derived(conf?.speakersList.find((s) => s.status === 'speaking') ?? null)
  const readyEntry = $derived(conf?.speakersList.find((s) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(conf?.speakersList.filter((s) => s.status === 'waiting') ?? [])
  const isSpeakerActive = $derived(activeSpeaker !== null)
</script>

<div class="flex w-full max-w-3xl flex-col gap-4">
  <!-- 当前发言人 -->
  {#if isSpeakerActive && activeSpeaker && conf}
    {@const del = conf.delegations.find((d) => d.id === activeSpeaker.delegationId)}
    <div class="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-700 dark:bg-emerald-950/30">
      <div class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        {isPaused ? '计时已暂停' : '正在发言'}
      </div>
      <div class="mt-1 text-2xl font-bold text-foreground">
        {del?.name ?? activeSpeaker.delegationId}
      </div>
      <div class="mt-3 font-mono text-5xl font-bold tabular-nums {isPaused ? 'text-muted-foreground' : 'text-foreground'}">
        {formatTime(displayRemaining)}
      </div>
      <div class="mt-1 text-xs text-muted-foreground">
        已用 {Math.floor(displayElapsed)}秒 / 共 {displayTotal}秒
      </div>

      <!-- 控制按钮组 -->
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        {#if isPaused}
          <Button size="sm" class="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700" onclick={resumeSpeaking}>
            <Play size={12} />
            继续计时
          </Button>
        {:else}
          <Button size="sm" variant="outline" class="h-8 gap-1.5 text-xs" onclick={pauseSpeaking}>
            <Pause size={12} />
            暂停
          </Button>
        {/if}
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

  {:else if readyEntry && conf}
    <!-- 预发言（即将发言） -->
    {@const del = conf.delegations.find((d) => d.id === readyEntry.delegationId)}
    <div class="rounded-lg border-2 border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-700 dark:bg-amber-950/30">
      <div class="text-sm font-medium text-amber-700 dark:text-amber-400">即将发言</div>
      <div class="mt-1 text-2xl font-bold text-foreground">
        {del?.name ?? readyEntry.delegationId}
      </div>
      <div class="mt-1 font-mono text-lg text-muted-foreground">
        {formatTime(readyEntry.allocatedTimeSec)}
      </div>
      <div class="mt-4 flex items-center justify-center gap-2">
        <Button size="sm" class="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700" onclick={() => beginSpeaking(readyEntry.id)}>
          <Play size={12} />
          开始计时
        </Button>
        <Button size="sm" variant="ghost" class="h-8 text-xs text-muted-foreground" onclick={() => removeFromSpeakersList(readyEntry.id)}>
          <Trash2 size={12} class="mr-1" />
          取消
        </Button>
      </div>
    </div>
  {:else}
    <!-- 添加发言人 -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex items-center gap-2">
        <UserPlus size={16} class="text-muted-foreground" />
        <div class="relative flex-1">
          <Input
            class="h-8 text-sm"
            placeholder="搜索代表团名称..."
            bind:value={speakerInput}
            onfocus={() => (showSuggestions = true)}
            onblur={() => setTimeout(() => (showSuggestions = false), 150)}
          />
          {#if showSuggestions && suggestions.length > 0}
            <div
              class="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
            >
              {#each suggestions as del}
                <button
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onclick={() => addSpeaker(del.id)}
                >
                  <span class="h-2 w-2 rounded-full" style="background-color: {del.color}"></span>
                  <span>{del.name}</span>
                  {#if del.shortName}
                    <span class="text-xs text-muted-foreground">{del.shortName}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- 等待列表 -->
  <div class="rounded-lg border bg-card">
    <div class="flex items-center gap-2 px-4 py-3">
      <Users size={14} class="text-muted-foreground" />
      <span class="text-sm font-medium text-foreground">
        待发言 ({waitingSpeakers.length})
      </span>
    </div>

    {#if waitingSpeakers.length === 0}
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
              <!-- 预发言：只标记 ready，不开始计时 -->
              <Button
                size="sm"
                variant="outline"
                class="h-7 gap-1 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                disabled={isSpeakerActive || readyEntry !== null}
                onclick={() => prepareSpeaker(entry.id)}
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
      </div>
    {/if}
  </div>
</div>
