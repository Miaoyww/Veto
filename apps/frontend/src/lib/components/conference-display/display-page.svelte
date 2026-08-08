<script lang="ts">
  /**
   * display-page.svelte
   * ────────────────────
   * Display 端统一页面包装：垂直居中 + 水平内边距。
   * 所有展示视图应以此为根容器，确保视觉一致性。
   */
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="flex flex-col w-full flex-1 items-center justify-center px-10 py-8">
  {@render children()}
</div>
