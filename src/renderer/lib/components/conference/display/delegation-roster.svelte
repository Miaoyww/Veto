<script lang="ts">
  /**
   * delegation-roster.svelte
   * ──────────────────────────
   * 可复用的代表团名单组件，支持两种显示模式：
   *
   * - voting : 唱名表决状态网格 —— 彩色圆点（赞成/反对/弃权/跳过/未投）+
   *            当前代表团高亮
   * - list   : 顺序名单 —— 序号 + 名称 + 简称，超出上限显示 "还有 N 位代表"
   */
  import { cn } from '$lib/utils.js'

  export interface RosterEntry {
    /** 唯一标识（用于 key 和 currentId 匹配） */
    id: string
    /** 代表团名称 */
    name: string
    /** 代表团简称（可选） */
    shortName?: string
    /** 投票状态（voting 模式使用） */
    vote?: string | null
  }

  let {
    entries,
    mode = 'list',
    currentId = null,
    max = Infinity,
    gridCols = 5,
    emptyText = '暂无代表团'
  }: {
    entries: RosterEntry[]
    /** 显示模式：voting = 表决状态, list = 顺序名单 */
    mode?: 'voting' | 'list'
    /** voting 模式下高亮的代表团 ID */
    currentId?: string | null
    /** list 模式最大显示数量，超出显示溢出提示 */
    max?: number
    /** voting 模式网格列数 */
    gridCols?: number
    /** 空状态文本 */
    emptyText?: string
  } = $props()

  const visibleEntries = $derived(entries.slice(0, max))
  const hasMore = $derived(entries.length > max)
  const remaining = $derived(entries.length - max)

  function dotClass(vote: string | null | undefined): string {
    switch (vote) {
      case 'yes':
        return 'bg-emerald-400'
      case 'no':
        return 'bg-red-400'
      case 'abstain':
        return 'bg-amber-400'
      case 'skip':
        return 'bg-slate-500'
      default:
        return 'border border-white/20 bg-transparent'
    }
  }

  function nameClass(vote: string | null | undefined): string {
    if (vote === null || vote === undefined) return 'text-white/30'
    if (vote === 'skip') return 'text-slate-400'
    return 'text-white/70'
  }
</script>

{#if entries.length === 0}
  <div class="text-lg tracking-wider text-white/10">{emptyText}</div>
{:else if mode === 'voting'}
  <!-- 投票模式：代表团状态网格 -->
  <div
    class="grid gap-x-6 gap-y-2"
    style="grid-template-columns: repeat({gridCols}, minmax(0, 1fr));"
  >
    {#each entries as entry (entry.id)}
      {@const isCurrent = entry.id === currentId}
      <div
        class={cn(
          'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
          isCurrent && 'bg-[#5B92E5]/10 ring-1 ring-[#5B92E5]/30'
        )}
      >
        <!-- 投票状态圆点 -->
        <div class={cn('h-2 w-2 shrink-0 rounded-full', dotClass(entry.vote))}></div>
        <span class={nameClass(entry.vote)}>{entry.name}</span>
      </div>
    {/each}
  </div>
{:else if max > 0}
  <!-- 列表模式：顺序展示 -->
  <div class="w-full space-y-px">
    {#each visibleEntries as entry, i (entry.id)}
      <div class="flex items-center justify-center gap-4 px-6 py-2.5">
        <span class="text-sm tabular-nums text-white/25">{i + 1}</span>
        <span class="text-xl font-medium text-white/50">{entry.name}</span>
        {#if entry.shortName}
          <span class="text-sm tracking-wider text-white/25">{entry.shortName}</span>
        {/if}
      </div>
    {/each}

    {#if hasMore}
      <div class="flex items-center justify-center gap-4 px-6 py-2.5">
        <span class="text-sm text-white/15">...</span>
        <span class="text-lg text-white/20">还有 {remaining} 位代表</span>
      </div>
    {/if}
  </div>
{/if}
