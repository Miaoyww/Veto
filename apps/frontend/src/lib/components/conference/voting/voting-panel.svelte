<script lang="ts">
  import { Vote, Check, X, Minus, SkipForward, ArrowRight } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
  } from '$lib/components/ui/card/index.js'
  import {
    currentConference,
    castVote,
    closeVotingSession,
    tallyVotes
  } from '$lib/classes/stores/conference/conference-store'
  import { calculateMajorityThresholds } from '$lib/classes/services/engine/conference-engine'
  import { cn } from '$lib/classes/utils.js'
  import PanelHeader from '../common/panel-header.svelte'

  const conf = $derived($currentConference)

  // 找到当前进行中的投票；若无则回退到最近一次已结束的投票（展示结果）
  const activeSession = $derived(
    conf?.votingSessions.find((s) => !s.endedAt) ??
      (() => {
        const ended = conf?.votingSessions
          .filter((s) => s.endedAt)
          .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
        return ended?.[0] ?? null
      })()
  )

  // 获取关联的动议信息
  const targetMotion = $derived(
    activeSession?.targetType === 'motion'
      ? conf?.motions.find((m) => m.id === activeSession.targetId)
      : null
  )
  const documentName = $derived(
    targetMotion?.type === 'substantive_vote'
      ? ((targetMotion as any).documentName as string | undefined)
      : undefined
  )

  const thresholds = $derived(conf ? calculateMajorityThresholds(conf.delegations) : null)

  const tally = $derived(
    activeSession ? tallyVotes(activeSession.ballots) : { yes: 0, no: 0, abstain: 0 }
  )

  const totalVoted = $derived(tally.yes + tally.no + tally.abstain)

  // 兼容旧数据
  const currentDelegationId = $derived(activeSession?.currentDelegationId ?? null)
  const isRound2 = $derived((activeSession?.round ?? 1) === 2)
  const isVotingComplete = $derived(activeSession ? currentDelegationId === null : true)

  // 按 sortOrder 排序的出席代表团列表
  const presentDelegations = $derived(
    conf
      ? [...conf.delegations]
          .filter((d) => d.attendance === 'present' && d.vetoPower !== false)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : []
  )

  // 当前正在投票的代表团
  const currentDelegation = $derived(
    presentDelegations.find((d) => d.id === currentDelegationId) ?? null
  )

  // 当前代表团的序号（1-based）
  const currentPosition = $derived(
    currentDelegation ? presentDelegations.findIndex((d) => d.id === currentDelegationId) + 1 : 0
  )

  function handleCloseVoting(): void {
    if (activeSession && !activeSession.endedAt) {
      closeVotingSession(activeSession.id)
    }
  }

  function getVoteLabel(delegationId: string): string {
    const ballot = activeSession?.ballots.find((b) => b.delegationId === delegationId)
    if (!ballot) return ''
    switch (ballot.vote) {
      case 'yes':
        return '赞成'
      case 'no':
        return '反对'
      case 'abstain':
        return '弃权'
      case 'skip':
        return '跳过'
      default:
        return ''
    }
  }

  function getVoteBadgeVariant(
    delegationId: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' {
    const ballot = activeSession?.ballots.find((b) => b.delegationId === delegationId)
    if (!ballot) return 'outline'
    switch (ballot.vote) {
      case 'yes':
        return 'default'
      case 'no':
        return 'destructive'
      case 'abstain':
        return 'secondary'
      case 'skip':
        return 'outline'
      default:
        return 'outline'
    }
  }
</script>

<div class="flex w-full flex-col gap-6">
  {#if activeSession && conf}
    <!-- ====== 标题 ====== -->
    <div class="text-center">
      {#if documentName}
        <p class="mt-1 text-base font-semibold text-foreground">「{documentName}」</p>
      {/if}
      <p class="mt-1 text-sm text-muted-foreground">
        {activeSession.majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'}表决
      </p>
    </div>

    <!-- ====== 统计卡片 ====== -->
    {#if thresholds}
      <div class="grid grid-cols-4 gap-3">
        <Card
          class="border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
        >
          <CardContent class="p-3 text-center">
            <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{tally.yes}</div>
            <div class="text-[10px] text-muted-foreground">赞成</div>
          </CardContent>
        </Card>
        <Card class="border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30">
          <CardContent class="p-3 text-center">
            <div class="text-2xl font-bold text-red-700 dark:text-red-400">{tally.no}</div>
            <div class="text-[10px] text-muted-foreground">反对</div>
          </CardContent>
        </Card>
        <Card class="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <CardContent class="p-3 text-center">
            <div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{tally.abstain}</div>
            <div class="text-[10px] text-muted-foreground">弃权</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-3 text-center">
            <div class="text-2xl font-bold text-muted-foreground">
              {totalVoted}/{thresholds.presentCount}
            </div>
            <div class="text-[10px] text-muted-foreground">已投/实到</div>
          </CardContent>
        </Card>
      </div>
    {/if}

    <!-- ====== 三态：正在投票 / 投票完成 / 结果展示 ====== -->
    {#if activeSession.result}
      <!-- 状态 ③：结果展示 -->
      <Card
        class={activeSession.result === 'passed'
          ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/10'
          : 'border-red-300 bg-red-50/30 dark:border-red-700 dark:bg-red-950/10'}
      >
        <CardHeader class="text-center">
          <CardTitle
            class={activeSession.result === 'passed'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'}
          >
            {#if activeSession.result === 'passed'}
              <Check size={28} class="mx-auto mb-2" />
              表决通过
            {:else}
              <X size={28} class="mx-auto mb-2" />
              表决未通过
            {/if}
          </CardTitle>
          <CardDescription>
            {activeSession.majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'}表决 · {totalVoted}
            票已投
          </CardDescription>
        </CardHeader>
      </Card>
    {:else if currentDelegation}
      <!-- 状态 ①：正在投票 -->
      <Card class="border-2 border-blue-300 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-950/10">
        <CardHeader class="pb-3 text-center">
          <div class="flex items-center justify-center gap-2">
            <span class="text-xs text-muted-foreground">
              共 {presentDelegations.length} 代表团，当前第 {currentPosition} 位
            </span>
          </div>
          <CardTitle class="text-2xl">{currentDelegation.name}</CardTitle>
          {#if currentDelegation.shortName}
            <CardDescription>{currentDelegation.shortName}</CardDescription>
          {/if}
        </CardHeader>
        <CardContent>
          <div class="flex items-center justify-center gap-3">
            <Button
              size="lg"
              variant="outline"
              class="h-11 min-w-[100px] gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              onclick={() => castVote(activeSession.id, currentDelegation.id, 'yes')}
            >
              <Check size={18} />
              赞成
            </Button>
            <Button
              size="lg"
              variant="outline"
              class="h-11 min-w-[100px] gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
              onclick={() => castVote(activeSession.id, currentDelegation.id, 'no')}
            >
              <X size={18} />
              反对
            </Button>
            {#if !isRound2}
              <Button
                size="lg"
                variant="outline"
                class="h-11 min-w-[100px] gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                onclick={() => castVote(activeSession.id, currentDelegation.id, 'abstain')}
              >
                <Minus size={18} />
                弃权
              </Button>
              <Button
                size="lg"
                variant="outline"
                class="h-11 min-w-[100px] gap-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-950/40"
                onclick={() => castVote(activeSession.id, currentDelegation.id, 'skip')}
              >
                <SkipForward size={18} />
                跳过
              </Button>
            {/if}
          </div>
        </CardContent>
      </Card>
    {:else if isVotingComplete}
      <!-- 状态 ②：投票完成 -->
      <Card
        class="border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/10"
      >
        <CardHeader class="text-center">
          <CardTitle class="text-emerald-700 dark:text-emerald-400">
            <Check size={24} class="mx-auto mb-2" />
            全部代表团已完成投票
          </CardTitle>
          <CardDescription>所有代表团均已投票，可公布结果</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex justify-center">
            <Button variant="outline" size="lg" class="gap-2" onclick={handleCloseVoting}>
              <Vote size={16} />
              结束投票并公布结果
            </Button>
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- ====== 代表团投票列表 ====== -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">投票记录</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          {#each presentDelegations as delegation (delegation.id)}
            {@const ballot = activeSession.ballots.find((b) => b.delegationId === delegation.id)}
            {@const isCurrent = currentDelegationId === delegation.id}
            {@const hasVoted = !!ballot}
            <div
              class={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors',
                isCurrent &&
                  !activeSession.result &&
                  'bg-blue-50/60 ring-1 ring-inset ring-blue-300 dark:bg-blue-950/20 dark:ring-blue-700'
              )}
            >
              <span class="min-w-0 flex-1 text-sm">
                {delegation.name}
              </span>
              {#if hasVoted}
                <Badge variant={getVoteBadgeVariant(delegation.id)} class="text-xs">
                  {getVoteLabel(delegation.id)}
                </Badge>
              {:else if isCurrent && !activeSession.result}
                <Badge variant="outline" class="animate-pulse text-xs">
                  <ArrowRight size={10} class="mr-1" />
                  投票中
                </Badge>
              {:else}
                <span class="text-xs text-muted-foreground">—</span>
              {/if}
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {:else}
    <!-- 空状态 -->
    <Card>
      <CardContent class="p-12 text-center">
        <Vote size={40} class="mx-auto mb-3 opacity-30" />
        <p class="text-muted-foreground">没有进行中的投票</p>
        <p class="mt-1 text-xs text-muted-foreground/70">对动议提出表决即可在此界面进行投票</p>
      </CardContent>
    </Card>
  {/if}
</div>
