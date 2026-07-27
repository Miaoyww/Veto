<script lang="ts">
  /**
   * voting/index.svelte
   * ────────────────────
   * 投票阶段 Display 内容组件 —— 展示唱名表决过程给观众。
   *
   * 通过 $props 接收 Shell 传入的 ConferenceDisplayData。
   */
  import { Vote } from '@lucide/svelte'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import DelegationRoster, { type RosterEntry } from '$lib/components/conference/display/delegation-roster.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  const vs = $derived(data.votingSession!)
  const docName = $derived(data.activeMotion?.documentName)

  const rosterEntries = $derived<RosterEntry[]>(
    vs.ballots.map((b) => ({
      id: b.delegationId,
      name: b.delegationName,
      shortName: b.shortName,
      vote: b.vote
    }))
  )
</script>

<div class="flex flex-col items-center gap-10">
  <!-- 标题栏 -->
  <div class="flex items-center gap-3 text-white/40">
    <div class="h-px w-12 bg-white/10"></div>
    <Vote size={20} class="text-[#5B92E5]" />
    <span class="text-lg tracking-[0.08em] uppercase">
      {docName ? '实质性投票' : '投票表决'}
    </span>
    <span class="text-sm tracking-wider text-white/20">
      {vs.majorityRule === '简单多数' ? 'SIMPLE MAJORITY' : 'TWO-THIRDS MAJORITY'}
    </span>
    <div class="h-px w-12 bg-white/10"></div>
  </div>

  {#if docName}
    <div class="text-4xl font-semibold tracking-wide text-white/60">
      「{docName}」
    </div>
  {/if}

  <!-- 计票数字 -->
  <div class="grid grid-cols-3 gap-8">
    <div
      class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
    >
      <div class="text-9xl font-light tabular-nums leading-none text-[#5B92E5]">
        {vs.tally.yes}
      </div>
      <div class="text-sm tracking-[0.12em] text-white/30 uppercase">赞成</div>
    </div>
    <div
      class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
    >
      <div class="text-9xl font-light tabular-nums leading-none text-white/40">
        {vs.tally.no}
      </div>
      <div class="text-sm tracking-[0.12em] text-white/30 uppercase">反对</div>
    </div>
    <div
      class="flex w-52 flex-col items-center gap-3 rounded-sm border border-white/10 bg-white/[0.02] px-10 py-10"
    >
      <div class="text-9xl font-light tabular-nums leading-none text-white/40">
        {vs.tally.abstain}
      </div>
      <div class="text-sm tracking-[0.12em] text-white/30 uppercase">弃权</div>
    </div>
  </div>

  <!-- 投票进行中：代表团状态网格 -->
  {#if !vs.result}
    <div class="flex flex-col items-center gap-4">
      <div class="text-xs tracking-[0.1em] text-white/20 uppercase">
        {vs.round === 2 ? 'ROUND 2 · SECOND CALL' : 'ROLL CALL VOTE'}
      </div>
      <DelegationRoster
        entries={rosterEntries}
        mode="voting"
        currentId={vs.currentDelegationId}
        gridCols={5}
      />
    </div>
  {/if}

  <!-- 结果横幅 -->
  {#if vs.result}
    <div
      class="rounded-sm px-10 py-3 text-xl font-semibold tracking-[0.06em] {vs.result === 'passed'
        ? 'bg-[#5B92E5]/10 text-[#5B92E5] border border-[#5B92E5]/20'
        : 'bg-white/5 text-white/40 border border-white/10'}"
    >
      {vs.result === 'passed' ? '通过  ADOPTED' : '未通过  REJECTED'}
    </div>
  {/if}
</div>
