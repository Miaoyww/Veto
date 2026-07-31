<script lang="ts">
  /**
   * placeholder-page.svelte
   * ────────────────────────
   * 会议占位阶段通用布局 —— 居中图标 + 标题 + 副标题 + 可选操作区。
   * 用于 preamble / roll_call / pending_speakers_list / suspended / closed。
   */
  import type { Component } from '@lucide/svelte'

  interface Props {
    icon: Component
    title: string
    subtitle?: string
    children?: import('svelte').Snippet
  }

  let { icon: Icon, title, subtitle, children }: Props = $props()
</script>

<div class="flex flex-1 items-center justify-center">
  <div class="flex flex-col items-center gap-6 text-center">
    <div class="flex flex-col items-center gap-2">
      <Icon size={48} class="opacity-30" />
      <h2 class="text-xl font-bold text-foreground">{title}</h2>
      {#if subtitle}
        <p class="text-sm text-muted-foreground">{subtitle}</p>
      {/if}
    </div>
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
