<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Activity,
    ArrowLeft,
    FolderOpen,
    Globe,
    House,
    Monitor,
    Newspaper,
    Plus,
    Puzzle,
    ScrollText,
    UserRoundCheck
  } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import BrandSwitcher from '$lib/components/app-sidebar/brand-switcher.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { conferences } from '$lib/classes/stores/conference/conference-store'
  import { cn, navigateToConference } from '$lib/classes/utils'
  import { cloudSession } from '$lib/classes/stores/cloud/cloud-session-store.svelte'
  import type { CloudChairSeat } from '$lib/classes/clients/cloud-join-client'

  type CloudSeat = CloudChairSeat
  type SidebarRosterEntry = {
    id: string
    name: string
    isPresent: boolean
    isVoter: boolean
    isObserver: boolean
  }
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import {
    activeSettingsSection,
    settingsDialogOpen
  } from '$lib/classes/stores/app/global-ui-store'
  import { isElectron } from '$lib/classes/utils/runtime'

  let { children } = $props()
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
  const participantSeats = $derived(activeCommittee?.participantSeats ?? [])
  const simpleMajority = $derived(activeCommittee?.getSimpleMajorityThreshold() ?? 0)
  const twoThirds = $derived(activeCommittee?.getTwoThirdsThreshold() ?? 0)
  const committeeRoute = $derived(`/client/${conferenceId}/committee/${committeeId}`)
  const cloudIdentity = $derived(
    cloudSession.session?.result.conferenceId === conferenceId &&
      cloudSession.session?.result.identity.committeeId === committeeId
      ? cloudSession.session.result.identity
      : null
  )
  const isCloudSession = $derived(cloudIdentity !== null)
  const canControlConference = $derived(
    !isCloudSession || cloudSession.hasCapability('control_conference')
  )
  const canViewDirectives = $derived(
    !isCloudSession || cloudSession.hasCapability('submit_directive', 'process_directive')
  )
  const canViewFiles = $derived(
    !isCloudSession || cloudSession.hasCapability('view_files', 'send_files', 'withdraw_files')
  )
  const canViewSituation = $derived(
    !isCloudSession ||
      cloudSession.hasCapability('view_situation', 'publish_situation', 'withdraw_situation')
  )
  const canViewNews = $derived(
    !isCloudSession ||
      cloudSession.hasCapability('view_news', 'draft_news', 'review_news', 'withdraw_news')
  )
  const cloudProjection = $derived(
    cloudSession.chairProjection?.conference.id === conferenceId &&
      cloudSession.chairProjection?.committee.id === committeeId
      ? cloudSession.chairProjection
      : null
  )
  const cloudChairSeats = $derived(
    cloudProjection?.committee.id === committeeId ? cloudProjection.seats : ([] as CloudSeat[])
  )
  const localRoster = $derived(
    participantSeats.map((seat) => ({
      id: seat.id,
      name: seat.shortName || seat.name,
      isPresent: seat.procedure.attendance === 'present',
      isVoter: seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights,
      isObserver: seat.procedure.attendance === 'present' && !seat.procedure.hasVotingRights
    }))
  )
  const cloudRoster = $derived(
    cloudChairSeats.map((seat) => ({
      id: seat.id,
      name: seat.shortName || seat.name,
      isPresent: seat.user !== null,
      isVoter: seat.hasVotingRights && seat.user !== null,
      isObserver: !seat.hasVotingRights && seat.user !== null
    }))
  )
  const rosterEntries = $derived(
    (isCloudSession ? cloudRoster : localRoster).filter(
      (entry) => entry.id !== cloudProjection?.chairSeat.id
    )
  )
  const displayConferenceName = $derived(
    cloudIdentity
      ? (cloudProjection?.conference.name ?? activeConference?.name)
      : activeConference?.name
  )
  const displayCommitteeName = $derived(
    cloudIdentity
      ? (cloudProjection?.committee.name ?? activeCommittee?.name)
      : activeCommittee?.name
  )

  $effect(() => {
    void cloudSession.ensureChairProjection(conferenceId, committeeId)
  })

  function goTo(path: string): void {
    // @ts-expect-error resolve requires a literal route type for dynamic paths.
    goto(resolve(path))
  }

  function openModsSettings(): void {
    activeSettingsSection.set('mods')
    settingsDialogOpen.set(true)
  }
</script>

<GlobalSidebar>
  {#snippet sidebar()}
    <Sidebar.Header>
      <BrandSwitcher conferenceName={displayConferenceName} committeeName={displayCommitteeName} />
    </Sidebar.Header>

    <Sidebar.Content>
      {#if inCommittee && activeConference && activeCommittee}
        <Sidebar.Menu class="p-3">
          <Sidebar.MenuItem>
            <Sidebar.MenuButton onclick={() => goto(resolve('/conference'))}>
              <ArrowLeft />
              <span>返回首页</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.Separator class="my-1" />

          {#if canViewDirectives || canViewFiles || canViewSituation || canViewNews}
            <Sidebar.Separator class="my-1" />
            <Sidebar.MenuItem>
              {#if canViewDirectives}
                <Sidebar.MenuButton
                  isActive={$page.url.pathname === `${committeeRoute}/directives`}
                  onclick={() => goTo(`${committeeRoute}/directives`)}
                >
                  <ScrollText />
                  <span>指令</span>
                </Sidebar.MenuButton>
              {/if}
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              {#if canViewFiles}
                <Sidebar.MenuButton
                  isActive={$page.url.pathname === `${committeeRoute}/files`}
                  onclick={() => goTo(`${committeeRoute}/files`)}
                >
                  <FolderOpen />
                  <span>文件</span>
                </Sidebar.MenuButton>
              {/if}
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              {#if canViewSituation}
                <Sidebar.MenuButton
                  isActive={$page.url.pathname === `${committeeRoute}/situation`}
                  onclick={() => goTo(`${committeeRoute}/situation`)}
                >
                  <Activity />
                  <span>局势</span>
                </Sidebar.MenuButton>
              {/if}
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              {#if canViewNews}
                <Sidebar.MenuButton
                  isActive={$page.url.pathname === `${committeeRoute}/news`}
                  onclick={() => goTo(`${committeeRoute}/news`)}
                >
                  <Newspaper />
                  <span>新闻</span>
                </Sidebar.MenuButton>
              {/if}
            </Sidebar.MenuItem>
          {/if}

          {#if canControlConference}
            <!-- 代表团列表 -->
            <div class="flex flex-1 flex-col">
              {#if !isCloudSession}
                <div class="flex shrink-0 justify-end px-5 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1 text-[10px]"
                    onclick={() =>
                      goto(
                        resolve(
                          `/client/${activeConference.id}/committee/${activeCommittee.id}/participants`
                        )
                      )}
                  >
                    <UserRoundCheck />
                    代表管理
                  </Button>
                </div>
              {/if}

              {#if cloudSession.chairError}
                <p class="px-5 pb-3 text-xs text-destructive">{cloudSession.chairError}</p>
              {:else if cloudSession.loadingChairProjection}
                <p class="px-5 pb-3 text-xs text-muted-foreground">正在加载席位信息...</p>
              {:else}
                <ScrollArea class="flex-1 overflow-hidden">
                  <div class="px-3 pb-3">
                    {#each rosterEntries as delegation (delegation.id)}
                      <div
                        class={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                          delegation.isPresent ? '' : 'opacity-50'
                        )}
                      >
                        <span class="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {delegation.name}
                        </span>
                        <span class="shrink-0 text-[10px]">
                          {#if delegation.isVoter}
                            <span class="text-emerald-500">●</span>
                          {:else if delegation.isObserver}
                            <span class="text-blue-500">●</span>
                          {:else}
                            <span class="text-muted-foreground/40">○</span>
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                </ScrollArea>
              {/if}
            </div>
          {/if}
        </Sidebar.Menu>
      {:else}
        <Sidebar.Menu class="p-3">
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={$page.url.pathname === '/'} onclick={() => goTo('/')}>
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

    <div class="flex min-w-0 flex-1 items-center gap-6">
      {#if cloudIdentity}
        <div class="flex min-w-0 flex-col leading-tight">
          <span class="truncate text-xs font-medium">{cloudIdentity.displayName}</span>
          <span class="truncate text-[10px] text-muted-foreground">
            {cloudIdentity.roleName}
          </span>
        </div>
      {/if}

      {#if canControlConference}
        <div class="hidden items-center gap-6 sm:flex">
          <div class="flex flex-col leading-tight">
            <span class="text-[10px] text-muted-foreground">简单多数</span>
            <span class="text-xs font-semibold">{simpleMajority}</span>
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[10px] text-muted-foreground">2/3 多数</span>
            <span class="text-xs font-semibold">{twoThirds}</span>
          </div>
        </div>
      {/if}
    </div>

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

    {#if electronEnvironment && (!isCloudSession || canControlConference)}
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

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
</style>
