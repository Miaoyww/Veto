<script lang="ts">
  import '../app.css'
  import '../css/components.css'
  import '$units' // 初始化 ModRegistry 基础数据
  import { ModeWatcher } from 'mode-watcher'
  import { VETO_NAME } from '$lib/classes/const'
  import logo from '$lib/assets/logo.svg'
  import SettingsDialog from '$lib/components/settings/settings-dialog.svelte'
  import TimerDialog from '$lib/components/conference/timer/timer-dialog.svelte'
  import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { timerDialogOpen } from '$lib/classes/stores/conference/timer-store'
  import { dbGetAllPlugins } from '$lib/classes/services/plugin-db'
  import { injectToRegistry } from '$lib/classes/services/plugin-registry'
  import { markPluginsReady } from '$lib/classes/registry/mod-registry.svelte'

  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { authStore } from '$lib/classes/stores/auth-store'

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
      import('$lib/classes/stores/conference/conference-store').then((m) => m.conferencesReady),
      import('$lib/classes/stores/conference/conference-event-store').then(
        (m) => m.conferenceEventsReady
      ),
      import('$lib/classes/stores/battle/battle-store').then((m) => m.battlesReady),
      import('$lib/classes/stores/timeline-store').then((m) => m.timelinesReady)
    ])
  }

  const isPublicRoute = $derived(
    $page.url.pathname === '/login' ||
      $page.url.pathname.startsWith('/conference-display/') ||
      $page.url.pathname.startsWith('/delegate/')
  )

  // 认证守卫：未登录则跳转到登录页（等 bootstrap 完成后才生效）
  $effect(() => {
    // 跳过服务端渲染
    if (typeof window === 'undefined') return

    let initialized = false

    // 监听状态变化（登录/登出时触发）
    const unsub = authStore.subscribe((state) => {
      if (!initialized) return
      if (!state.isLoggedIn && !isPublicRoute) {
        goto(resolve('/login'))
      }
    })

    authStore.ready.then(() => {
      initialized = true

      // 启动后从持久化存储恢复了登录态 → 拉取最新用户数据
      if (authStore.isLoggedIn() && authStore.getToken()) {
        authStore.refreshUser()
      }

      // 主动检查一次：bootstrap 完成时若仍未登录，跳转
      if (!authStore.isLoggedIn() && !isPublicRoute) {
        goto(resolve('/login'))
      }
    })

    return unsub
  })
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
