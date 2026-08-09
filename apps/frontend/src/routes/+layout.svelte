<script lang="ts">
  import '../app.css'
  import '../css/components.css'
  import '$units' // 初始化 ModRegistry 基础数据
  import { ModeWatcher } from 'mode-watcher'
  import { VETO_NAME } from '$lib/const'
  import logo from '$lib/assets/logo.svg'
  import SettingsDialog from '$lib/components/settings/settings-dialog.svelte'
  import TimerDialog from '$lib/components/conference/timer/timer-dialog.svelte'
  import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { timerDialogOpen } from '$lib/stores/conference/timer-store'
  import { dbGetAllPlugins } from '$lib/services/plugin-db'
  import { injectToRegistry } from '$lib/services/plugin-registry'
  import { markPluginsReady } from '$lib/registry/mod-registry.svelte'

  import { page } from '$app/stores'

  let { children } = $props()

  // 从主进程文件系统恢复用户已安装的插件 + 加载应用数据
  if (typeof window !== 'undefined') {
    Promise.all([
      dbGetAllPlugins().then((plugins) => {
        for (const plugin of plugins) {
          injectToRegistry(plugin)
        }
        markPluginsReady()
      }),
      import('$lib/stores/conference/conference-store').then((m) => m.conferencesReady),
      import('$lib/stores/battle/battle-store').then((m) => m.battlesReady),
      import('$lib/stores/timeline-store').then((m) => m.timelinesReady)
    ])
  }

  const isLoginPage = $derived($page.url.pathname === '/login')
</script>

<svelte:head>
  <title>{VETO_NAME}</title>
  <meta name="title" content={VETO_NAME} />
  <link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

<ModeWatcher />
<MyAlertDialog />
<SettingsDialog />
<TimerDialog bind:open={$timerDialogOpen} />

<div>
  <GlobalSidebar>
    {@render children?.()}
  </GlobalSidebar>
</div>

<!-- 投屏页：独立渲染，无 Sidebar 无 TitleBar -->
<!-- {#if routeId === '/conference-display/[conference_id]'}
  <ConferenceDisplayPage />
{:else}
  <div>
    <Sidebar.Provider>
      <Sidebar.Inset>
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
        {:else if routeId === '/delegate/[conference_id]'}
          <DelegatePage />
        {:else if routeId === '/tools/[tool_id]'}
          <ToolPage />
        {:else}{/if}
      </Sidebar.Inset>
    </Sidebar.Provider>
  </div>
{/if} -->

<style>
  * {
    margin: 0;
  }
</style>
