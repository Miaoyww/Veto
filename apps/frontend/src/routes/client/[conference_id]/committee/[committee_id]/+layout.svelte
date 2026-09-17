<script lang="ts">
  import {
    ArrowLeft,
    Globe,
    House,
    Monitor,
    Plus,
    Puzzle,
    UserRoundCheck,
    Users
  } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import BrandSwitcher from '$lib/components/app-sidebar/brand-switcher.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { conferences, currentCommittee } from '$lib/classes/stores/conference/conference-store'
  import { cn, navigateToConference } from '$lib/classes/utils'
  import { ScrollArea } from '$lib/components/ui/scroll-area'

  let { children } = $props()
  let displayOnlyDialogOpen = $state(false)

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
  const presentCount = $derived(
    participantSeats.filter((seat) => seat.procedure.attendance === 'present').length
  )
  const votingCount = $derived(
    participantSeats.filter(
      (seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights
    ).length
  )
  const simpleMajority = $derived(activeCommittee?.getSimpleMajorityThreshold() ?? 0)
  const twoThirds = $derived(activeCommittee?.getTwoThirdsThreshold() ?? 0)
  function goTo(path: string): void {
    // @ts-expect-error resolve requires a literal route type for dynamic paths.
    goto(resolve(path))
  }
</script>

<GlobalSidebar>
  {#snippet sidebar()}
    <Sidebar.Header>
      <BrandSwitcher />
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

          <!-- 表决信息 -->
          <div class="px-5 pb-3">
            <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>表决信息</span>
            </div>
            <div class="mt-1.5 grid grid-cols-2 gap-2">
              <div class="rounded-md bg-muted px-2.5 py-1.5">
                <div class="text-[10px] text-muted-foreground">简单多数</div>
                <div class="text-sm font-bold text-foreground">{simpleMajority}</div>
              </div>
              <div class="rounded-md bg-muted px-2.5 py-1.5">
                <div class="text-[10px] text-muted-foreground">2/3 多数</div>
                <div class="text-sm font-bold text-foreground">{twoThirds}</div>
              </div>
            </div>
          </div>

          <!-- 代表团列表 -->
          <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
            <div class="flex shrink-0 items-start gap-1.5 px-5 pb-2">
              <Users size={12} class="text-muted-foreground shrink-0 mt-0.5" />
              <div class="flex flex-col min-w-0">
                <span class="text-[11px] font-medium text-muted-foreground">代表团</span>
                <span class="text-[10px] text-muted-foreground/60">
                  {presentCount}/{participantSeats.length}
                </span>
              </div>
              <div class="flex-1"></div>
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
                <UserRoundCheck size={10} />
                代表管理
              </Button>
            </div>

            <ScrollArea class="flex-1 min-h-0">
              <div class="px-3 pb-3">
                {#each participantSeats as delegation (delegation.id)}
                  {@const isPresent = delegation.procedure.attendance === 'present'}
                  {@const isObserver = isPresent && !delegation.procedure.hasVotingRights}
                  {@const isVoter = isPresent && !isObserver}
                  <div
                    class={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                      isPresent ? '' : 'opacity-50'
                    )}
                  >
                    <!-- 名称 -->
                    <span class="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {delegation.name}
                    </span>
                    <!-- 出席状态 icon -->
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
            </ScrollArea>
          </div>
        </Sidebar.Menu>
      {:else}
        <Sidebar.Menu class="p-3">
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={$page.url.pathname === '/conference'}
              onclick={() => goTo('/conference')}
            >
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

    <Button
      variant="ghost"
      size="sm"
      class="no-drag px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={() => goTo('/tools')}
      title="插件"
    >
      <Puzzle />
    </Button>
  {/snippet}

  {@render children()}
</GlobalSidebar>

<DisplayOnlyDialog bind:open={displayOnlyDialogOpen} />

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
</style>
