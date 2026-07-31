<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from '$lib/router.svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import SpeakerQueue from '$lib/components/conference/speakers/speaker-queue.svelte'
  import VotingPanel from '$lib/components/conference/voting/voting-panel.svelte'
  import CaucusSetupPanel from '$lib/components/conference/caucus/caucus-setup-panel.svelte'
  import MotionDialog from '$lib/components/conference/motion/motion-dialog.svelte'
  import PointDialog from '$lib/components/conference/point/point-dialog.svelte'
  import ConferenceLogDialog from '$lib/components/conference/conference-log-dialog.svelte'
  import {
    Gavel,
    Play,
    Users,
    Monitor,
    HelpCircle,
    UserRoundCheck,
    Timer,
    ScrollText
  } from '@lucide/svelte'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { Button } from '$lib/components/ui/button/index.js'
  import { setPhase, resumeMeeting } from '$lib/stores/conference/conference-store'
  import {
    getDisplayBridge,
    buildDisplayData,
    initWsPort
  } from '$lib/services/conference-display-bridge'
  import { timerDialogOpen } from '$lib/stores/conference/timer-store'

  const conf = $derived($currentConference)

  let motionDialogOpen = $state(false)
  let pointDialogOpen = $state(false)
  let logDialogOpen = $state(false)
  let wsPort = $state<number | null>(null)

  onMount(async () => {
    wsPort = await initWsPort()
  })

  $effect(() => {
    console.log('当前会议状态更新:', {
      phase: conf?.phase,
      activeSpeaker: conf?.activeSpeaker,
      caucusSetup: conf?.caucusSetup
    })
  })
  async function openDisplayWindow(): Promise<void> {
    if (!conf) return
    const bridge = getDisplayBridge()
    const ok = await bridge.openDisplay(conf.id)
    if (ok) {
      // 等待 Display 端 WebSocket 连接就绪
      await new Promise((r) => setTimeout(r, 500))
      bridge.sendUpdate(buildDisplayData(conf))
    }
  }

  function startRollCall(): void {
    if (!conf) return
    setPhase('roll_call')
    navigate(`/conference/${conf.id}/roll-call`)
  }

  // Phase-specific action buttons
  function handlePrimaryAction(): void {
    if (!conf) return
    switch (conf.phase) {
      case 'pending_speakers_list':
      case 'general_debate':
      case 'caucus':
      case 'caucus_setup':
      case 'voting':
        motionDialogOpen = true
        break
      default:
        break
    }
  }

  const primaryActionLabel = $derived.by(() => {
    if (!conf) return ''
    switch (conf.phase) {
      case 'pending_speakers_list':
        return '动议与程序'
      case 'general_debate':
        return '动议与程序'
      case 'caucus':
        return '动议与程序'
      case 'caucus_setup':
        return '动议与程序'
      case 'voting':
        return '动议与程序'
      default:
        return ''
    }
  })

  const isSuspended = $derived(conf?.phase === 'suspended')
  const isClosed = $derived(conf?.phase === 'closed')
  const isTimerActive = $derived(conf?.activeSpeaker != null)
  /** 磋商/磋商准备阶段不可发起新动议（动议通过后的环节） */
  const isMotionInProgress = $derived(
    conf?.phase === 'caucus' || conf?.phase === 'caucus_setup'
  )
  const canProposeMotion = $derived(!isTimerActive && !isMotionInProgress)
  const canProposePoint = $derived(conf?.phase !== 'closed')
</script>

<div class="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
  {#if conf}
    <!-- 顶部横幅：阶段 + 控制 -->
    <div class="flex items-center gap-3 border-b px-6 py-3">
      <div class="flex items-center gap-2">
        <Gavel size={16} class="text-indigo-500" />
        <span class="text-sm font-semibold text-foreground">
          {PHASE_LABELS[conf.phase] ?? conf.phase}
        </span>
      </div>

      <div class="ml-auto flex items-center gap-2">
        {#if wsPort !== null}
          <span
            class="select-none text-[11px] text-muted-foreground/70"
            title="WebSocket 端口：{wsPort}"
          >
            WS :{wsPort}
          </span>
        {/if}

        <Button
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          title="打开显示窗口（投影/第二屏幕）"
          onclick={openDisplayWindow}
        >
          <Monitor size={12} />
          显示窗口
        </Button>

        <Button
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          title="会议日志"
          onclick={() => (logDialogOpen = true)}
        >
          <ScrollText size={12} />
          日志
        </Button>

        <Button
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          title="打开简易计时器"
          onclick={() => {
            timerDialogOpen.set(true)
          }}
        >
          <Timer size={12} />
          计时器
        </Button>

        <Button
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          title="代表管理"
          onclick={() => navigate(`/conference/${conf.id}/delegations`)}
        >
          <UserRoundCheck size={12} />
          代表管理
        </Button>

        {#if canProposePoint}
          <Button
            size="sm"
            variant="outline"
            class="h-8 gap-1.5 text-xs"
            title="提出问题"
            onclick={() => (pointDialogOpen = true)}
          >
            <HelpCircle size={12} />
            问题
          </Button>
        {/if}

        {#if primaryActionLabel}
          <Button
            size="sm"
            class="h-8 gap-1.5 text-xs"
            onclick={handlePrimaryAction}
            disabled={!canProposeMotion}
            title={isTimerActive
              ? '发言计时进行中，无法提出动议'
              : isMotionInProgress
                ? '磋商进行中，无法提出新动议'
                : ''}
          >
            <Play size={12} />
            {primaryActionLabel}
          </Button>
        {/if}

        {#if isSuspended}
          <Button size="sm" variant="outline" class="h-8 gap-1.5 text-xs" onclick={resumeMeeting}>
            <Play size={12} />
            恢复会议
          </Button>
        {/if}
      </div>
    </div>

    <!-- 阶段对应内容 -->
    <div class="flex flex-1 min-h-0 overflow-hidden p-6">
      {#if conf.phase === 'preamble'}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-6 text-center">
            <div class="flex flex-col items-center gap-2">
              <Users size={48} class="opacity-30" />
              <h2 class="text-xl font-bold text-foreground">会前准备</h2>
              <p class="text-sm text-muted-foreground">所有代表团已就位，准备开始点名</p>
            </div>
            <Button
              size="lg"
              class="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onclick={startRollCall}
            >
              <Play size={18} />
              开始点名
            </Button>
          </div>
        </div>
      {:else if conf.phase === 'roll_call'}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-6 text-center">
            <div class="flex flex-col items-center gap-2">
              <Users size={48} class="opacity-30" />
              <h2 class="text-xl font-bold text-foreground">点名进行中</h2>
              <p class="text-sm text-muted-foreground">点名页面已在独立窗口中打开</p>
            </div>
            <Button
              size="lg"
              class="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onclick={startRollCall}
            >
              <Play size={18} />
              进入点名页面
            </Button>
          </div>
        </div>
      {:else if conf.phase === 'pending_speakers_list'}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-6 text-center">
            <div class="flex flex-col items-center gap-2">
              <Users size={48} class="opacity-30" />
              <h2 class="text-xl font-bold text-foreground">等待开启主发言名单</h2>
              <p class="text-sm text-muted-foreground">
                点名已完成，需由代表动议「开启主发言名单」以进入一般性辩论
              </p>
            </div>
          </div>
        </div>
      {:else if conf.phase === 'general_debate'}
        <ScrollArea class="flex-1">
          <SpeakerQueue mode="general_debate" />
        </ScrollArea>
      {:else if conf.phase === 'caucus_setup'}
        <ScrollArea class="flex-1">
          <CaucusSetupPanel />
        </ScrollArea>
      {:else if conf.phase === 'caucus'}
        <ScrollArea class="flex-1">
          <SpeakerQueue mode="caucus" />
        </ScrollArea>
      {:else if conf.phase === 'voting'}
        <ScrollArea class="flex-1">
          <VotingPanel />
        </ScrollArea>
      {:else if isSuspended}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-4 text-muted-foreground">
            <Gavel size={48} class="opacity-30" />
            <p class="text-lg font-medium">会议休会中</p>
            <p class="text-sm opacity-70">点击"恢复会议"继续</p>
          </div>
        </div>
      {:else if isClosed}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-4 text-muted-foreground">
            <Gavel size={48} class="opacity-30" />
            <p class="text-lg font-medium">会议已闭幕</p>
            <p class="text-sm opacity-70">感谢各位代表的参与</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Motion Dialog -->
    {#key motionDialogOpen}
      <MotionDialog bind:open={motionDialogOpen} />
    {/key}

    <!-- Point Dialog -->
    {#key pointDialogOpen}
      <PointDialog bind:open={pointDialogOpen} />
    {/key}

    <!-- Log Dialog -->
    <ConferenceLogDialog bind:open={logDialogOpen} minutes={conf?.minutes ?? []} />
  {:else}
    <div class="flex flex-1 items-center justify-center text-muted-foreground">
      <p>请选择或创建一场大会</p>
    </div>
  {/if}
</div>
