<script lang="ts">
  import { Users, Gavel, Building2, ArrowLeft, Calculator } from '@lucide/svelte'
  import { navigate } from '$lib/router.svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils.js'

  const conf = $derived($currentConference)

  const presentCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present').length ?? 0
  )
  const totalCount = $derived(conf?.delegations.length ?? 0)
  const simpleMajority = $derived(Math.floor(presentCount / 2) + 1)
  const twoThirds = $derived(Math.ceil((presentCount * 2) / 3))
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
    <div class="flex-1 overflow-hidden">
      <div class="flex items-center gap-1.5 px-5 pb-2">
        <Users size={12} class="text-muted-foreground" />
        <span class="text-[11px] font-medium text-muted-foreground">
          代表团 ({presentCount}/{conf.delegations.length} 出席)
        </span>
      </div>

      <div class="overflow-y-auto px-3 pb-3" style="max-height: calc(100% - 24px);">
        {#each conf.delegations as delegation (delegation.id)}
          {@const isPresent = delegation.attendance === 'present'}
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
              {#if isPresent}
                <span class="text-emerald-500">●</span>
              {:else}
                <span class="text-muted-foreground/40">○</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center px-5 text-center">
      <p class="text-sm text-muted-foreground">未加载大会</p>
    </div>
  {/if}
</aside>
