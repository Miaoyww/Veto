<script lang="ts">
  /**
   * auto-fit-text.svelte
   * ────────────────────
   * Display 端大字组件：自动缩小字号使文本不超出指定行数或最大高度。
   * 使用 DOM scrollHeight 实测 + 二分查找，CSS 换行行为完全一致。
   */
  const MAX_LINES = 3

  let {
    text = '',
    maxRem = 8,
    minRem = 1,
    maxWidthVw = 85,
    maxHeightVh = 45,
    class: className = ''
  }: {
    text: string
    maxRem?: number
    minRem?: number
    /** 文本最大宽度（视口宽度百分比），默认 85 */
    maxWidthVw?: number
    /** 文本总高度上限（视口高度百分比），默认 45 */
    maxHeightVh?: number
    class?: string
  } = $props()

  let el = $state<HTMLElement | null>(null)
  let size = $state(maxRem)

  $effect(() => {
    const target = el
    if (!text || !target) return

    requestAnimationFrame(() => {
      const maxHeightPx = (window.innerHeight * maxHeightVh) / 100

      let lo = minRem
      let hi = maxRem
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2
        target.style.fontSize = `${mid}rem`
        void target.offsetHeight
        const lh = parseFloat(getComputedStyle(target).lineHeight) || mid * 16 * 1.3
        const heightOk = target.scrollHeight <= lh * MAX_LINES + 2
          && target.scrollHeight <= maxHeightPx
        if (heightOk) {
          lo = mid
        } else {
          hi = mid
        }
      }
      size = Math.round(lo * 10) / 10
    })
  })
</script>

<div bind:this={el} class={className} style="font-size: {size}rem; max-width: {maxWidthVw}vw">
  {text}
</div>
