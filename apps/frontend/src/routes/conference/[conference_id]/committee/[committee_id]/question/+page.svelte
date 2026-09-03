<script lang="ts">
  /**
   * conference/[conference_id]/question.svelte
   * ─────────────────────────────────────────
   * 问题页面 —— 提交问题后导航至此页，主席可随时结束问题返回。
   */
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import { AlertTriangle, HelpCircle, User, ArrowLeft } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import {
    currentConference,
    currentConferenceId,
    loadConference,
    dismissLatestPoint
  } from '$lib/classes/stores/conference/conference-store'
  import { POINT_LABELS } from '$lib/classes/types/conference'
  import type { PointType } from '$lib/classes/types/conference'
  import { getDisplayBridge, buildDisplayData } from '$lib/classes/clients/conference-display-client'
  import { VETO_NAME } from '$lib/classes/const'

  const conferenceId = $derived($page.params.conference_id ?? null)
  const committeeId = $derived($page.params.committee_id ?? null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded = $currentConferenceId === conferenceId
      if (!alreadyLoaded) {
        loadConference(conferenceId)
      }
    }
  })

  const conf = $derived($currentConference)

  const latestPoint = $derived(
    conf && conf.points.length > 0 ? conf.points[conf.points.length - 1] : null
  )

  const proposerDel = $derived(
    latestPoint
      ? conf?.delegations.find((d) => d.id === latestPoint.proposedByDelegationId)
      : null
  )

  const POINT_ICONS: Record<PointType, typeof AlertTriangle> = {
    point_of_order: AlertTriangle,
    point_of_inquiry: HelpCircle,
    point_of_personal_privilege: User
  }

  const POINT_COLORS: Record<PointType, string> = {
    point_of_order: 'text-amber-500',
    point_of_inquiry: 'text-blue-500',
    point_of_personal_privilege: 'text-emerald-500'
  }

  const POINT_BG_COLORS: Record<PointType, string> = {
    point_of_order: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30',
    point_of_inquiry: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30',
    point_of_personal_privilege: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
  }

  function handleEnd(): void {
    dismissLatestPoint()
    goBack()
  }

  function goBack(): void {
    if (conf) {
      goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))
    }
  }

  // 如果没有最近的问题，自动返回
  $effect(() => {
    if (conf && !latestPoint) {
      goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))
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
  <title>{VETO_NAME} - 问题</title>
</svelte:head>

<div class="flex h-full w-full flex-col bg-background">
  {#if conf && latestPoint}
    {@const Icon = POINT_ICONS[latestPoint.type] ?? HelpCircle}
    {@const iconColor = POINT_COLORS[latestPoint.type]}
    {@const bgColor = POINT_BG_COLORS[latestPoint.type]}

    <!-- 顶部栏 -->
    <div class="flex items-center gap-4 border-b px-6 py-3">
      <Button size="sm" variant="ghost" class="h-8 gap-1.5 text-xs" onclick={goBack}>
        <ArrowLeft size={14} />
        返回
      </Button>
      <div class="flex items-center gap-2">
        <HelpCircle size={16} class="text-amber-500" />
        <span class="text-sm font-semibold text-foreground">问题</span>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="flex flex-1 items-center justify-center p-8">
      <div class="flex w-full max-w-xl flex-col gap-6">
        <!-- 问题详情 -->
        <div class="rounded-lg border-2 {bgColor} p-8 text-center">
          <div class="flex items-center justify-center gap-2">
            <Icon size={24} class={iconColor} />
            <span class="text-lg font-semibold {iconColor}">
              问题
            </span>
          </div>

          <div class="mt-4 space-y-2">
            <div class="text-2xl font-bold text-foreground">
              {POINT_LABELS[latestPoint.type]}
            </div>
            <div class="text-base text-muted-foreground">
              由 <span class="font-semibold text-foreground">{proposerDel?.name ?? latestPoint.proposedByDelegationId}</span> 提出
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-center">
          <Button
            size="lg"
            class="min-w-[200px] gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            onclick={handleEnd}
          >
            结束问题
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
