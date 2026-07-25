<script lang="ts">
  import { Vote, Check, X, Minus } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import {
    currentConference,
    castVote,
    closeVotingSession,
    tallyVotes
  } from '$lib/stores/conference/conference-store'
  import { calculateMajorityThresholds, determinePassFail } from '$lib/engine/conference-engine'
  import { cn } from '$lib/utils.js'

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

  // 获取关联的动议信息（用于实质性投票的文件名称）
  const targetMotion = $derived(
    activeSession?.targetType === 'motion'
      ? conf?.motions.find((m) => m.id === activeSession.targetId)
      : null
  )
  const documentName = $derived(
    targetMotion?.type === 'substantive_vote'
      ? (targetMotion as any).documentName as string | undefined
      : undefined
  )

  const thresholds = $derived(
    conf ? calculateMajorityThresholds(conf.delegations) : null
  )

  const tally = $derived(
    activeSession ? tallyVotes(activeSession.ballots) : { yes: 0, no: 0, abstain: 0 }
  )

  const totalVoted = $derived(tally.yes + tally.no + tally.abstain)

  function handleCloseVoting(): void {
    if (activeSession && !activeSession.endedAt) {
      closeVotingSession(activeSession.id)
    }
  }

  function getVoteButtonStyle(delegationId: string, voteType: 'yes' | 'no' | 'abstain'): string {
    const ballot = activeSession?.ballots.find((b) => b.delegationId === delegationId)
    const isSelected = ballot?.vote === voteType
    if (voteType === 'yes') {
      return isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'hover:bg-emerald-50 hover:text-emerald-700'
    }
    if (voteType === 'no') {
      return isSelected ? 'bg-red-600 text-white hover:bg-red-700' : 'hover:bg-red-50 hover:text-red-700'
    }
    return isSelected ? 'bg-amber-600 text-white hover:bg-amber-700' : 'hover:bg-amber-50 hover:text-amber-700'
  }
</script>

<div class="flex w-full max-w-3xl flex-col gap-6">
  <!-- 标题 -->
  <div class="text-center">
    <h2 class="flex items-center justify-center gap-2 text-xl font-bold text-foreground">
      <Vote size={22} class="text-blue-500" />
      {documentName ? `实质性投票` : '投票表决'}
    </h2>
    {#if documentName}
      <p class="mt-1 text-base font-semibold text-foreground">「{documentName}」</p>
    {/if}
    {#if activeSession}
      <p class="mt-1 text-sm text-muted-foreground">
        {activeSession.majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'}表决
        {#if activeSession.result}
          —
          <span class={activeSession.result === 'passed' ? 'font-bold text-emerald-600' : 'font-bold text-red-600'}>
            {activeSession.result === 'passed' ? '通过 ✓' : '未通过 ✗'}
          </span>
        {/if}
      </p>
    {/if}
  </div>

  <!-- 统计卡片 -->
  {#if thresholds}
    <div class="grid grid-cols-4 gap-3">
      <div class="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 text-center dark:border-emerald-700 dark:bg-emerald-950/30">
        <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{tally.yes}</div>
        <div class="text-[10px] text-muted-foreground">Yes</div>
      </div>
      <div class="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-center dark:border-red-700 dark:bg-red-950/30">
        <div class="text-2xl font-bold text-red-700 dark:text-red-400">{tally.no}</div>
        <div class="text-[10px] text-muted-foreground">No</div>
      </div>
      <div class="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-center dark:border-amber-700 dark:bg-amber-950/30">
        <div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{tally.abstain}</div>
        <div class="text-[10px] text-muted-foreground">Abstain</div>
      </div>
      <div class="rounded-lg border bg-card p-3 text-center">
        <div class="text-2xl font-bold text-muted-foreground">{totalVoted}/{thresholds.presentCount}</div>
        <div class="text-[10px] text-muted-foreground">已投/实到</div>
      </div>
    </div>
  {/if}

  <!-- 投票列表 -->
  {#if conf && activeSession}
    <div class="rounded-lg border bg-card">
      <div class="divide-y">
        {#each conf.delegations.filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting') as delegation (delegation.id)}
          {@const ballot = activeSession.ballots.find((b) => b.delegationId === delegation.id)}
          <div class="flex items-center gap-3 px-4 py-2.5">
            <div
              class="h-3 w-3 shrink-0 rounded-full"
              style="background-color: {delegation.color}"
            ></div>
            <span class="min-w-0 flex-1 text-sm text-foreground">
              {delegation.name}
            </span>
            {#if delegation.vetoPower}
              <Badge variant="outline" class="border-red-200 bg-red-50 text-[9px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                VETO
              </Badge>
            {/if}
            <div class="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                class={cn('h-7 text-xs', getVoteButtonStyle(delegation.id, 'yes'))}
                disabled={!!activeSession.result}
                onclick={() => castVote(activeSession.id, delegation.id, 'yes')}
              >
                <Check size={12} class="mr-0.5" />
                Yes
              </Button>
              <Button
                size="sm"
                variant="outline"
                class={cn('h-7 text-xs', getVoteButtonStyle(delegation.id, 'no'))}
                disabled={!!activeSession.result}
                onclick={() => castVote(activeSession.id, delegation.id, 'no')}
              >
                <X size={12} class="mr-0.5" />
                No
              </Button>
              <Button
                size="sm"
                variant="outline"
                class={cn('h-7 text-xs', getVoteButtonStyle(delegation.id, 'abstain'))}
                disabled={!!activeSession.result}
                onclick={() => castVote(activeSession.id, delegation.id, 'abstain')}
              >
                <Minus size={12} class="mr-0.5" />
                弃权
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    {#if !activeSession.result}
      <div class="flex justify-center">
        <Button
          class="min-w-[160px] gap-2"
          onclick={handleCloseVoting}
          disabled={totalVoted === 0}
        >
          结束投票并公布结果
        </Button>
      </div>
    {/if}
  {:else}
    <div class="rounded-lg border bg-card p-12 text-center">
      <Vote size={40} class="mx-auto mb-3 opacity-30" />
      <p class="text-muted-foreground">没有进行中的投票</p>
      <p class="mt-1 text-xs text-muted-foreground/70">
        对动议提出表决即可在此界面进行投票
      </p>
    </div>
  {/if}
</div>
