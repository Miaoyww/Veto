<script lang="ts">
  /**
   * question/index.svelte
   * ──────────────────────
   * 问题展示组件 —— 编辑阶段实时同步 + 提交后展示。
   */
  import { AlertTriangle, HelpCircle, User } from '@lucide/svelte'
  import { POINT_LABELS } from '$lib/types-conference'
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import type { PointType } from '$lib/types-conference'

  let { data }: { data: ConferenceDisplayData } = $props()

  const draft = $derived(data.pointDraft ?? null)
  const activePoint = $derived(data.activePoint ?? null)

  const POINT_ICONS: Record<PointType, typeof AlertTriangle> = {
    point_of_order: AlertTriangle,
    point_of_inquiry: HelpCircle,
    point_of_personal_privilege: User
  }

  const POINT_COLORS: Record<PointType, string> = {
    point_of_order: '#f59e0b',
    point_of_inquiry: '#3b82f6',
    point_of_personal_privilege: '#10b981'
  }

  // 优先显示 draft（编辑中），其次显示 activePoint（提交后）
  const type = $derived(draft?.type ?? activePoint?.type)
  const proposedByName = $derived(draft?.proposedByName ?? activePoint?.proposedByName)

  const icon = $derived(type ? (POINT_ICONS[type] ?? HelpCircle) : HelpCircle)
  const color = $derived(type ? (POINT_COLORS[type] ?? '#f59e0b') : '#f59e0b')
  const label = $derived(type ? (POINT_LABELS[type] ?? type) : '')
  const hasType = $derived(type != null)
</script>

<div class="flex w-full flex-col items-center">
  {#if proposedByName}
    <div class="w-full px-10 py-8 text-center">
      {#if hasType}
        <!-- 问题类型已选择：显示完整信息 -->
        <!-- 问题 标签 -->
        <div class="flex items-center justify-center gap-3">
          <icon size={32} style="color: {color}" />
          <span
            class="text-3xl font-semibold tracking-[0.08em] uppercase"
            style="color: {color}"
          >
            问题
          </span>
        </div>

        <!-- 问题类型 -->
        <div class="mt-4 text-4xl tracking-wide text-white/40">
          {label}
        </div>

        <!-- 提出方 -->
        <div class="mt-6 text-7xl font-semibold tracking-wide text-white">
          {proposedByName}
        </div>
        <div class="mt-2 text-5xl tracking-wide text-white/30">
          提出问题
        </div>

        <!-- 底部装饰线 -->
        <div class="mt-8 flex items-center justify-center gap-3 text-white/15">
          <div class="h-px w-12" style="background: {color}33"></div>
          <div class="h-2 w-2 rounded-full" style="background: {color}"></div>
          <div class="h-px w-12" style="background: {color}33"></div>
        </div>
      {:else}
        <!-- 仅选择了提出方：展示提出方名称 -->
        <div class="mt-10 text-7xl font-semibold tracking-wide text-white">
          {proposedByName}
        </div>
        <div class="mt-4 text-5xl tracking-wide text-white/30">
          提出问题
        </div>
      {/if}
    </div>
  {/if}
</div>
