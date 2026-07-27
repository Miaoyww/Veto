<script lang="ts">
  import AutoFitText from './auto-fit-text.svelte'

  /**
   * delegation-name-display.svelte
   * ──────────────────────────────
   * Display 端代表团名称展示：全称 + 简称。用于发言人卡片、发言名单等场景。
   */
  let {
    name,
    shortName = '',
    containerClass = 'text-center'
  }: {
    name: string
    shortName?: string
    nameClass?: string
    shortNameClass?: string
    containerClass?: string
  } = $props()
</script>

<div class={containerClass}>
  <div class="text-9xl font-semibold tracking-wide text-white">
    <AutoFitText text={name} />
  </div>
  {#if shortName}
    <div class="mt-5 text-3xl font-light tracking-[0.06em] text-white/30">
      <AutoFitText text={shortName} />
    </div>
  {/if}
</div>
