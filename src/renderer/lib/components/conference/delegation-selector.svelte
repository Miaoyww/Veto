<script lang="ts">
  /**
   * delegation-selector.svelte
   * 可复用的代表团模糊搜索选择器。
   * 支持中文全称、简称、拼音首字母匹配。
   */
  import { Input } from '$lib/components/ui/input/index.js'
  import { cn } from '$lib/utils.js'
  import type { Delegation } from '$lib/types-conference'

  interface Props {
    delegations: Delegation[]
    /** 当前已选中的代表团 ID */
    value?: string | null
    placeholder?: string
    class?: string
    /** 结果过滤：仅显示出席的代表团 */
    presentOnly?: boolean
    onselect?: (delegationId: string) => void
  }

  let {
    delegations,
    value = $bindable(null),
    placeholder = '搜索代表团...',
    class: className = '',
    presentOnly = false,
    onselect
  }: Props = $props()

  let query = $state('')
  let focused = $state(false)
  let selectedIndex = $state(0)

  // 拼音首字母映射表 (内置常用——完整实现见 Phase 9)
  const PINYIN_MAP: Record<string, string> = {
    '中': 'zhong', '美': 'mei', '英': 'ying', '法': 'fa', '俄': 'e',
    '德': 'de', '日': 'ri', '韩': 'han', '印': 'yin', '巴': 'ba',
    '意': 'yi', '加': 'jia', '澳': 'ao', '荷': 'he', '瑞': 'rui',
    '比': 'bi', '葡': 'pu', '西': 'xi', '波': 'bo', '挪': 'nuo',
    '芬': 'fen', '丹': 'dan', '奥': 'ao', '土': 'tu', '埃': 'ai',
    '南': 'nan', '阿': 'a', '伊': 'yi', '沙': 'sha', '以': 'yi',
    '朝': 'chao', '越': 'yue', '古': 'gu', '委': 'wei', '叙': 'xu',
    '乌': 'wu', '伊': 'yi', '利': 'li', '尼': 'ni', '肯': 'ken',
    '墨': 'mo', '哥': 'ge', '智': 'zhi', '秘': 'mi', '爱': 'ai',
    '希': 'xi', '捷': 'jie', '匈': 'xiong', '罗': 'luo', '保': 'bao'
  }

  function getInitials(name: string): string {
    let result = ''
    for (const char of name) {
      const py = PINYIN_MAP[char]
      if (py) result += py[0]
    }
    return result
  }

  function matchDelegation(d: Delegation, q: string): number {
    // 0 = 不匹配, higher = better
    const ql = q.toLowerCase()

    // 精确匹配简称
    if (d.shortName?.toLowerCase() === ql) return 100
    // 前缀匹配全称
    if (d.name.toLowerCase().startsWith(ql)) return 90
    // 包含匹配
    if (d.name.toLowerCase().includes(ql)) return 70
    if (d.shortName?.toLowerCase().includes(ql)) return 60
    // 拼音首字母
    const initials = getInitials(d.name)
    if (initials.startsWith(ql)) return 50
    // 拼音全拼包含
    for (const char of d.name) {
      const py = PINYIN_MAP[char]
      if (py && py.includes(ql)) return 40
    }

    return 0
  }

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    let pool = presentOnly
      ? delegations.filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting')
      : delegations

    if (!q) return pool.slice(0, 5)

    return pool
      .map((d) => ({ delegation: d, score: matchDelegation(d, q) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((e) => e.delegation)
  })

  function select(delegationId: string): void {
    value = delegationId
    query = ''
    focused = false
    onselect?.(delegationId)
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
    else selectedIndex = 0
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
