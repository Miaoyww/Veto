<script lang="ts">
  import {
    Presentation, Timer, MessageSquare, Pencil,
    FileDown, FileUp, X, Gavel, Coffee, ListOrdered
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import {
    currentConference,
    proposeMotion,
    approveMotion
  } from '$lib/stores/conference/conference-store'
  import {
    resolveMotion,
    calcMaxSpeakers
  } from '$lib/engine/conference-engine'
  import { MOTION_LABELS } from '$lib/types-conference'
  import type { MotionType } from '$lib/types-conference'

  let { open = $bindable(false) }: { open: boolean } = $props()

  const conf = $derived($currentConference)

  // 常用动议列表（排除需要在表单中选择具体类型的）
  const motionTypes: MotionType[] = [
    'open_speakers_list',
    'moderated_caucus',
    'unmoderated_caucus',
    'modify_speaking_time',
    'closure_debate',
    'suspend_meeting'
  ]

  const MOTION_ICONS: Record<string, typeof Presentation> = {
    open_speakers_list: Presentation,
    moderated_caucus: MessageSquare,
    unmoderated_caucus: Coffee,
    modify_speaking_time: Pencil,
    closure_debate: Gavel,
    suspend_meeting: Timer
  }

  // ---- Form state ----
  let selectedType = $state<MotionType | null>(null)
  // Moderated Caucus
  let mcTopic = $state('')
  let mcTotalMin = $state(10)
  let mcSpeakerSec = $state(60)
  // Unmoderated Caucus
  let ucDurationMin = $state(15)
  // Modify Speaking Time
  let newTimeSec = $state(90)
  // Proposer
  let selectedProposerId = $state('')

  $effect(() => {
    if (open && conf && conf.delegations.length > 0 && !selectedProposerId) {
      // 默认选中第一个在场代表团
      const first = conf.delegations.find(
        (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
      )
      selectedProposerId = first?.id ?? conf.delegations[0].id
    }
  })

  function resetForm(): void {
    selectedType = null
    mcTopic = ''
    mcTotalMin = 10
    mcSpeakerSec = 60
    ucDurationMin = 15
    newTimeSec = 90
  }

  function handleOpenChange(value: boolean): void {
    if (!value) {
      resetForm()
    }
    open = value
  }

  function handlePropose(): void {
    if (!selectedType || !conf) return

    const proposerId = selectedProposerId || conf.delegations[0]?.id
    if (!proposerId) return

    let motionData: any = {
      type: selectedType,
      proposedByDelegationId: proposerId
    }

    switch (selectedType) {
      case 'moderated_caucus':
        motionData.topic = mcTopic.trim() || '未指定主题'
        motionData.totalTimeSec = mcTotalMin * 60
        motionData.speakingTimePerPersonSec = mcSpeakerSec
        motionData.maxSpeakers = calcMaxSpeakers(mcTotalMin * 60, mcSpeakerSec)
        break
      case 'unmoderated_caucus':
        motionData.durationSec = ucDurationMin * 60
        break
      case 'modify_speaking_time':
        motionData.newTimeSec = newTimeSec
        break
    }

    proposeMotion(motionData)

    // 判断是否需要表决
    const resolution = resolveMotion(selectedType)
    if (resolution.autoApprove) {
      // 找到刚创建的动议并自动通过
      const updatedConf = $currentConference
      const newMotion = updatedConf?.motions[updatedConf.motions.length - 1]
      if (newMotion) {
        approveMotion(newMotion.id)

        // 对于自动通过的磋商动议，可直接开始磋商
        if (selectedType === 'moderated_caucus' || selectedType === 'unmoderated_caucus') {
          // 延迟导入避免循环依赖
          import('$lib/stores/conference/conference-store').then(({ startCaucus }) => {
            startCaucus(newMotion.id)
          })
        }
      }
    }

    open = false
    resetForm()
  }

  const mcMaxSpeakers = $derived(calcMaxSpeakers(mcTotalMin * 60, mcSpeakerSec))
  const canPropose = $derived(selectedType !== null && selectedProposerId !== '')
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-lg">
      <Dialog.Header class="pb-1">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold">
          <Presentation size={18} class="text-indigo-500" />
          提出动议
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          选择动议类型并填写必要参数
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-2">
        <!-- 动议类型选择 -->
        <div>
          <Label class="mb-2 block text-xs text-muted-foreground">动议类型</Label>
          <div class="grid grid-cols-2 gap-2">
            {#each motionTypes as mt}
              {@const Icon = MOTION_ICONS[mt] ?? Presentation}
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all {selectedType === mt
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'hover:bg-muted'}"
                onclick={() => (selectedType = mt)}
              >
                <Icon size={14} />
                <span class="text-xs font-medium">{MOTION_LABELS[mt]}</span>
              </button>
            {/each}
          </div>
        </div>

        <Separator />

        <!-- 动议参数表单 -->
        {#if selectedType === 'moderated_caucus'}
          <div class="space-y-3">
            <div>
              <Label class="mb-1.5 block text-xs text-muted-foreground">主题</Label>
              <Input bind:value={mcTopic} placeholder="如: Climate Finance" class="h-9 text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">总时长（分钟）</Label>
                <Input type="number" min="1" max="120" bind:value={mcTotalMin} class="h-9 text-sm" />
              </div>
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">每人发言（秒）</Label>
                <Input type="number" min="15" max="600" step="15" bind:value={mcSpeakerSec} class="h-9 text-sm" />
              </div>
            </div>
            <div class="rounded-md bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              {mcTotalMin}分钟 ÷ 每人{mcSpeakerSec}秒 = 最多 <span class="font-semibold text-foreground">{mcMaxSpeakers}</span> 人发言
            </div>
          </div>
        {:else if selectedType === 'unmoderated_caucus'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">时长（分钟）</Label>
            <Input type="number" min="1" max="120" bind:value={ucDurationMin} class="h-9 text-sm w-32" />
            <p class="mt-1 text-[10px] text-muted-foreground">开始后将进行倒计时</p>
          </div>
        {:else if selectedType === 'modify_speaking_time'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">新的默认发言时间（秒）</Label>
            <Input type="number" min="30" max="600" step="15" bind:value={newTimeSec} class="h-9 text-sm w-32" />
          </div>
        {:else if selectedType}
          <div class="text-xs text-muted-foreground">
            此动议将直接提交表决
          </div>
        {/if}

        <!-- 提出方 -->
        {#if selectedType && conf}
          <Separator />
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">动议提出方</Label>
            <select
              bind:value={selectedProposerId}
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {#each conf.delegations.filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting') as d (d.id)}
                <option value={d.id}>{d.name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        <Button onclick={handlePropose} disabled={!canPropose} class="min-w-[120px] gap-2">
          提交动议
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
