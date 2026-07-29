<script lang="ts">
  import {
    Presentation,
    Timer,
    MessageSquare,
    Pencil,
    Gavel,
    Coffee,
    LogOut,
    Vote,
    UserRoundCheck,
    Mic
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
  import {
    currentConference,
    motionDraft,
    proposeMotion,
    approveMotion,
    dismissLastResolvedMotion
  } from '$lib/stores/conference/conference-store'
  import { resolveMotion, calcMaxSpeakers } from '$lib/engine/conference-engine'
  import { navigate } from '$lib/router.svelte'
  import { MOTION_LABELS } from '$lib/types-conference'
  import type { MotionType, Attendance, Delegation } from '$lib/types-conference'
  import DelegationSelector from '$lib/components/conference/common/delegation-selector.svelte'

  let { open = $bindable(false) }: { open: boolean } = $props()

  const conf = $derived($currentConference)

  // Proposer
  let selectedProposer: Delegation | null = $state(null)

  // 常用动议列表——根据当前阶段和选中代表团的出席状态动态调整
  const motionTypes = $derived.by((): MotionType[] => {
    // 缺席的代表团只能提出"更改出席状态"动议
    if (selectedProposer && selectedProposer.attendance === 'absent') {
      return ['change_attendance']
    }

    if (conf?.phase === 'voting') {
      // 结束辩论后：可进行实质性投票、开启主发言名单（退出投票阶段）、休会/闭幕
      return [
        'change_attendance',
        'substantive_vote',
        'open_speakers_list',
        'suspend_meeting',
        'close_meeting'
      ]
    }
    // 等待开启主发言名单：首要动议为开启主发言名单
    if (conf?.phase === 'pending_speakers_list') {
      return ['change_attendance', 'open_speakers_list']
    }
    // 主发言名单已开启时不可再次动议开启
    if (conf?.phase === 'general_debate') {
      return [
        'change_attendance',
        'moderated_caucus',
        'unmoderated_caucus',
        'individual_speech',
        'modify_speaking_time',
        'closure_debate',
        'suspend_meeting',
        'close_meeting'
      ]
    }
    return [
      'change_attendance',
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
    substantive_vote: Vote,
    change_attendance: UserRoundCheck,
    individual_speech: Mic
  }

  // ---- Form state ----
  let selectedType = $state<MotionType | null>(null)
  // ToggleGroup 需要 string 类型的 value 绑定
  let toggleValue = $state('')
  $effect(() => {
    if (toggleValue) {
      selectedType = toggleValue as MotionType
    }
  })
  // Moderated Caucus（无预设值，必须手动填写）
  let mcTopic = $state('')
  let committedTopic = $state('')
  let mcTotalSec = $state<number | null>(null)
  let committedMcTotalSec = $state<number | null>(null)
  let mcSpeakerSec = $state<number | null>(null)
  let committedMcSpeakerSec = $state<number | null>(null)
  // Unmoderated Caucus
  let ucDurationMin = $state(15)
  let committedUcDurationMin = $state(15)
  // Modify Speaking Time
  let newTimeSec = $state(90)
  let committedNewTimeSec = $state(90)
  // Substantive Vote
  let documentName = $state('')
  let committedDocumentName = $state('')
  // Change Attendance —— 由当前出席状态决定，只能选相反状态
  let newAttendance = $derived<Attendance>(
    selectedProposer?.attendance === 'present' ? 'absent' : 'present'
  )
  // Individual Speech
  let isDurationSec = $state(120)
  let committedIsDurationSec = $state(120)

  function resetForm(): void {
    selectedProposer = null
    selectedType = null
    toggleValue = ''
    mcTopic = ''
    committedTopic = ''
    mcTotalSec = null
    committedMcTotalSec = null
    mcSpeakerSec = null
    committedMcSpeakerSec = null
    ucDurationMin = 15
    committedUcDurationMin = 15
    newTimeSec = 90
    committedNewTimeSec = 90
    documentName = ''
    committedDocumentName = ''
    isDurationSec = 120
    committedIsDurationSec = 120
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

    const proposerDel = selectedProposer || conf.delegations[0]
    if (!proposerDel) return

    // 使用 committed 值（onblur 已提交），保证 Display 端动画已完整播放
    let motionData: any = {
      type: selectedType,
      proposedBy: proposerDel
    }

    switch (selectedType) {
      case 'moderated_caucus': {
        const total = committedMcTotalSec ?? 0
        const perSpeaker = committedMcSpeakerSec ?? 0
        motionData.topic = committedTopic.trim() || '未指定主题'
        motionData.totalTimeSec = total
        motionData.speakingTimePerPersonSec = perSpeaker
        motionData.maxSpeakers = calcMaxSpeakers(total, perSpeaker)
        break
      }
      case 'unmoderated_caucus':
        motionData.durationSec = committedUcDurationMin * 60
        break
      case 'modify_speaking_time':
        motionData.newTimeSec = committedNewTimeSec
        break
      case 'substantive_vote':
        motionData.documentName = committedDocumentName.trim() || '未命名文件'
        break
      case 'change_attendance':
        motionData.newAttendance = newAttendance
        break
      case 'individual_speech':
        motionData.durationSec = committedIsDurationSec
        break
    }

    proposeMotion(motionData)

    // 判断是否需要表决：需表决 → 导航到动议表决页；否则直接通过执行
    const resolution = resolveMotion(selectedType)
    if (!resolution.requiresVoting || resolution.autoApprove) {
      const updatedConf = $currentConference
      const newMotion = updatedConf?.motions[updatedConf.motions.length - 1]
      if (newMotion) {
        approveMotion(newMotion.id)

        if (selectedType === 'moderated_caucus' || selectedType === 'unmoderated_caucus' || selectedType === 'individual_speech') {
          import('$lib/stores/conference/conference-store').then(({ startCaucus }) => {
            startCaucus(newMotion.id)
          })
        }
      }
    } else {
      navigate(`/conference/${conf.id}/motion`)
    }

    open = false
    resetForm()
    motionDraft.set(null)
  }

  const mcMaxSpeakers = $derived(
    mcTotalSec != null && mcSpeakerSec != null && mcSpeakerSec > 0
      ? calcMaxSpeakers(mcTotalSec, mcSpeakerSec)
      : 0
  )

  // 当前表单是否有未失焦的输入（live !== committed），防止动画未完成就提交
  const isDirty = $derived.by(() => {
    switch (selectedType) {
      case 'moderated_caucus':
        return (
          mcTopic !== committedTopic ||
          mcTotalSec !== committedMcTotalSec ||
          mcSpeakerSec !== committedMcSpeakerSec
        )
      case 'unmoderated_caucus':
        return ucDurationMin !== committedUcDurationMin
      case 'individual_speech':
        return isDurationSec !== committedIsDurationSec
      case 'modify_speaking_time':
        return newTimeSec !== committedNewTimeSec
      case 'substantive_vote':
        return documentName !== committedDocumentName
      case 'change_attendance':
        return false // no debounce needed for delegation selector
      default:
        return false
    }
  })

  const canPropose = $derived(
    selectedType !== null &&
      selectedProposer !== null &&
      !isDirty &&
      (selectedType !== 'substantive_vote' || committedDocumentName.trim() !== '') &&
      (selectedType !== 'moderated_caucus' ||
        (committedTopic.trim() !== '' &&
          committedMcTotalSec != null &&
          committedMcTotalSec > 0 &&
          committedMcSpeakerSec != null &&
          committedMcSpeakerSec > 0))
  )

  // 实时同步动议草稿到 Display
  $effect(() => {
    if (!open) {
      motionDraft.set(null)
      return
    }
    const proposerDel = selectedProposer
    motionDraft.set({
      proposedBy: proposerDel ?? undefined,
      type: selectedType ?? undefined,
      isRequestingVote: selectedType ? resolveMotion(selectedType).requiresVoting : undefined,
      topic: selectedType === 'moderated_caucus' ? committedTopic.trim() || undefined : undefined,
      totalTimeSec:
        selectedType === 'moderated_caucus'
          ? committedMcTotalSec
          : selectedType === 'unmoderated_caucus'
            ? committedUcDurationMin * 60
            : selectedType === 'individual_speech'
              ? committedIsDurationSec
              : undefined,
      speakingTimePerPersonSec:
        selectedType === 'moderated_caucus' ? committedMcSpeakerSec : undefined,
      newTimeSec: selectedType === 'modify_speaking_time' ? committedNewTimeSec : undefined,
      documentName:
        selectedType === 'substantive_vote' ? committedDocumentName.trim() || undefined : undefined
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
            <DelegationSelector delegations={conf.delegations} bind:value={selectedProposer} />
          </div>
        {/if}

        <!-- 第二步：动议类型选择（选完提出方后出现） -->
        {#if selectedProposer}
          <Separator />
          <div>
            <Label class="mb-2 block text-xs text-muted-foreground">动议类型</Label>
            <ToggleGroup.Root type="single" bind:value={toggleValue} class="grid grid-cols-2 gap-2">
              {#each motionTypes as mt (mt)}
                {@const Icon = MOTION_ICONS[mt] ?? Presentation}
                <ToggleGroup.Item value={mt}>
                  <Icon size={14} />
                  <span class="text-xs font-medium">{MOTION_LABELS[mt]}</span>
                </ToggleGroup.Item>
              {/each}
            </ToggleGroup.Root>
          </div>
        {/if}

        <!-- 第三步：动议参数表单 -->
        {#if selectedType === 'moderated_caucus'}
          <Separator />
          <div class="space-y-3">
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <Label class="text-xs text-muted-foreground">主题</Label>
                <span class="text-[10px] text-muted-foreground/60">{mcTopic.length}/100</span>
              </div>
              <Input
                bind:value={mcTopic}
                maxlength={100}
                class="h-9 text-sm"
                onblur={() => (committedTopic = mcTopic)}
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">总时长（秒）</Label>
                <Input
                  type="number"
                  min="30"
                  max="3600"
                  step="30"
                  placeholder="必填"
                  bind:value={mcTotalSec}
                  class="h-9 text-sm"
                  onblur={() => (committedMcTotalSec = mcTotalSec)}
                />
                <div class="mt-1.5 flex gap-1">
                  {#each [180, 360, 600] as sec (sec)}
                    <Button
                      variant="outline"
                      size="xs"
                      onclick={() => ((mcTotalSec = sec), (committedMcTotalSec = sec))}
                    >
                      {sec}s
                    </Button>
                  {/each}
                </div>
              </div>
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">每人发言（秒）</Label>
                <Input
                  type="number"
                  min="15"
                  max={mcTotalSec ?? 600}
                  step="15"
                  placeholder="先填总时长"
                  disabled={mcTotalSec == null}
                  bind:value={mcSpeakerSec}
                  class="h-9 text-sm"
                  onblur={() => (committedMcSpeakerSec = mcSpeakerSec)}
                />
                <div class="mt-1.5 flex gap-1">
                  {#each [60, 120, 180] as sec (sec)}
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={mcTotalSec == null}
                      onclick={() => ((mcSpeakerSec = sec), (committedMcSpeakerSec = sec))}
                    >
                      {sec}s
                    </Button>
                  {/each}
                </div>
              </div>
            </div>
            {#if committedMcTotalSec != null && committedMcSpeakerSec != null && committedMcTotalSec > 0 && committedMcSpeakerSec > 0}
              <div
                class="rounded-md bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground"
              >
                {committedMcTotalSec}秒 ÷ 每人{committedMcSpeakerSec}秒 = 最多
                <span class="font-semibold text-foreground">{mcMaxSpeakers}</span> 人发言
              </div>
            {/if}
          </div>
        {:else if selectedType === 'unmoderated_caucus'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">时长（分钟）</Label>
            <Input
              type="number"
              min="1"
              max="120"
              bind:value={ucDurationMin}
              class="h-9 text-sm w-32"
              onblur={() => (committedUcDurationMin = ucDurationMin)}
            />
            <p class="mt-1 text-[10px] text-muted-foreground">开始后将进行倒计时</p>
          </div>
        {:else if selectedType === 'modify_speaking_time'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">新的默认发言时间（秒）</Label>
            <Input
              type="number"
              min="30"
              max="600"
              step="15"
              bind:value={newTimeSec}
              class="h-9 text-sm w-32"
              onblur={() => (committedNewTimeSec = newTimeSec)}
            />
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
                {#each conf.documentNames as name (name)}
                  <option value={name} />
                {/each}
              </datalist>
            {/if}
            <p class="mt-1 text-[10px] text-muted-foreground">此文件将进入唱名表决（2/3多数）</p>
          </div>
        {:else if selectedType === 'individual_speech'}
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">发言时长（秒）</Label>
            <Input
              type="number"
              min="1"
              step="15"
              bind:value={isDurationSec}
              class="h-9 text-sm w-32"
              onblur={() => (committedIsDurationSec = isDurationSec)}
            />
            <div class="mt-1.5 flex gap-1">
              {#each [60, 120, 300] as sec (sec)}
                <Button
                  variant="outline"
                  size="xs"
                  onclick={() => ((isDurationSec = sec), (committedIsDurationSec = sec))}
                >
                  {sec}s
                </Button>
              {/each}
            </div>
            {#if selectedProposer}
              <p class="mt-1 text-[10px] text-muted-foreground">
                {selectedProposer.name} 将获得 {committedIsDurationSec} 秒的独占发言时间
              </p>
            {/if}
          </div>
        {:else if selectedType === 'change_attendance'}
          <Separator />
          <div>
            <Label class="mb-1.5 block text-xs text-muted-foreground">新出席状态</Label>
            <div
              class="flex-1 rounded-lg border px-3 py-2 text-sm text-center font-medium {newAttendance ===
              'present'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-400'}"
            >
              {newAttendance === 'present' ? '出席' : '缺席'}
            </div>
            <p class="mt-1 text-[10px] text-muted-foreground">
              当前为{selectedProposer?.attendance === 'present'
                ? '出席'
                : '缺席'}，只能变更为相反状态
            </p>
          </div>
        {:else if selectedType}
          <div class="text-xs text-muted-foreground">此动议将进入举牌表决</div>
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
