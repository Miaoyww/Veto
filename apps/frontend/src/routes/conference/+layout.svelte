<script lang="ts">
  import { onNavigate } from '$app/navigation'
  import { onMount, tick } from 'svelte'
  import '$units' // 初始化 ModRegistry 基础数据
  import handoffLogo from '$lib/assets/favicon.png'
  import TimerDialog from '$lib/components/conference/timer/timer-dialog.svelte'
  import { timerDialogOpen } from '$lib/classes/stores/conference/timer-store'
  import { dbGetAllPlugins } from '$lib/classes/services/plugin/plugin-db'
  import { injectToRegistry } from '$lib/classes/services/plugin/plugin-registry'
  import { markPluginsReady } from '$lib/classes/services/plugin/mod-registry.svelte'
  import { Button } from '$lib/components/ui/button'
  import {
    ArrowLeft,
    FileText,
    Globe,
    House,
    Monitor,
    Newspaper,
    Plus,
    Puzzle,
    Radio,
    Users
  } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import BrandSwitcher from '$lib/components/app-sidebar/brand-switcher.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar'

  import { navigateToConference, navigateToCommittee } from '$lib/utils'
  import { conferences } from '$lib/classes/stores/conference/conference-store'
  import {
    activeSettingsSection,
    settingsDialogOpen
  } from '$lib/classes/stores/app/global-ui-store'
  import { isElectron } from '$lib/classes/utils/runtime'

  let { children } = $props()
  let conferenceHandoffActive = $state(false)
  let conferenceHandoffPhase = $state<'covering' | 'drawing' | 'revealing'>('covering')

  const wait = (duration: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, duration))

  function isCreateToConference(fromPath: string | undefined, toPath: string | undefined): boolean {
    return Boolean(
      fromPath?.startsWith('/conference/create') &&
      toPath?.startsWith('/conference/') &&
      !toPath.startsWith('/conference/create')
    )
  }

  onNavigate((navigation) => {
    const fromPath = navigation.from?.url.pathname
    const toPath = navigation.to?.url.pathname
    console.log('onNavigate', { fromPath, toPath })
    if (isCreateToConference(fromPath, toPath)) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const coverDuration = reducedMotion ? 120 : 560
      const drawDuration = reducedMotion ? 120 : 900
      const revealDuration = reducedMotion ? 120 : 560

      conferenceHandoffActive = true
      conferenceHandoffPhase = 'covering'

      // Keep the destination hidden while the logo interstitial completes. The
      // navigation is released only after the logo has finished drawing.
      return new Promise<void>((resolve) => {
        void (async () => {
          await tick()
          await wait(coverDuration)
          conferenceHandoffPhase = 'drawing'
          await tick()
          await wait(drawDuration)

          resolve()
          try {
            await navigation.complete
          } catch {
            // A cancelled navigation still needs to release the overlay.
          }

          conferenceHandoffPhase = 'revealing'
          await tick()
          await wait(revealDuration)
          conferenceHandoffActive = false
        })()
      })
    }

    const isCreateHandoff =
      (fromPath === '/empty' ||
        fromPath === '/conference' ||
        (fromPath?.startsWith('/conference/') && !fromPath.startsWith('/conference/create'))) &&
      (toPath === '/conference/create' || toPath?.startsWith('/conference/create/'))

    if (!isCreateHandoff || typeof document.startViewTransition !== 'function') return

    const root = document.documentElement
    root.dataset.vetoRouteTransition = 'create'

    const clearTransitionState = () => {
      delete root.dataset.vetoRouteTransition
    }

    return new Promise<void>((resolve) => {
      const transition = document.startViewTransition(async () => {
        // Resolve before waiting for SvelteKit so the navigation can update the DOM.
        resolve()
        await navigation.complete
      })

      transition.finished.then(clearTransitionState, clearTransitionState)
    })
  })

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
      import('$lib/classes/stores/battle/battle-store').then((m) => m.battlesReady),
      import('$lib/classes/stores/timeline-store').then((m) => m.timelinesReady)
    ])
  }

  let displayOnlyDialogOpen = $state(false)
  let electronEnvironment = $state(false)

  onMount(() => {
    electronEnvironment = isElectron()
  })

  const recentConferences = $derived([...$conferences].reverse().slice(0, 5))
  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const inCommittee = $derived($page.url.pathname.includes('/committee/'))
  const activeConference = $derived(
    $conferences.find((conference) => conference.id === conferenceId) ?? null
  )
  const activeCommittee = $derived(
    activeConference?.committees.find((committee) => committee.id === committeeId) ?? null
  )

  function goTo(path: string): void {
    // @ts-expect-error resolve requires a literal route type for dynamic paths.
    goto(resolve(path))
  }

  function openModsSettings(): void {
    activeSettingsSection.set('mods')
    settingsDialogOpen.set(true)
  }
</script>

<TimerDialog bind:open={$timerDialogOpen} />

{#if conferenceHandoffActive}
  <div class="conference-handoff" data-phase={conferenceHandoffPhase} aria-hidden="true">
    <img class="conference-handoff__logo" src={handoffLogo} alt="" />
  </div>
{/if}

<div>
  <GlobalSidebar>
    {#snippet sidebar()}
      <Sidebar.Header>
        <BrandSwitcher />
      </Sidebar.Header>

      <Sidebar.Content>
        {#if inCommittee && activeConference && activeCommittee}
          <Sidebar.Menu class="p-3">
            <Sidebar.MenuItem>
              <Sidebar.MenuButton onclick={() => navigateToConference(activeConference.id)}>
                <ArrowLeft />
                <span>返回大会</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname ===
                  `/conference/${conferenceId}/committee/${committeeId}`}
                onclick={() => navigateToCommittee(activeConference.id, activeCommittee.id)}
              >
                <Users />
                <span>委员会概览</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.Separator class="my-1" />

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname.includes('/directives')}
                onclick={() =>
                  goTo(`/conference/${conferenceId}/committee/${committeeId}/directives`)}
              >
                <Radio />
                <span>指令</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname.includes('/news')}
                onclick={() => goTo(`/conference/${conferenceId}/committee/${committeeId}/news`)}
              >
                <Newspaper />
                <span>新闻</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname.includes('/situation')}
                onclick={() =>
                  goTo(`/conference/${conferenceId}/committee/${committeeId}/situation`)}
              >
                <Globe />
                <span>局势</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname.includes('/files')}
                onclick={() => goTo(`/conference/${conferenceId}/committee/${committeeId}/files`)}
              >
                <FileText />
                <span>文件</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        {:else}
          <Sidebar.Menu class="p-3">
            <Sidebar.MenuItem>
              <Sidebar.MenuButton onclick={() => goTo('/conference')}>
                <House />
                <span>首页</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton onclick={() => goTo('/conference/create')}>
                <Plus />
                <span>创建大会</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.Separator class="my-1" />

            {#each recentConferences as conference (conference.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton onclick={() => navigateToConference(conference.id)}>
                  <Globe />
                  <span>{conference.name}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}

            {#if recentConferences.length === 0}
              <div
                class="px-2 py-3 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
              >
                暂无最近大会
              </div>
            {/if}
          </Sidebar.Menu>
        {/if}
      </Sidebar.Content>
    {/snippet}

    {#snippet toolbar()}
      <Sidebar.Trigger class="-ms-1" />
      <div class="drag-region h-full flex-1"></div>

      <Button
        variant="ghost"
        size="sm"
        class="no-drag px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onclick={() => (displayOnlyDialogOpen = true)}
        title="显示窗口"
      >
        <Monitor />
      </Button>

      {#if electronEnvironment}
        <Button
          variant="ghost"
          size="sm"
          class="no-drag px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={openModsSettings}
          title="插件"
        >
          <Puzzle />
        </Button>
      {/if}
    {/snippet}

    {@render children()}
  </GlobalSidebar>

  <DisplayOnlyDialog bind:open={displayOnlyDialogOpen} />
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
        {:else if routeId === '/conference/[conference_id]/seats'}
          <ConferenceSeatsPage />
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

  .drag-region {
    -webkit-app-region: drag;
  }
</style>
