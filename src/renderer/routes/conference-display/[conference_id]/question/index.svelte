<script lang="ts">
  /**
   * question/index.svelte
   * ──────────────────────
   * 问题展示组件 —— 编辑阶段实时同步 + 提交后展示。
   */
  import { POINT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import DelegationNameDisplay from '$lib/components/conference/display/delegation-name-display.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()

  const draft = $derived(data.pointDraft ?? null)
  const activePoint = $derived(data.activePoint ?? null)

  // 优先显示 draft（编辑中），其次显示 activePoint（提交后）
  const type = $derived(draft?.type ?? activePoint?.type)
  const proposer = $derived(draft?.proposedBy ?? activePoint?.proposedBy)

  const label = $derived(type ? (POINT_LABELS[type] ?? type) : '')
  const hasType = $derived(type != null)
</script>

<div class="flex w-full flex-col items-center">
  {#if proposer}
    <div class="w-full px-10 py-8 text-center">
      <div class="mt-10">
        <DelegationNameDisplay name={proposer.name} shortName={proposer.shortName ?? ''} />
      </div>
      {#if hasType}
        <!-- 问题类型 -->
        <div class="mt-4 text-4xl tracking-wide text-white/40">
          提出 {label}
        </div>
      {:else}
        <div class="mt-4 text-5xl tracking-wide text-white/30">提出问题</div>
      {/if}
    </div>
  {/if}
</div>
