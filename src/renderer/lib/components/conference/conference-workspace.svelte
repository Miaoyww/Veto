<script lang="ts">
  import { navigate } from '$lib/router.svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import SpeakersListPanel from '$lib/components/conference/speakers-list-panel.svelte'
  import VotingPanel from '$lib/components/conference/voting-panel.svelte'
  import CaucusTimer from '$lib/components/conference/caucus-timer.svelte'
  import MotionDialog from '$lib/components/conference/motion-dialog.svelte'
  import { Gavel, Play, Square, Users, Monitor } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import {
    setPhase,
    suspendMeeting,
    resumeMeeting,
    closeMeeting
  } from '$lib/stores/conference/conference-store'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'

  const conf = $derived($currentConference)

  let motionDialogOpen = $state(false)

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
      case 'general_debate':
      case 'caucus':
        motionDialogOpen = true
        break
      case 'voting':
        break
      default:
        break
    }
  }

  const primaryActionLabel = $derived.by(() => {
    if (!conf) return ''
    switch (conf.phase) {
      case 'general_debate': return '提出动议'
      case 'caucus': return '提出动议'
      case 'voting': return ''
      default: return ''
    }
  })

  const isSuspended = $derived(conf?.phase === 'suspended')
  const isClosed = $derived(conf?.phase === 'closed')
</script>

<div class="flex min-w-0 flex-1 flex-col bg-background">
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

        {#if primaryActionLabel}
          <Button size="sm" class="h-8 gap-1.5 text-xs" onclick={handlePrimaryAction}>
            <Play size={12} />
            {primaryActionLabel}
          </Button>
        {/if}

        {#if isSuspended}
          <Button size="sm" variant="outline" class="h-8 gap-1.5 text-xs" onclick={resumeMeeting}>
            <Play size={12} />
            恢复会议
          </Button>
        {:else if !isClosed}
          <Button size="sm" variant="ghost" class="h-8 gap-1.5 text-xs" onclick={suspendMeeting}>
            <Square size={12} />
            休会
          </Button>
        {/if}

        {#if conf.phase === 'general_debate'}
          <Button size="sm" variant="ghost" class="h-8 gap-1.5 text-xs text-red-500" onclick={closeMeeting}>
            闭幕
          </Button>
        {/if}
      </div>
    </div>

    <!-- 阶段对应内容 -->
    <div class="flex flex-1 items-center justify-center overflow-hidden p-6">
      {#if conf.phase === 'preamble'}
        <div class="flex flex-col items-center gap-6 text-center">
          <div class="flex flex-col items-center gap-2">
            <Users size={48} class="opacity-30" />
            <h2 class="text-xl font-bold text-foreground">会前准备</h2>
            <p class="text-sm text-muted-foreground">所有代表团已就位，准备开始点名</p>
          </div>
          <Button size="lg" class="gap-2 bg-indigo-600 hover:bg-indigo-700" onclick={startRollCall}>
            <Play size={18} />
            开始点名
          </Button>
        </div>
      {:else if conf.phase === 'roll_call'}
        <div class="flex flex-col items-center gap-6 text-center">
          <div class="flex flex-col items-center gap-2">
            <Users size={48} class="opacity-30" />
            <h2 class="text-xl font-bold text-foreground">点名进行中</h2>
            <p class="text-sm text-muted-foreground">点名页面已在独立窗口中打开</p>
          </div>
          <Button size="lg" class="gap-2 bg-indigo-600 hover:bg-indigo-700" onclick={startRollCall}>
            <Play size={18} />
            进入点名页面
          </Button>
        </div>
      {:else if conf.phase === 'general_debate'}
        <SpeakersListPanel />
      {:else if conf.phase === 'caucus'}
        <CaucusTimer />
      {:else if conf.phase === 'voting'}
        <VotingPanel />
      {:else if isSuspended}
        <div class="flex flex-col items-center gap-4 text-muted-foreground">
          <Gavel size={48} class="opacity-30" />
          <p class="text-lg font-medium">会议休会中</p>
          <p class="text-sm opacity-70">点击"恢复会议"继续</p>
        </div>
      {:else if isClosed}
        <div class="flex flex-col items-center gap-4 text-muted-foreground">
          <Gavel size={48} class="opacity-30" />
          <p class="text-lg font-medium">会议已闭幕</p>
          <p class="text-sm opacity-70">感谢各位代表的参与</p>
        </div>
      {:else}
        <div class="text-muted-foreground">当前阶段: {conf.phase}</div>
      {/if}
    </div>

    <!-- Motion Dialog -->
    <MotionDialog bind:open={motionDialogOpen} />
  {:else}
    <div class="flex flex-1 items-center justify-center text-muted-foreground">
      <p>请选择或创建一场大会</p>
    </div>
  {/if}
</div>
