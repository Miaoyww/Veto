<script lang="ts">
  import '../app.css'
  import '../css/components.css'
  import '$units' // 初始化 ModRegistry 基础数据
  import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte'
  import { ModeWatcher } from 'mode-watcher'
  import { Swords } from '@lucide/svelte'
  import { VETO_NAME } from '$lib/const'
  import logo from '$lib/assets/logo.svg'
  import TitleBar from '$lib/components/titlebar.svelte'
  import { dbGetAllPlugins } from '$lib/services/plugin-db'
  import { injectToRegistry } from '$lib/services/plugin-registry'
  import { markPluginsReady } from '$lib/registry/mod-registry.svelte'
  import SettingsDialog from '$lib/components/settings/settings-dialog.svelte'
  import TimerDialog from '$lib/components/conference/timer/timer-dialog.svelte'
  import { timerDialogOpen } from '$lib/stores/conference/timer-store'
  import ModeSidebar from '$lib/components/home/mode-sidebar.svelte'
  import BattlePanel from '$lib/components/home/battle-panel.svelte'
  import ConferencePanel from '$lib/components/home/conference-panel.svelte'
  import { currentRoute } from '$lib/router.svelte'
  import BattlePage from '../battle/[battle_id]/index.svelte'
  import ConferencePage from '../conference/[conference_id]/index.svelte'
  import ConferenceRollCallPage from '../conference/[conference_id]/roll-call.svelte'
  import ConferenceMotionPage from '../conference/[conference_id]/motion.svelte'
  import ConferenceQuestionPage from '../conference/[conference_id]/question.svelte'
  import ConferenceDelegationsPage from '../conference/[conference_id]/delegations.svelte'
  import ConferenceSeatsPage from '../conference/[conference_id]/seats.svelte'
  import ConferenceDisplayPage from '../conference-display/[conference_id]/index.svelte'
  import DelegatePage from '../delegate/[conference_id]/index.svelte'
  import ToolPage from '../tools/[tool_id]/index.svelte'
  import TimelinePanel from '$lib/components/tools/timeline-panel.svelte'

  let selectedMode = $state<string | null>(null)

  const routeId = $derived(currentRoute?.routeId ?? '/')

  // 从主进程文件系统恢复用户已安装的插件到运行时 ModRegistry
  if (typeof window !== 'undefined') {
    Promise.all([
      dbGetAllPlugins().then((plugins) => {
        for (const plugin of plugins) {
          injectToRegistry(plugin)
        }
        markPluginsReady()
      }),
      // 从文件加载应用数据，同步到 localStorage
      import('$lib/stores/conference/conference-store').then((m) => m.conferencesReady),
      import('$lib/stores/battle/battle-store').then((m) => m.battlesReady),
      import('$lib/stores/timeline-store').then((m) => m.timelinesReady)
    ])
  }
</script>

<svelte:head>
  <title>{VETO_NAME}</title>
  <meta name="title" content={VETO_NAME} />
  <link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

{#if routeId !== '/conference-display/[conference_id]'}
  <TitleBar />
{/if}
<ModeWatcher />
<MyAlertDialog />
<SettingsDialog />
<TimerDialog bind:open={$timerDialogOpen} />

<div class={routeId === '/conference-display/[conference_id]' ? '' : 'pt-9'}>
  {#if routeId === '/battle/[battle_id]'}
    <BattlePage />
  {:else if routeId === '/conference/[conference_id]/roll-call'}
    <ConferenceRollCallPage />
  {:else if routeId === '/conference/[conference_id]/motion'}
    <ConferenceMotionPage />
  {:else if routeId === '/conference/[conference_id]/question'}
    <ConferenceQuestionPage />
  {:else if routeId === '/conference/[conference_id]/delegations'}
    <ConferenceDelegationsPage />
  {:else if routeId === '/conference/[conference_id]/seats'}
    <ConferenceSeatsPage />
  {:else if routeId === '/conference/[conference_id]'}
    <ConferencePage />
  {:else if routeId === '/conference-display/[conference_id]'}
    <ConferenceDisplayPage />
  {:else if routeId === '/delegate/[conference_id]'}
    <DelegatePage />
  {:else if routeId === '/tools/[tool_id]'}
    <ToolPage />
  {:else}
    <div class="flex h-[calc(100vh-2.25rem)] w-screen overflow-hidden">
      <ModeSidebar {selectedMode} onSelectMode={(mode) => (selectedMode = mode)} />
      {#if selectedMode === 'crisis'}
        <BattlePanel mode={selectedMode} class="m-2" />
      {:else if selectedMode === 'conference'}
        <ConferencePanel class="m-2" />
      {:else if selectedMode === 'tools'}
        <TimelinePanel />
      {:else}
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-3 text-muted-foreground">
            <Swords size={48} class="opacity-30" />
            <p class="text-lg font-medium">请从左侧选择一个模式</p>
            <p class="text-sm opacity-70">选择推演模式以查看和管理战局</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
<style>
  * {
    margin: 0;
  }
</style>
