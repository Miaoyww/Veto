<script lang="ts">
  /**
   * conference/[conference_id]/motion.svelte
   * ─────────────────────────────────────────
   * 动议表决页 —— 类似 roll-call 的单开页面。
   *
   * 当动议提交后导航至此页，主席团观察举牌后手动裁决。
   */
  import { onMount, onDestroy } from 'svelte'
  import { currentRoute, navigate } from '$lib/router.svelte'
  import {
    Presentation, Timer, MessageSquare, Pencil,
    Gavel, Coffee, LogOut, Check, X, ArrowLeft, Vote
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Separator } from '$lib/components/ui/separator'
  import {
    currentConference,
    currentConferenceId,
    loadConference,
    approveMotion,
    rejectMotion
  } from '$lib/stores/conference/conference-store'
  import { resolveMotion } from '$lib/engine/conference-engine'
  import { MOTION_LABELS } from '$lib/types-conference'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import { VETO_NAME } from '$lib/const'

  const conferenceId = $derived(currentRoute?.params?.conference_id ?? null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded = $currentConferenceId === conferenceId
      if (!alreadyLoaded) {
        loadConference(conferenceId)
      }
    }
  })

  const conf = $derived($currentConference)

  const MOTION_ICONS: Record<string, typeof Presentation> = {
    open_speakers_list: Presentation,
    moderated_caucus: MessageSquare,
    unmoderated_caucus: Coffee,
    modify_speaking_time: Pencil,
    closure_debate: Gavel,
    suspend_meeting: Timer,
    close_meeting: LogOut
  }

  const pendingMotion = $derived(
    conf?.motions.find((m) => m.status === 'pending') ?? null
  )

  const resolution = $derived(
    pendingMotion ? resolveMotion(pendingMotion.type) : null
  )

  const proposerDel = $derived(
    pendingMotion
      ? conf?.delegations.find((d) => d.id === pendingMotion.proposedByDelegationId)
      : null
  )

  const majorityLabel = $derived(
    resolution?.votingMajority === 'simple_majority' ? '简单多数' : '2/3多数'
  )

  function handleApprove(): void {
    if (!pendingMotion) return
    approveMotion(pendingMotion.id)
    goBack()
  }

  function handleReject(): void {
    if (!pendingMotion) return
    rejectMotion(pendingMotion.id)
    goBack()
  }

  function goBack(): void {
    if (conf) {
      navigate(`/conference/${conf.id}`)
    }
  }

  // 如果没有待表决动议，自动返回
  $effect(() => {
    if (conf && !pendingMotion) {
      // 检查是否有刚被处理的动议（短暂延迟后返回）
      const hasProcessedMotion = conf.motions.some(
        (m) => m.status === 'approved' || m.status === 'rejected'
      )
      if (!hasProcessedMotion) {
        navigate(`/conference/${conf.id}`)
      }
    }
  })

  // 同步 Display
  $effect(() => {
    if (conf) {
      getDisplayBridge().sendUpdate(buildDisplayData(conf))
    }
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 动议表决</title>
</svelte:head>

<div class="flex h-screen w-screen flex-col bg-background">
  {#if conf && pendingMotion}
    {@const Icon = MOTION_ICONS[pendingMotion.type] ?? Presentation}
    <!-- 顶部栏 -->
    <div class="flex items-center gap-4 border-b px-6 py-3">
      <Button size="sm" variant="ghost" class="h-8 gap-1.5 text-xs" onclick={goBack}>
        <ArrowLeft size={14} />
        返回
      </Button>
      <div class="flex items-center gap-2">
        <Vote size={16} class="text-indigo-500" />
        <span class="text-sm font-semibold text-foreground">动议表决</span>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="flex flex-1 items-center justify-center p-8">
      <div class="flex w-full max-w-xl flex-col gap-6">
        <!-- 动议详情 -->
        <div class="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-8 text-center dark:border-indigo-700 dark:bg-indigo-950/30">
          <div class="flex items-center justify-center gap-2">
            <Icon size={24} class="text-indigo-600 dark:text-indigo-400" />
            <span class="text-lg font-semibold text-indigo-700 dark:text-indigo-400">
              动议裁决
            </span>
          </div>

          <div class="mt-4 space-y-2">
            <div class="text-2xl font-bold text-foreground">
              {MOTION_LABELS[pendingMotion.type]}
            </div>
            <div class="text-base text-muted-foreground">
              由 <span class="font-semibold text-foreground">{proposerDel?.name ?? pendingMotion.proposedByDelegationId}</span> 提出
            </div>

            {#if pendingMotion.type === 'moderated_caucus'}
              <div class="mt-3 rounded-md bg-background/50 px-4 py-2.5 text-sm text-muted-foreground">
                <p>主题：<span class="font-medium text-foreground">{(pendingMotion as any).topic}</span></p>
                <p class="mt-0.5">
                  总时长 <span class="font-medium text-foreground">{(pendingMotion as any).totalTimeSec / 60} 分钟</span>
                  ，每人发言 <span class="font-medium text-foreground">{(pendingMotion as any).speakingTimePerPersonSec} 秒</span>
                  ，最多 <span class="font-medium text-foreground">{(pendingMotion as any).maxSpeakers}</span> 人
                </p>
              </div>
            {:else if pendingMotion.type === 'unmoderated_caucus'}
              <div class="mt-3 text-sm text-muted-foreground">
                时长 {(pendingMotion as any).durationSec / 60} 分钟
              </div>
            {:else if pendingMotion.type === 'modify_speaking_time'}
              <div class="mt-3 text-sm text-muted-foreground">
                新发言时间：<span class="font-medium text-foreground">{(pendingMotion as any).newTimeSec} 秒</span>
              </div>
            {/if}
          </div>

          <div class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-400">
            表决规则：{majorityLabel}
          </div>
        </div>

        <Separator />

        <!-- 主席裁决 -->
        <div class="text-center">
          <p class="text-base font-medium text-foreground">
            请支持该动议的代表团高举国家牌
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            主席团观察举牌后手动裁决
          </p>
        </div>

        <div class="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            class="min-w-[140px] gap-2 text-base text-red-600 hover:text-red-700"
            onclick={handleReject}
          >
            <X size={18} />
            否决
          </Button>
          <Button
            size="lg"
            class="min-w-[140px] gap-2 text-base"
            onclick={handleApprove}
          >
            <Check size={18} />
            通过
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center">
      <div class="flex flex-col items-center gap-4 text-muted-foreground">
        <Vote size={48} class="opacity-30" />
        <p class="text-lg font-medium">没有待表决的动议</p>
        <Button variant="outline" size="sm" onclick={goBack}>返回会议</Button>
      </div>
    </div>
  {/if}
</div>
