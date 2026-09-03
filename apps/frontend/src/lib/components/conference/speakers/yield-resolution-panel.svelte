<script lang="ts">
  /**
   * yield-resolution-panel.svelte
   * ──────────────────────────────
   * 让渡解析面板 —— 发言人做出让渡选择后，主席在此面板中解析让渡流程。
   *
   * 支持三种让渡类型：
   * - delegate: 选择目标代表团
   * - question: 选择提问方 → 原发言人回答（呼吁环节由主席口头执行）
   * - comment: 选择评论方 → 评论方发言（呼吁环节由主席口头执行）
   */
  import { Users, HelpCircle, MessageCircle, X, SkipForward } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'
  import type { Delegation } from '$lib/classes/types/conference'
  import { formatTime } from '$lib/classes/formatters/time-formater'
  import {
    resolveYieldToChair,
    resolveYieldToDelegate,
    resolveYieldToQuestion,
    resolveYieldToComment
  } from '$lib/classes/stores/conference/conference-store'
  import type { Committee, YieldPendingState } from '$lib/classes/types/conference'

  interface Props {
    conference: Committee
    yieldPending: YieldPendingState
  }

  let { conference, yieldPending }: Props = $props()

  const yp = $derived(yieldPending)
  const remainingFormatted = $derived(formatTime(Math.round(yp.remainingSec)))

  // 排除原发言人（不能将时间让渡给自己）
  const excludeOriginalId = $derived([yp.originalDelegationId])

  function handleSelectDelegate(d: Delegation): void {
    resolveYieldToDelegate(d.id)
  }

  function handleSelectQuestioner(d: Delegation): void {
    resolveYieldToQuestion(d.id)
  }

  function handleSelectCommenter(d: Delegation): void {
    resolveYieldToComment(d.id)
  }

  function handleNoResponse(): void {
    // 无人举手 → 让渡给主席
    resolveYieldToChair()
  }

  const yieldLabel = $derived.by(() => {
    switch (yp.yieldType) {
      case 'delegate':
        return '让渡给代表'
      case 'question':
        return '让渡给提问'
      case 'comment':
        return '让渡给评论'
    }
  })

  const hasQuestioner = $derived(yp.questionerDelegationId != null)
</script>

<div
  class="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-5 dark:border-indigo-700 dark:bg-indigo-950/30"
>
  <!-- 标题栏 -->
  <div class="mb-3 flex items-center gap-2">
    {#if yp.yieldType === 'delegate'}
      <Users size={18} class="text-indigo-500" />
    {:else if yp.yieldType === 'question'}
      <HelpCircle size={18} class="text-indigo-500" />
    {:else}
      <MessageCircle size={18} class="text-indigo-500" />
    {/if}
    <span class="text-sm font-semibold text-foreground">{yieldLabel}</span>
    <span class="ml-auto text-xs text-muted-foreground">剩余 {remainingFormatted}</span>
  </div>

  <p class="mb-4 text-sm text-muted-foreground">
    {yp.originalDelegation.name} 将剩余 <strong>{remainingFormatted}</strong>
    {yieldLabel}
  </p>

  <Separator class="mb-4" />

  <!-- ═══ 让渡给代表：选择目标代表团 ═══ -->
  {#if yp.yieldType === 'delegate' && !hasQuestioner}
    <div class="space-y-3">
      <p class="text-xs text-muted-foreground">请选择接收剩余时间的代表团（不可再次让渡）：</p>
      <DelegationSelector
        delegations={conference.delegations}
        placeholder="搜索目标代表团..."
        onselect={handleSelectDelegate}
        resetOnSelect={true}
        excludeIds={excludeOriginalId}
      />
      <div class="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          class="h-8 text-xs text-muted-foreground"
          onclick={handleNoResponse}
        >
          <SkipForward size={12} class="mr-1" />
          改为让渡给主席
        </Button>
      </div>
    </div>

    <!-- ═══ 让渡给提问 ═══ -->
  {:else if yp.yieldType === 'question' && !hasQuestioner}
    <div class="space-y-3">
      <p class="text-xs text-muted-foreground">
        主席口头呼吁场下提问后，选择举手提问的代表团（提问不占用时间）：
      </p>
      <DelegationSelector
        delegations={conference.delegations}
        placeholder="搜索提问代表团..."
        onselect={handleSelectQuestioner}
        resetOnSelect={true}
        excludeIds={excludeOriginalId}
      />
      <Button size="sm" variant="outline" class="h-8 text-xs" onclick={handleNoResponse}>
        <X size={12} class="mr-1" />
        无人提问（让渡给主席）
      </Button>
    </div>

    <!-- ═══ 让渡给评论 ═══ -->
  {:else if yp.yieldType === 'comment' && !hasQuestioner}
    <div class="space-y-3">
      <p class="text-xs text-muted-foreground">主席口头呼吁场下评论后，选择举手评论的代表团：</p>
      <DelegationSelector
        delegations={conference.delegations}
        placeholder="搜索评论代表团..."
        onselect={handleSelectCommenter}
        resetOnSelect={true}
        excludeIds={excludeOriginalId}
      />
      <Button size="sm" variant="outline" class="h-8 text-xs" onclick={handleNoResponse}>
        <X size={12} class="mr-1" />
        无人评论（让渡给主席）
      </Button>
    </div>

    <!-- ═══ 提问已指定：回答阶段 ═══ -->
  {:else if yp.yieldType === 'question' && hasQuestioner}
    <div class="space-y-3 text-center">
      <div class="rounded-md bg-indigo-100 px-4 py-3 dark:bg-indigo-900/30">
        <p class="text-sm font-medium text-indigo-700 dark:text-indigo-400">
          {yp.questionerDelegation?.name} 正在提问
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          提问不占用时间，提问完成后 {yp.originalDelegation.name} 将使用剩余 {remainingFormatted} 回答问题
        </p>
      </div>
      <p class="text-xs text-muted-foreground">
        提问方已指定，请恢复计时让发言人回答。发言人不可再次让渡。
      </p>
    </div>
  {/if}
</div>
