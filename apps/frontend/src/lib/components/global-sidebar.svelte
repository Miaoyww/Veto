<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte'
  import { fade } from 'svelte/transition'
  import {
    ArrowLeft,
    CalendarRange,
    Files,
    Globe,
    House,
    Monitor,
    Newspaper,
    Plus,
    Puzzle,
    Send,
    Swords,
    UserPlus,
    UserRoundCheck,
    Wrench
  } from '@lucide/svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Button } from '$lib/components/ui/button'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { resolve } from '$app/paths'
  import { conferences, currentCommittee } from '$lib/classes/stores/conference/conference-store'
  import { navigateToCommittee, navigateToConference } from '$lib/classes/utils'
  import BrandSwitcher from './app-sidebar/brand-switcher.svelte'
  import WindowControls from './app-sidebar/window-controls.svelte'
  import DynamicIsland from './dynamic-island.svelte'
  import { cn } from '$lib/classes/utils.js'
  import JoinConferenceDialog from './home/join-conference-dialog.svelte'
  import DisplayOnlyDialog from './conference/display-only-dialog.svelte'
  import { isParticipantSeat } from '$lib/classes/types/delegate'

  type SidebarMode = 'root' | 'unauthenticated' | 'home' | 'conference' | 'committee'
  type Icon = typeof House
  type NavItem = { title: string; icon: Icon; url: string }

  let {
    className = '',
    collapsible = 'icon',
    children,
    // 接入全局 auth store 后，由父级传入真实值；当前桌面端默认为已登录。
    isAuthenticated = true,
    ...restProps
  }: {
    className?: string
    children: Snippet
    collapsible?: 'offcanvas' | 'icon' | 'none'
    isAuthenticated?: boolean
  } & Omit<ComponentProps<typeof Sidebar.Root>, 'children' | 'class'> = $props()

  const routePath = $derived($page.url.pathname ?? '/')
  const conferenceId = $derived($page.params.conference_id ?? null)
  const committeeId = $derived($page.params.committee_id ?? null)
  const currentConference = $derived(
    conferenceId
      ? ($conferences.find((conference) => conference.id === conferenceId) ?? null)
      : null
  )
  const recentConfs = $derived([...$conferences].reverse().slice(0, 5))

  const sidebarMode = $derived<SidebarMode>(
    routePath === '/'
      ? 'root'
      : !isAuthenticated
        ? 'unauthenticated'
        : !conferenceId
          ? 'home'
          : committeeId
            ? 'committee'
            : 'conference'
  )

  const conferencePrefix = $derived(conferenceId ? `/conference/${conferenceId}` : '/conference')
  const committeePrefix = $derived(
    conferenceId && committeeId
      ? `/conference/${conferenceId}/committee/${committeeId}`
      : conferencePrefix
  )
  const isStandaloneRoute = $derived(
    routePath === '/connect' ||
      routePath.startsWith('/conference-display/') ||
      routePath.startsWith('/delegate/')
  )

  const committeeItems = $derived<NavItem[]>(
    conferenceId && committeeId
      ? [
          { title: '议程', icon: CalendarRange, url: committeePrefix },
          { title: '指令', icon: Send, url: `${committeePrefix}/directives` },
          { title: '新闻', icon: Newspaper, url: `${committeePrefix}/news` },
          { title: '局势', icon: Globe, url: `${committeePrefix}/situation` },
          { title: '文件', icon: Files, url: `${committeePrefix}/files` },
          { title: '工具', icon: Wrench, url: `${committeePrefix}/tools` },
          { title: '军事推演', icon: Swords, url: `${conferencePrefix}/battle` },
          { title: '席位管理', icon: UserRoundCheck, url: `${committeePrefix}/seats` },
          { title: '参会席位', icon: UserPlus, url: `${committeePrefix}/participants` }
        ]
      : []
  )

  const conf = $derived(sidebarMode === 'committee' ? $currentCommittee : null)
  const presentCount = $derived(
    conf?.seats.filter(isParticipantSeat).filter((seat) => seat.procedure.attendance === 'present')
      .length ?? 0
  )
  const votingCount = $derived(
    conf?.seats
      .filter(isParticipantSeat)
      .filter((seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights)
      .length ?? 0
  )
  const simpleMajority = $derived(Math.floor(votingCount / 2) + 1)
  const twoThirds = $derived(Math.ceil((votingCount * 2) / 3))

  let displayOnlyDialogOpen = $state(false)
  let joinBattleDialogOpen = $state(false)

  function toHref(path: string): string {
    // @ts-expect-error resolve 要求字面量路由类型，这里接受动态路由
    return resolve(path)
  }

  function goTo(path: string): void {
    goto(toHref(path))
  }

  function isActive(path: string): boolean {
    return routePath === path
  }
</script>

{#if !isStandaloneRoute && sidebarMode !== 'root'}
  <Sidebar.Provider>
    <Sidebar.Root variant="inset" class={className} {collapsible} {...restProps}>
      <Sidebar.Header>
        <BrandSwitcher hasConf={conferenceId != null} confPrefix={committeePrefix} />
      </Sidebar.Header>

      <Sidebar.Content>
        {#key sidebarMode}
          <div transition:fade={{ duration: 120 }}>
            <Sidebar.Menu class="p-3">
              {#if sidebarMode === 'unauthenticated'}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton aria-disabled="true">
                    <House />
                    <span>请先登录</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {:else if sidebarMode === 'home'}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton isActive={isActive('/')} onclick={() => goTo('/conference')}>
                    <House />
                    <span>首页</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem>
                  <Sidebar.MenuButton onclick={() => (joinBattleDialogOpen = true)}>
                    <UserPlus />
                    <span>加入大会</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem>
                  <Sidebar.MenuButton onclick={() => goTo('/conference/create')}>
                    <Plus />
                    <span>创建大会</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.Separator class="my-1" />

                {#each recentConfs as recentConference (recentConference.id)}
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton onclick={() => navigateToConference(recentConference.id)}>
                      <Globe />
                      <span>{recentConference.name}</span>
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                {/each}

                {#if recentConfs.length === 0}
                  <div
                    class="px-2 py-3 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
                  >
                    暂无最近大会
                  </div>
                {/if}
              {:else if sidebarMode === 'conference'}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    {#snippet child({ props })}
                      <a href={toHref('/')} {...props}>
                        <House />
                        <span>首页</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem>
                  <Sidebar.MenuButton isActive={isActive(conferencePrefix)}>
                    {#snippet child({ props })}
                      <a href={toHref(conferencePrefix)} {...props}>
                        <Globe />
                        <span>大会概览</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.Separator class="my-1" />
                {#each currentConference?.committees ?? [] as committee (committee.id)}
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      onclick={() => navigateToCommittee(conferenceId!, committee.id)}
                    >
                      <CalendarRange />
                      <span>{committee.name}</span>
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                {/each}
              {:else}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    {#snippet child({ props })}
                      <a href={toHref(conferencePrefix)} {...props}>
                        <Globe />
                        <span>大会概览</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>

                <Sidebar.Separator class="my-1" />
                {#each committeeItems as item (item.url)}
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton isActive={isActive(item.url)}>
                      {#snippet child({ props })}
                        <a href={toHref(item.url)} {...props}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      {/snippet}
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                {/each}

                <Sidebar.Separator class="my-1" />
                <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div class="flex shrink-0 items-start gap-1.5 px-5 pb-2">
                    <span class="text-[10px] text-muted-foreground/60">
                      {presentCount}/{conf?.participantSeats.length ?? 0} 出席，{votingCount} 可投票
                    </span>
                  </div>

                  <div class="px-3 pb-3">
                    {#each conf?.participantSeats ?? [] as seat (seat.id)}
                      {@const isPresent = seat.procedure.attendance === 'present'}
                      {@const isObserver = isPresent && !seat.procedure.hasVotingRights}
                      {@const isVoter = isPresent && !isObserver}
                      <div
                        class={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                          isPresent ? '' : 'opacity-50'
                        )}
                      >
                        <span class="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {seat.name}
                        </span>
                        <span class="shrink-0 text-[10px]">
                          {#if isVoter}
                            <span class="text-emerald-500">●</span>
                          {:else if isObserver}
                            <span class="text-blue-500">●</span>
                          {:else}
                            <span class="text-muted-foreground/40">○</span>
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </Sidebar.Menu>
          </div>
        {/key}
      </Sidebar.Content>

      <Sidebar.Rail />
    </Sidebar.Root>

    <Sidebar.Inset>
      <header class="flex h-9 shrink-0 items-center gap-2 pl-4">
        {#if sidebarMode === 'committee'}
          <Button variant="ghost" size="icon" onclick={() => goTo('/')}>
            <ArrowLeft />
          </Button>
        {/if}
        <Sidebar.Trigger class="-ms-1" />

        {#if sidebarMode === 'committee'}
          <Separator orientation="vertical" class="me-2 h-4" />
          <div class="pb-3">
            <div class="mt-1.5 grid grid-cols-2 gap-2">
              <div class="px-2.5 py-1.5">
                <div class="text-[10px] text-muted-foreground">简单多数</div>
                <div class="text-sm font-bold text-foreground">{simpleMajority}</div>
              </div>
              <div class="px-2.5 py-1.5">
                <div class="text-[10px] text-muted-foreground">2/3 多数</div>
                <div class="text-sm font-bold text-foreground">{twoThirds}</div>
              </div>
            </div>
          </div>
        {/if}

        <div class="drag-region flex h-full flex-1">
          {#if sidebarMode === 'committee'}
            <DynamicIsland />
          {/if}
        </div>

        <Button
          variant="ghost"
          size="sm"
          class="no-drag px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={() => (displayOnlyDialogOpen = true)}
          title="显示窗口"
        >
          <Monitor />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="no-drag px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={() => goTo('/tools')}
          title="插件"
        >
          <Puzzle />
        </Button>

        <WindowControls />
      </header>

      <div class="flex flex-1 flex-col">
        {@render children()}
      </div>
    </Sidebar.Inset>
  </Sidebar.Provider>
{:else}
  {@render children()}
{/if}

<DisplayOnlyDialog bind:open={displayOnlyDialogOpen} />
<JoinConferenceDialog bind:open={joinBattleDialogOpen} />

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
</style>
