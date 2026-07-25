<script lang="ts">
  /**
   * delegation-selector.svelte
   * ────────────────────────────
   * 可复用的代表团模糊搜索选择器。
   * 基于 shadcn Command + ScrollArea，支持中文全称、简称、拼音全拼/首字母、fuse.js 容错匹配。
   */
  import { Command as CommandPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils.js'
  import type { Delegation } from '$lib/types-conference'
  import Fuse from 'fuse.js'
  import PinyinMatch from 'pinyin-match'
  import SearchIcon from '@lucide/svelte/icons/search'
  import XIcon from '@lucide/svelte/icons/x'

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
  let open = $state(false)

  // ---- search logic (kept from original) ----

  const excludeSet = $derived(new Set(excludeIds))
  const searchPool = $derived(
    (presentOnly
      ? delegations.filter((d) => d.attendance === 'present')
      : delegations
    ).filter((d) => !excludeSet.has(d.id))
  )

  // Fuse.js instance（复用 searchPool）
  const fuse = $derived(
    new Fuse(searchPool, {
      keys: ['name', 'shortName'],
      threshold: 0.4,
      includeScore: true
    })
  )

  // 3-tier 搜索：子串 → 拼音 → fuse.js
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return searchPool

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

    return results.sort((a, b) => a._score - b._score).map((r) => r.delegation)
  })

  // ---- selection ----

  function select(delegationId: string): void {
    if (resetOnSelect) {
      query = ''
      open = false
      onselect?.(delegationId)
    } else {
      value = delegationId
      query = ''
      open = false
      onselect?.(delegationId)
    }
  }

  function clear(): void {
    value = null
  }

  const selectedDelegation = $derived(
    value ? delegations.find((d) => d.id === value) : null
  )
</script>

<div class={cn('relative', className)}>
  <CommandPrimitive.Root shouldFilter={false}>
    {#if selectedDelegation && !open}
      <!-- 已选中状态 -->
      <div
        class="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"
      >
        <span class="text-sm">{selectedDelegation.name}</span>
        {#if selectedDelegation.shortName}
          <span class="text-xs text-muted-foreground">({selectedDelegation.shortName})</span>
        {/if}
        <button
          type="button"
          class="ml-auto rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
          onclick={clear}
        >
          <XIcon class="size-4" />
        </button>
      </div>
    {:else}
      <!-- 搜索输入 -->
      <div
        class="flex items-center gap-2 rounded-md border border-input bg-background px-3"
        class:ring-2={open}
        class:ring-ring={open}
      >
        <SearchIcon class="size-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          bind:value={query}
          {placeholder}
          class="placeholder:text-muted-foreground flex h-9 w-full bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onfocus={() => (open = true)}
          onblur={() => setTimeout(() => (open = false), 200)}
        />
      </div>

      <!-- 下拉列表 -->
      {#if open && filtered.length > 0}
        <CommandPrimitive.List
          class="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-lg p-0 max-h-[130px] overflow-y-auto"
        >
          {#each filtered as d (d.id)}
            <CommandPrimitive.Item
              value={d.id}
              onSelect={() => select(d.id)}
              class="aria-selected:bg-accent aria-selected:text-accent-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <span class="text-foreground">{d.name}</span>
              {#if d.shortName}
                <span class="text-xs text-muted-foreground">({d.shortName})</span>
              {/if}
            </CommandPrimitive.Item>
          {/each}
        </CommandPrimitive.List>
      {/if}
    {/if}
  </CommandPrimitive.Root>
</div>
