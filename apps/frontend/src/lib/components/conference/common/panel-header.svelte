<script lang="ts">
  import { cn } from '$lib/utils.js'
  /**
   * panel-header.svelte
   * ───────────────────
   * 面板标题栏 —— 图标 + 标题。默认小尺寸用于顶部横幅，
   * 大面板可传入 size={28} textClass="text-xl font-bold"。
   */
  import type { LucideIcon } from '@lucide/svelte'

  interface Props {
    /** Lucide 图标组件 */
    icon: LucideIcon
    /** 标题文本 */
    title: string
    /** 图标尺寸，默认 16 */
    size?: number
    /** 图标额外 CSS 类（颜色等） */
    iconClass?: string
    /** 标题额外 CSS 类 */
    textClass?: string
  }

  let { icon: Icon, title, size = 16, iconClass = '', textClass = '' }: Props = $props()
</script>

<div class="flex items-center gap-2">
  <Icon {size} class={cn('text-indigo-500', iconClass)} />
  <span class={cn('text-sm font-semibold text-foreground', textClass)}>{title}</span>
</div>
