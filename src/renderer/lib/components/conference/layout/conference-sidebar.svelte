<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import AppSidebar from './app-sidebar.svelte'

  import { onMount } from 'svelte'
  import { navigate } from '$lib/router.svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import VotingPanel from '$lib/components/conference/voting/voting-panel.svelte'
  import CaucusSetupPanel from '$lib/components/conference/caucus/caucus-setup-panel.svelte'
  import GeneralDebatePanel from '$lib/components/conference/speakers/general-debate-panel.svelte'
  import ModeratedCaucusPanel from '$lib/components/conference/speakers/moderated-caucus-panel.svelte'
  import FreeCaucusPanel from '$lib/components/conference/speakers/free-caucus-panel.svelte'
  import PlaceholderPage from '$lib/components/conference/layout/placeholder-page.svelte'
  import MotionDialog from '$lib/components/conference/motion/motion-dialog.svelte'
  import PointDialog from '$lib/components/conference/point/point-dialog.svelte'
  import ConferenceLogDialog from '$lib/components/conference/conference-log-dialog.svelte'
  import { Gavel, Play, Users, Monitor, HelpCircle, Timer, ScrollText } from '@lucide/svelte'
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

  const isTimerActive = $derived(conf?.activeSpeaker != null)
  /** 磋商/磋商准备阶段不可发起新动议（动议通过后的环节） */
  const isMotionInProgress = $derived(conf?.phase === 'caucus' || conf?.phase === 'caucus_setup')
  const canProposeMotion = $derived(!isTimerActive && !isMotionInProgress)
  const canProposePoint = $derived(conf?.phase !== 'closed')
</script>

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2">
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ms-1" />
        <Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
      </div>
    </header>
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {#if conf}
        <!-- 阶段对应内容 -->
        <div class="flex flex-1 min-h-0 overflow-hidden p-6">
          {#if conf.phase === 'preamble'}
            <PlaceholderPage title="会前准备" subtitle="所有代表团已就位，准备开始点名">
              {#snippet icon()}<Users size={48} class="opacity-30" />{/snippet}
              <Button
                size="lg"
                class="gap-2 bg-indigo-600 hover:bg-indigo-700"
                onclick={startRollCall}
              >
                <Play size={18} />
                开始点名
              </Button>
            </PlaceholderPage>
          {:else if conf.phase === 'roll_call'}
            <PlaceholderPage title="点名进行中" subtitle="点名页面已在独立窗口中打开">
              {#snippet icon()}<Users size={48} class="opacity-30" />{/snippet}
              <Button
                size="lg"
                class="gap-2 bg-indigo-600 hover:bg-indigo-700"
                onclick={startRollCall}
              >
                <Play size={18} />
                进入点名页面
              </Button>
            </PlaceholderPage>
          {:else if conf.phase === 'pending_speakers_list'}
            <PlaceholderPage
              title="等待开启主发言名单"
              subtitle="点名已完成，需由代表动议「开启主发言名单」以进入一般性辩论"
            >
              {#snippet icon()}<Users size={48} class="opacity-30" />{/snippet}
            </PlaceholderPage>
          {:else if conf.phase === 'general_debate'}
            <ScrollArea class="flex-1">
              <GeneralDebatePanel />
            </ScrollArea>
          {:else if conf.phase === 'caucus_setup'}
            <ScrollArea class="flex-1">
              <CaucusSetupPanel />
            </ScrollArea>
          {:else if conf.phase === 'caucus'}
            <ScrollArea class="flex-1">
              {#if conf.activeCaucus?.type === 'moderated'}
                <ModeratedCaucusPanel />
              {:else}
                <FreeCaucusPanel />
              {/if}
            </ScrollArea>
          {:else if conf.phase === 'voting'}
            <ScrollArea class="flex-1">
              <VotingPanel />
            </ScrollArea>
          {:else if conf.phase === 'suspended'}
            <PlaceholderPage title="会议休会中" subtitle="点击「恢复会议」继续">
              {#snippet icon()}<Gavel size={48} class="opacity-30" />{/snippet}
            </PlaceholderPage>
          {:else if conf.phase === 'closed'}
            <PlaceholderPage title="会议已闭幕" subtitle="感谢各位代表的参与">
              {#snippet icon()}<Gavel size={48} class="opacity-30" />{/snippet}
            </PlaceholderPage>
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
  </Sidebar.Inset>
</Sidebar.Provider>
