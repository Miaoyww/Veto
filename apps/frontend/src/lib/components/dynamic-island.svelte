<!-- Hallmark · component scope · inherited workbench theme · pre-emit critique: P4 H4 E4 S4 R5 V4 -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Clock3, Timer, Plus, Check, Copy, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Popover from '$lib/components/ui/popover'
  import * as Command from '$lib/components/ui/command'
  import { standaloneTimer, timerDialogOpen } from '$lib/classes/stores/conference/timer-store'
  import { formatTime } from '$lib/classes/formatters/time-formater'
  import { timelines } from '$lib/classes/stores/timeline-store'
  import { currentConferenceRecord, bindTimeline } from '$lib/classes/stores/conference/conference-store'
  import type { CloudTimeline } from '$lib/classes/clients/cloud-situation-client'

  let {
    cloudMode = false,
    cloudTimeline = null,
    cloudTimezone = 'Asia/Shanghai',
    cloudTimelineReceivedAt = 0
  }: {
    cloudMode?: boolean
    cloudTimeline?: CloudTimeline | null
    cloudTimezone?: string
    cloudTimelineReceivedAt?: number
  } = $props()

  let clockNow = $state(Date.now())
  onMount(() => {
    const interval = window.setInterval(() => (clockNow = Date.now()), 1000)
    return () => window.clearInterval(interval)
  })
  const cloudTime = $derived(
    cloudTimeline
      ? cloudTimeline.currentTime +
          (cloudTimeline.paused ? 0 : (clockNow - cloudTimelineReceivedAt) * cloudTimeline.ratio)
      : null
  )

  function formatCloudTime(ts: number, short = false): string {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: cloudTimezone,
      ...(!short ? { year: 'numeric' as const } : {}),
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(ts)
  }

  // ─── 时间线数据 ──────────────────────────────────────────────────────

  const conf = $derived($currentConferenceRecord)
  const timelineId = $derived(conf?.timelineId ?? null)
  const timeline = $derived(timelineId ? $timelines.find((t) => t.id === timelineId) : null)
  const timelineItems = $derived($timelines.map((t) => ({ value: t.id, label: t.name })))

  const tlState = $derived(timeline?.state)
  const tlPaused = $derived(tlState?.paused ?? true)
  const tlSimAnchor = $derived(tlState?.simulationAnchor ?? 0)
  const tlRealAnchor = $derived(tlState?.realAnchor ?? 0)
  const tlRatio = $derived(tlState?.ratio ?? 1)
  const tlPausedSimTime = $derived(tlState?.pausedSimulationTime)

  let liveSimTime = $state(0)

  $effect(() => {
    if (cloudMode || tlPaused || !timeline) {
      liveSimTime = tlPausedSimTime ?? tlSimAnchor
      return () => {}
    }

    let rafId: number
    const loop = () => {
      liveSimTime = tlSimAnchor + (Date.now() - tlRealAnchor) * tlRatio
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafId)
  })

  function formatSimTime(ts: number): string {
    const d = new Date(ts)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }

  let copied = $state(false)

  async function copySimTime(): Promise<void> {
    await navigator.clipboard.writeText(
      cloudMode && cloudTime !== null ? formatCloudTime(cloudTime) : formatSimTime(liveSimTime)
    )
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  let timelinePopoverOpen = $state(false)

  function handleBind(value: string): void {
    if (conf) {
      bindTimeline(conf.id, value)
    }
    timelinePopoverOpen = false
  }

  function handleUnbind(): void {
    if (conf) {
      bindTimeline(conf.id, null)
    }
  }

  // ─── 可见性 ──────────────────────────────────────────────────────────

  const visible = $derived(
    cloudMode || $standaloneTimer != null || timeline != null || timelineItems.length > 0
  )
</script>

{#if visible}
  <div class="flex min-w-0 justify-center">
    <div
      class="flex h-7 min-w-0 items-center gap-2 px-1 text-xs text-foreground"
    >
      {#if cloudMode}
        {#if cloudTimeline && cloudTime !== null}
          <Clock3 class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="hidden max-w-24 truncate text-muted-foreground lg:inline" title={cloudTimeline.name}>{cloudTimeline.name}</span>
          <span class="whitespace-nowrap font-mono font-medium tabular-nums" title={`${cloudTimeline.name} · ${cloudTimeline.paused ? '已暂停' : `${cloudTimeline.ratio}x 运行中`}`}>
            <span class="sm:hidden">{formatCloudTime(cloudTime, true)}</span>
            <span class="hidden sm:inline">{formatCloudTime(cloudTime)}</span>
          </span>
          <span class="hidden whitespace-nowrap text-muted-foreground lg:inline">
            {cloudTimeline.paused ? '暂停' : `${cloudTimeline.ratio}x`}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="复制模拟时间"
            aria-label="复制模拟时间"
            onclick={copySimTime}
          >
            {#if copied}<Check size={11} />{:else}<Copy size={11} />{/if}
          </Button>
        {:else}
          <Clock3 class="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span class="whitespace-nowrap text-muted-foreground">未配置时间线</span>
        {/if}
      {:else}
      {#if $standaloneTimer}
        {@const st = $standaloneTimer}
        {@const expired = !st.isRunning && st.remainingSec <= 0}
        <Button
          variant="ghost"
          size="xs"
          class="h-auto gap-1 px-1.5 py-0 font-mono tabular-nums hover:bg-accent {expired
            ? 'text-destructive'
            : st.isRunning
              ? 'text-foreground'
              : 'text-muted-foreground'}"
          onclick={() => timerDialogOpen.set(true)}
          title={expired
            ? '计时器已到期（点击打开）'
            : st.isRunning
              ? '计时器运行中（点击打开）'
              : '计时器已暂停（点击打开）'}
        >
          <Timer size={12} class={expired ? 'animate-pulse' : ''} />
          <span>{formatTime(st.remainingSec)}</span>
        </Button>
        {#if timeline || timelineItems.length > 0}
          <span class="h-4 w-px bg-border"></span>
        {/if}
      {/if}

      {#if timeline}
        <div class="flex items-center gap-1.5">
          <span class="font-mono tabular-nums">{formatSimTime(liveSimTime)}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="复制模拟时间"
            onclick={copySimTime}
          >
            {#if copied}
              <Check size={11} />
            {:else}
              <Copy size={11} />
            {/if}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 text-muted-foreground hover:bg-accent hover:text-destructive"
            title="解除绑定"
            onclick={handleUnbind}
          >
            <X size={11} />
          </Button>
        </div>
      {:else if timelineItems.length > 0}
        <Popover.Root bind:open={timelinePopoverOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button
                variant="ghost"
                size="xs"
                class="h-auto gap-1 px-1.5 py-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                {...props}
              >
                <Plus size={11} />
                <span>绑定时间线</span>
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[200px] p-0">
            <Command.Root>
              <Command.Input placeholder="搜索..." />
              <Command.List>
                <Command.Empty>无匹配结果</Command.Empty>
                <Command.Group>
                  {#each timelineItems as item (item.value)}
                    <Command.Item value={item.value} onSelect={() => handleBind(item.value)}>
                      {item.label}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      {/if}
      {/if}
    </div>
  </div>
{/if}
