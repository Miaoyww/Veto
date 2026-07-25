<script lang="ts">
  import {
    Mic, Trash2, Users
  } from '@lucide/svelte'
  import ActiveSpeakerCard from '$lib/components/conference/speakers/active-speaker-card.svelte'
  import ReadySpeakerCard from '$lib/components/conference/speakers/ready-speaker-card.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
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
  import { onDestroy } from 'svelte'
  import {
    createTimer,
    getTimer,
    destroyTimer
  } from '$lib/engine/conference-engine'
  import { formatTime } from '$lib/utils'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import type { YieldChoice } from '$lib/types-conference'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'

  const conf = $derived($currentConference)

  // 已存在于发言名单中的代表团 ID
  const listedDelegationIds = $derived(conf?.speakersList.map((s) => s.delegationId) ?? [])

  function addSpeaker(delegationId: string): void {
    addToSpeakersList(delegationId)
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
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  function onExpire(): void {
    endSpeaker()
    isPaused = false
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
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
    createTimer('speakers-list', 100).start(entry.allocatedTimeSec, onTick, onExpire)
    // 立即同步到 Display（确保 ready→speaking 切换及时）
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  /** 暂停计时 */
  function pauseSpeaking(): void {
    const remaining = getTimer('speakers-list')?.pause() ?? 0
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
    getTimer('speakers-list')?.resume(onTick, onExpire)
    // 立即同步到 Display
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  function finishSpeaker(yieldType?: YieldChoice['type']): void {
    getTimer('speakers-list')?.stop()
    isPaused = false
    if (yieldType) {
      handleYield({ type: yieldType })
    } else {
      endSpeaker()
    }
    const c = get(currentConference)
    if (c) getDisplayBridge().sendUpdate(buildDisplayData(c))
  }

  const activeSpeaker = $derived(conf?.speakersList.find((s) => s.status === 'speaking') ?? null)
  const readyEntry = $derived(conf?.speakersList.find((s) => s.status === 'ready') ?? null)
  const waitingSpeakers = $derived(conf?.speakersList.filter((s) => s.status === 'waiting') ?? [])
  const isSpeakerActive = $derived(activeSpeaker !== null)

  // 组件卸载时销毁计时器
  onDestroy(() => destroyTimer('speakers-list'))
</script>

<div class="flex w-full max-w-3xl flex-col gap-4">
  <!-- 当前发言人 -->
  {#if isSpeakerActive && activeSpeaker && conf}
    {@const del = conf.delegations.find((d) => d.id === activeSpeaker.delegationId)}
    <ActiveSpeakerCard
      delegationName={del?.name ?? activeSpeaker.delegationId}
      remainingSec={displayRemaining}
      elapsedSec={displayElapsed}
      totalSec={displayTotal}
      {isPaused}
      onpause={pauseSpeaking}
      onresume={resumeSpeaking}
      onend={() => finishSpeaker()}
      onyield={(type) => finishSpeaker(type)}
    />
  {:else if readyEntry && conf}
    {@const del = conf.delegations.find((d) => d.id === readyEntry.delegationId)}
    <ReadySpeakerCard
      delegationName={del?.name ?? readyEntry.delegationId}
      allocatedTimeSec={readyEntry.allocatedTimeSec}
      onstart={() => beginSpeaking(readyEntry.id)}
      oncancel={() => removeFromSpeakersList(readyEntry.id)}
    />
  {:else}
    <!-- 添加发言人 -->
    <div class="rounded-lg border bg-card p-4">
      {#if conf}
        <DelegationSelector
          delegations={conf.delegations}
          placeholder="搜索代表团名称..."
          onselect={addSpeaker}
          resetOnSelect={true}
          excludeIds={listedDelegationIds}
        />
      {/if}
    </div>
  {/if}

  <!-- 下一个发言（仅当没有活跃发言者且无 ready 条目时显示） -->
  {#if !isSpeakerActive && readyEntry === null && waitingSpeakers.length > 0}
    {@const next = waitingSpeakers[0]}
    {@const nextDel = conf?.delegations.find((d) => d.id === next.delegationId)}
    <div
      class="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20"
    >
      <div class="flex items-center gap-3">
        <div
          class="h-3 w-3 shrink-0 rounded-full"
          style="background-color: {nextDel?.color ?? '#888'}"
        ></div>
        <span class="text-xs font-medium text-amber-700 dark:text-amber-400">下一个发言</span>
        <div class="flex-1"></div>
        <Badge variant="secondary" class="text-[10px]">
          {formatTime(next.allocatedTimeSec)}
        </Badge>
        <Button
          size="sm"
          class="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
          onclick={() => prepareSpeaker(next.id)}
        >
          <Mic size={12} />
          发言
        </Button>
      </div>
      <div class="mt-2 text-lg font-semibold text-foreground">
        {nextDel?.name ?? next.delegationId}
      </div>
    </div>
  {/if}

  <!-- 等待队列 -->
  <div class="rounded-lg border bg-card">
    <div class="flex items-center gap-2 px-4 py-3">
      <Users size={14} class="text-muted-foreground" />
      <span class="text-sm font-medium text-foreground">
        发言队列 ({waitingSpeakers.length})
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
        {/each}
      </div>
    {/if}
  </div>
</div>
