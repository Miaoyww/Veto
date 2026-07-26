<script lang="ts">
  /**
   * display-section-header.svelte
   * ──────────────────────────────
   * Display 端可复用的节标题：装饰横线 + 图标 + 大写文字。
   * 用于发言状态、让渡状态等场景的顶部标识。
   */
  import type { Component } from 'svelte'

  let {
    Icon,
    label,
    colorClass = 'text-[#5B92E5]'
  }: {
    Icon: Component
    label: string
    colorClass?: string
  } = $props()
</script>

<div class="flex items-center gap-3 text-white/40">
  <div class="h-px w-12 bg-white/10"></div>
  <Icon size={20} class={colorClass} />
  <span class="text-lg tracking-[0.08em] uppercase">{label}</span>
  <div class="h-px w-12 bg-white/10"></div>
</div>
