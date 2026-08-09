<script lang="ts">
  import { Timer, Plus, Check, Copy, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Popover from '$lib/components/ui/popover'
  import * as Command from '$lib/components/ui/command'
  import { standaloneTimer, timerDialogOpen } from '$lib/stores/conference/timer-store'
  import { formatTime } from '$lib/utils'
  import { timelines } from '$lib/stores/timeline-store'
  import { currentConference, bindTimeline } from '$lib/stores/conference/conference-store'

  // ─── 时间线数据 ──────────────────────────────────────────────────────

  const conf = $derived($currentConference)
  const timelineId = $derived(conf?.timelineId ?? null)
  const timeline = $derived(timelineId ? $timelines.find((t) => t.id === timelineId) : null)
  const timelineItems = $derived($timelines.map((t) => ({ value: t.id, label: t.name })))

  const tlState = $derived(timeline?.state)
  const tlPaused = $derived(tlState?.paused ?? true)
  const tlSimAnchor = $derived(tlState?.simulationAnchor ?? 0)
  const tlRealAnchor = $derived(tlState?.realAnchor ?? 0)
  const tlRatio = $derived(tlState?.ratio ?? 1)
  const tlPausedSimTime = $derived(tlState?.pausedSimulationTime)

  let liveSimTime = $state(
    tlPaused
      ? (tlPausedSimTime ?? tlSimAnchor)
      : tlSimAnchor + (Date.now() - tlRealAnchor) * tlRatio
  )

  $effect(() => {
    if (tlPaused || !timeline) {
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
    await navigator.clipboard.writeText(formatSimTime(liveSimTime))
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

  const visible = $derived($standaloneTimer != null || timeline != null || timelineItems.length > 0)
</script>

{#if visible}
  <div class="flex justify-center px-4 pb-1">
    <div
      class="flex items-center gap-3 rounded-full bg-foreground px-4 py-1.5 text-xs text-background shadow-lg transition-all duration-300"
    >
      {#if $standaloneTimer}
        {@const st = $standaloneTimer}
        {@const expired = !st.isRunning && st.remainingSec <= 0}
        <Button
          variant="ghost"
          size="xs"
          class="h-auto gap-1 rounded-full px-1.5 py-0 font-mono tabular-nums hover:bg-white/10 {expired
            ? 'text-red-400'
            : st.isRunning
              ? 'text-indigo-300'
              : 'text-amber-300'}"
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
          <span class="h-4 w-px bg-background/20" />
        {/if}
      {/if}

      {#if timeline}
        <div class="flex items-center gap-1.5">
          <span class="font-mono tabular-nums">{formatSimTime(liveSimTime)}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 text-background/70 hover:bg-white/10 hover:text-background"
            title="复制模拟时间"
            onclick={copySimTime}
          >
            {#if copied}
              <Check size={11} class="text-green-400" />
            {:else}
              <Copy size={11} />
            {/if}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 text-background/70 hover:bg-white/10 hover:text-red-400"
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
                class="h-auto gap-1 rounded-full px-1.5 py-0 text-background/70 hover:bg-white/10 hover:text-background"
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
    </div>
  </div>
{/if}
