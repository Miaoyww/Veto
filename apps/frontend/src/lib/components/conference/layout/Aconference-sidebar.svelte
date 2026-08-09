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
  import { goto } from '$app/navigation'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { bindTimeline } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { Button } from '$lib/components/ui/button'

  import { cn } from '$lib/utils.js'
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'


  const presentCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present').length ?? 0
  )
  const votingCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length ?? 0
  )
  const simpleMajority = $derived(Math.floor(votingCount / 2) + 1)
  const twoThirds = $derived(Math.ceil((votingCount * 2) / 3))

  // ── 时间线绑定 ──────────────────────────────────────────────────────────

 

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



</script>

<aside class="flex h-full w-[260px] shrink-0 flex-col border-r bg-muted/30">
  {#if conf}
    <!-- 返回按钮 -->
    <!-- 会场信息 -->
    <div class="px-5 pt-2 pb-2">
      <h1 class="text-base font-bold leading-tight text-foreground"></h1>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <span class="inline-flex items-center gap-1 py-0.5 text-[11px] font-medium">
          {}
        </span>
      </div>
    </div>

    <!-- 时间线 -->
    <div class="px-5 pb-2">
      <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock size={12} />
        <span>时间线</span>
      </div>


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
          onclick={() => goto(`/conference/${conf.id}/delegations`)}
        >
          <UserRoundCheck size={10} />
          代表管理
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1 text-[10px] ml-1"
          onclick={() => goto(`/conference/${conf.id}/seats`)}
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
