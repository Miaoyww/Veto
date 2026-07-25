<script lang="ts">
  /**
   * delegation-selector.svelte
   * ────────────────────────────
   * 可复用的代表团模糊搜索选择器。
   * 支持中文全称、简称、拼音全拼/首字母、fuse.js 容错匹配。
   */
  import { Input } from '$lib/components/ui/input/index.js'
  import { cn } from '$lib/utils.js'
  import type { Delegation } from '$lib/types-conference'
  import Fuse from 'fuse.js'
  import PinyinMatch from 'pinyin-match'

  interface Props {
    delegations: Delegation[]
    /** 当前已选中的代表团 ID（双向绑定） */
    value?: string | null
    placeholder?: string
    class?: string
    /** 结果过滤：仅显示出席的代表团 */
    presentOnly?: boolean
    /** 选择后立即重置（不清除 value 的状态显示），用于添加列表等场景 */
    resetOnSelect?: boolean
    /** 排除这些代表团 ID（如已在列表中） */
    excludeIds?: string[]
    onselect?: (delegationId: string) => void
  }

  let {
    delegations,
    value = $bindable(null),
    placeholder = '搜索代表团...',
    class: className = '',
    presentOnly = false,
    resetOnSelect = false,
    excludeIds = [],
    onselect
  }: Props = $props()

  let query = $state('')
  let focused = $state(false)
  let selectedIndex = $state(0)

  // Fuse.js 实例（delegations 变化时重建）
  const fuse = $derived.by(() => {
    const excludeSet = new Set(excludeIds)
    const pool = (presentOnly
      ? delegations.filter((d) => d.attendance === 'present')
      : delegations).filter((d) => !excludeSet.has(d.id))
    return new Fuse(pool, {
      keys: ['name', 'shortName'],
      threshold: 0.4,
      includeScore: true
    })
  })

  // 被搜索的代表团池
  const excludeSet = $derived(new Set(excludeIds))
  const searchPool = $derived(
    (presentOnly
      ? delegations.filter((d) => d.attendance === 'present')
      : delegations).filter((d) => !excludeSet.has(d.id))
  )

  // 3-tier 搜索：子串 → 拼音 → fuse.js
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return searchPool.slice(0, 6)

    const results: Array<{ delegation: Delegation; _score: number }> = []
    const seen = new Set<string>()

    const addResult = (d: Delegation, score: number) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      results.push({ delegation: d, _score: score })
    }

    // 1. 直接子串匹配
    for (const d of searchPool) {
      if (d.name.toLowerCase().includes(q) || d.shortName?.toLowerCase().includes(q)) {
        addResult(d, 0)
      }
    }

    // 2. 拼音匹配
    for (const d of searchPool) {
      const matchName = PinyinMatch.match(d.name, q)
      const matchShort = d.shortName ? PinyinMatch.match(d.shortName, q) : false
      if (matchName || matchShort) {
        addResult(d, 0.1)
      }
    }

    // 3. Fuse.js 模糊匹配
    const fuseResults = fuse.search(q)
    for (const r of fuseResults) {
      addResult(r.item, (r.score ?? 0.5) + 0.2)
    }

    return results.sort((a, b) => a._score - b._score).slice(0, 6).map((r) => r.delegation)
  })

  function select(delegationId: string): void {
    if (resetOnSelect) {
      query = ''
      focused = false
      onselect?.(delegationId)
    } else {
      value = delegationId
      query = ''
      focused = false
      onselect?.(delegationId)
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (!focused || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        select(filtered[selectedIndex].id)
      }
    } else if (e.key === 'Escape') {
      focused = false
    }
  }

  $effect(() => {
    if (focused) selectedIndex = 0
  })

  const selectedDelegation = $derived(
    value ? delegations.find((d) => d.id === value) : null
  )
</script>

<div class={cn('relative', className)}>
  {#if selectedDelegation && !focused}
    <div class="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
      <div
        class="h-2.5 w-2.5 shrink-0 rounded-full"
        style="background-color: {selectedDelegation.color}"
      ></div>
      <span class="text-sm">{selectedDelegation.name}</span>
      <button
        class="ml-auto text-xs text-muted-foreground hover:text-foreground"
        onclick={() => (value = null)}
      >
        ✕
      </button>
    </div>
  {:else}
    <Input
      bind:value={query}
      {placeholder}
      class="h-9 text-sm"
      onfocus={() => (focused = true)}
      onblur={() => setTimeout(() => (focused = false), 200)}
      onkeydown={handleKeydown}
    />
    {#if focused && filtered.length > 0}
      <div class="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-card shadow-lg">
        {#each filtered as d, i}
          <button
            class={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
            )}
            onmousedown={() => select(d.id)}
          >
            <div
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              style="background-color: {d.color}"
            ></div>
            <span class="text-foreground">{d.name}</span>
            {#if d.shortName}
              <span class="text-xs text-muted-foreground">({d.shortName})</span>
            {/if}
            {#if d.vetoPower}
              <span class="ml-auto rounded bg-red-100 px-1 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">V</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>
