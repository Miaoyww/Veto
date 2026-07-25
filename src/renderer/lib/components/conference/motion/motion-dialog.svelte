<script lang="ts">
  import {
    Presentation, Timer, MessageSquare, Pencil,
    FileDown, FileUp, X, Gavel, Coffee, ListOrdered, LogOut, Vote, FileText
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import {
    currentConference,
    motionDraft,
    proposeMotion,
    approveMotion,
    dismissLastResolvedMotion
  } from '$lib/stores/conference/conference-store'
  import {
    resolveMotion,
    calcMaxSpeakers
  } from '$lib/engine/conference-engine'
  import { navigate } from '$lib/router.svelte'
  import { MOTION_LABELS } from '$lib/types-conference'
  import type { MotionType } from '$lib/types-conference'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'

  let { open = $bindable(false) }: { open: boolean } = $props()

  const conf = $derived($currentConference)

  // 常用动议列表——根据当前阶段动态调整
  const motionTypes = $derived.by((): MotionType[] => {
    if (conf?.phase === 'voting') {
      // 结束辩论后：只能进行实质性投票或休会/闭幕
      return ['substantive_vote', 'suspend_meeting', 'close_meeting']
    }
    return [
      'open_speakers_list',
      'moderated_caucus',
      'unmoderated_caucus',
      'modify_speaking_time',
      'closure_debate',
      'suspend_meeting',
      'close_meeting'
    ]
  })

  const MOTION_ICONS: Record<string, typeof Presentation> = {
    open_speakers_list: Presentation,
    moderated_caucus: MessageSquare,
    unmoderated_caucus: Coffee,
    modify_speaking_time: Pencil,
    closure_debate: Gavel,
    suspend_meeting: Timer,
    close_meeting: LogOut,
    substantive_vote: Vote
  }

  // ---- Form state ----
  let selectedType = $state<MotionType | null>(null)
  // Moderated Caucus
  let mcTopic = $state('')
  let committedTopic = $state('')
  let mcTotalSec = $state(360)
  let committedMcTotalSec = $state(360)
  let mcSpeakerSec = $state(60)
  let committedMcSpeakerSec = $state(60)
  // Unmoderated Caucus
  let ucDurationMin = $state(15)
  let committedUcDurationMin = $state(15)
  // Modify Speaking Time
  let newTimeSec = $state(90)
  let committedNewTimeSec = $state(90)
  // Substantive Vote
  let documentName = $state('')
  let committedDocumentName = $state('')
  // Proposer
  let selectedProposerId = $state('')

  function resetForm(): void {
    selectedProposerId = ''
    selectedType = null
    mcTopic = ''
    committedTopic = ''
    mcTotalSec = 360
    committedMcTotalSec = 360
    mcSpeakerSec = 60
    committedMcSpeakerSec = 60
    ucDurationMin = 15
    committedUcDurationMin = 15
    newTimeSec = 90
    committedNewTimeSec = 90
    documentName = ''
    committedDocumentName = ''
  }

  function handleOpenChange(value: boolean): void {
    if (!value) {
      resetForm()
      motionDraft.set(null)
      dismissLastResolvedMotion()
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
        motionData.totalTimeSec = mcTotalSec
        motionData.speakingTimePerPersonSec = mcSpeakerSec
        motionData.maxSpeakers = calcMaxSpeakers(mcTotalSec, mcSpeakerSec)
        break
      case 'unmoderated_caucus':
        motionData.durationSec = ucDurationMin * 60
        break
      case 'modify_speaking_time':
        motionData.newTimeSec = newTimeSec
        break
      case 'substantive_vote':
        motionData.documentName = documentName.trim() || '未命名文件'
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
    } else {
      // 需要表决 → 打开动议表决页
      navigate(`/conference/${conf.id}/motion`)
    }

    open = false
    resetForm()
    motionDraft.set(null)
  }

  const mcMaxSpeakers = $derived(calcMaxSpeakers(mcTotalSec, mcSpeakerSec))
  const canPropose = $derived(
    selectedType !== null &&
    selectedProposerId !== '' &&
    (selectedType !== 'substantive_vote' || documentName.trim() !== '')
  )

  // 实时同步动议草稿到 Display
  $effect(() => {
    if (!open) {
      motionDraft.set(null)
      return
    }
    const proposerDel = selectedProposerId
      ? conf?.delegations.find((d) => d.id === selectedProposerId)
      : null
    motionDraft.set({
      proposedByName: proposerDel?.name,
      type: selectedType ?? undefined,
      topic: selectedType === 'moderated_caucus' ? (committedTopic.trim() || undefined) : undefined,
      totalTimeSec: selectedType === 'moderated_caucus'
        ? committedMcTotalSec
        : selectedType === 'unmoderated_caucus'
          ? committedUcDurationMin * 60
          : undefined,
      speakingTimePerPersonSec: selectedType === 'moderated_caucus' ? committedMcSpeakerSec : undefined,
      newTimeSec: selectedType === 'modify_speaking_time' ? committedNewTimeSec : undefined,
      documentName: selectedType === 'substantive_vote' ? (committedDocumentName.trim() || undefined) : undefined
    })
  })
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-lg">
      <Dialog.Header class="pb-1">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold">
          <Presentation size={18} class="text-indigo-500" />
          动议与程序
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          选择提出方后选择动议或程序类型
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-2">
        <!-- 第一步：动议提出方（始终可见） -->
        {#if conf}
          <div>
            <Label class="mb-2 block text-xs text-muted-foreground">动议提出方</Label>
            <DelegationSelector
              delegations={conf.delegations}
              bind:value={selectedProposerId}
              presentOnly={true}
            />
          </div>
        {/if}

        <!-- 第二步：动议类型选择（选完提出方后出现） -->
        {#if selectedProposerId}
          <Separator />
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
        {/if}

        <!-- 第三步：动议参数表单 -->
        {#if selectedType === 'moderated_caucus'}
          <Separator />
          <div class="space-y-3">
            <div>
              <Label class="mb-1.5 block text-xs text-muted-foreground">主题</Label>
              <Input bind:value={mcTopic} class="h-9 text-sm" onblur={() => (committedTopic = mcTopic)} />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">总时长（秒）</Label>
                <Input type="number" min="30" max="3600" step="30" bind:value={mcTotalSec} class="h-9 text-sm" onblur={() => (committedMcTotalSec = mcTotalSec)} />
              </div>
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">每人发言（秒）</Label>
                <Input type="number" min="15" max="600" step="15" bind:value={mcSpeakerSec} class="h-9 text-sm" onblur={() => (committedMcSpeakerSec = mcSpeakerSec)} />
              </div>
            </div>
            <div class="rounded-md bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              {mcTotalSec}秒 ÷ 每人{mcSpeakerSec}秒 = 最多 <span class="font-semibold text-foreground">{mcMaxSpeakers}</span> 人发言
            </div>
          </div>
        {:else if selectedType === 'unmoderated_caucus'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">时长（分钟）</Label>
            <Input type="number" min="1" max="120" bind:value={ucDurationMin} class="h-9 text-sm w-32" onblur={() => (committedUcDurationMin = ucDurationMin)} />
            <p class="mt-1 text-[10px] text-muted-foreground">开始后将进行倒计时</p>
          </div>
        {:else if selectedType === 'modify_speaking_time'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">新的默认发言时间（秒）</Label>
            <Input type="number" min="30" max="600" step="15" bind:value={newTimeSec} class="h-9 text-sm w-32" onblur={() => (committedNewTimeSec = newTimeSec)} />
          </div>
        {:else if selectedType === 'substantive_vote'}
          <Separator />
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">文件名称</Label>
            <Input
              bind:value={documentName}
              class="h-9 text-sm"
              placeholder="例如：决议草案 1.1"
              onblur={() => (committedDocumentName = documentName)}
              list="document-name-suggestions"
            />
            {#if conf?.documentNames?.length}
              <datalist id="document-name-suggestions">
                {#each conf.documentNames as name}
                  <option value={name} />
                {/each}
              </datalist>
            {/if}
            <p class="mt-1 text-[10px] text-muted-foreground">
              此文件将进入唱名表决（2/3多数）
            </p>
          </div>
        {:else if selectedType}
          <div class="text-xs text-muted-foreground">
            此动议将进入举牌表决
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
