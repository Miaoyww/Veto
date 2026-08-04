<script lang="ts">
  import {
    Users,
    Gavel,
    Building2,
    ArrowLeft,
    Calculator,
    Clock,
    Copy,
    Check,
    UserRoundCheck,
    UsersRound,
    X
  } from '@lucide/svelte'
  import { navigate } from '$lib/router.svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { bindTimeline } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { timelines } from '$lib/stores/timeline-store'
  import { Button } from '$lib/components/ui/button'
  import * as Popover from '$lib/components/ui/popover'
  import * as Command from '$lib/components/ui/command'
  import { cn } from '$lib/utils.js'
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'

  const conf = $derived($currentConference)

  const presentCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present').length ?? 0
  )
  const votingCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length ?? 0
  )
  const simpleMajority = $derived(Math.floor(votingCount / 2) + 1)
  const twoThirds = $derived(Math.ceil((votingCount * 2) / 3))

  // ── 时间线绑定 ──────────────────────────────────────────────────────────

  const timelineId = $derived(conf?.timelineId ?? null)
  const timeline = $derived(timelineId ? $timelines.find((t) => t.id === timelineId) : null)
  const timelineItems = $derived($timelines.map((t) => ({ value: t.id, label: t.name })))

  function formatSimTime(ts: number): string {
    const d = new Date(ts)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }

  // 实时模拟时间（RAF 循环）
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

  let copied = $state(false)

  async function copySimTime(): Promise<void> {
    await navigator.clipboard.writeText(formatSimTime(liveSimTime))
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  let timelinePopoverOpen = $state(false)

  function handleBind(timelineId: string): void {
    if (conf) {
      bindTimeline(conf.id, timelineId)
    }
    timelinePopoverOpen = false
  }

  function handleUnbind(): void {
    if (conf) {
      bindTimeline(conf.id, null)
    }
  }
</script>

<aside class="flex h-full w-[260px] shrink-0 flex-col border-r bg-muted/30">
  {#if conf}
    <!-- 返回按钮 -->
    <div class="px-3 pt-2">
      <Button
        variant="ghost"
        size="sm"
        class="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onclick={() => navigate('/')}
      >
        <ArrowLeft size={14} />
        返回主页
      </Button>
    </div>

    <!-- 会场信息 -->
    <div class="px-5 pt-2 pb-2">
      <h1 class="text-base font-bold leading-tight text-foreground">{conf.name}</h1>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <span class="inline-flex items-center gap-1 py-0.5 text-[11px] font-medium">
          {conf.venue}
        </span>
      </div>
    </div>

    <!-- 时间线 -->
    <div class="px-5 pb-2">
      <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock size={12} />
        <span>时间线</span>
      </div>

      {#if timeline}
        <div class="mt-1.5 flex items-center gap-1.5">
          <span
            class="min-w-0 truncate text-xs font-medium text-indigo-600 dark:text-indigo-400 tabular-nums"
          >
            {formatSimTime(liveSimTime)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 shrink-0 text-muted-foreground hover:text-foreground"
            title="复制模拟时间"
            onclick={copySimTime}
          >
            {#if copied}
              <Check size={11} class="text-green-500" />
            {:else}
              <Copy size={11} />
            {/if}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            class="size-5 shrink-0 text-muted-foreground hover:text-red-500"
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
                size="sm"
                class="mt-1 h-7 w-full justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                {...props}
              >
                <span class="text-[10px]">+</span>
                绑定时间线
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

    <!-- 表决信息 -->
    <div class="px-5 pb-3">
      <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>表决信息</span>
      </div>
      <div class="mt-1.5 grid grid-cols-2 gap-2">
        <div class="rounded-md bg-muted px-2.5 py-1.5">
          <div class="text-[10px] text-muted-foreground">简单多数</div>
          <div class="text-sm font-bold text-foreground">{simpleMajority}</div>
        </div>
        <div class="rounded-md bg-muted px-2.5 py-1.5">
          <div class="text-[10px] text-muted-foreground">2/3 多数</div>
          <div class="text-sm font-bold text-foreground">{twoThirds}</div>
        </div>
      </div>
    </div>

    <!-- 代表团列表 -->
    <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div class="flex shrink-0 items-start gap-1.5 px-5 pb-2">
        <Users size={12} class="text-muted-foreground shrink-0 mt-0.5" />
        <div class="flex flex-col min-w-0">
          <span class="text-[11px] font-medium text-muted-foreground">代表团</span>
          <span class="text-[10px] text-muted-foreground/60">
            {presentCount}/{conf.delegations.length} 出席，{votingCount} 可投票
          </span>
        </div>
        <div class="flex-1"></div>
        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1 text-[10px]"
          onclick={() => navigate(`/conference/${conf.id}/delegations`)}
        >
          <UserRoundCheck size={10} />
          代表管理
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1 text-[10px] ml-1"
          onclick={() => navigate(`/conference/${conf.id}/seats`)}
        >
          <UsersRound size={10} />
          席位管理
        </Button>
      </div>

      <ScrollArea class="flex-1 min-h-0">
        <div class="px-3 pb-3">
          {#each conf.delegations as delegation (delegation.id)}
            {@const isPresent = delegation.attendance === 'present'}
            {@const isObserver = isPresent && delegation.vetoPower === false}
            {@const isVoter = isPresent && !isObserver}
            <div
              class={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                isPresent ? '' : 'opacity-50'
              )}
            >
              <!-- 名称 -->
              <span class="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {delegation.name}
              </span>
              <!-- 出席状态 icon -->
              <span class="shrink-0 text-[10px]">
                {#if isVoter}
                  <span class="text-emerald-500">●</span>
                {:else if isObserver}
                  <span class="text-blue-500">●</span>
                {:else}
                  <span class="text-muted-foreground/40">○</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </ScrollArea>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center px-5 text-center">
      <p class="text-sm text-muted-foreground">未加载大会</p>
    </div>
  {/if}
</aside>
