<script lang="ts">
  import { ArrowLeft, FileText, Globe, House, Monitor, Newspaper, Plus, Puzzle, Radio, Users } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import BrandSwitcher from '$lib/components/app-sidebar/brand-switcher.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { conferences } from '$lib/classes/stores/conference/conference-store'
  import { navigateToCommittee, navigateToConference } from '$lib/classes/utils'

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
            <Sidebar.MenuButton onclick={() => navigateToConference(activeConference.id)}>
              <ArrowLeft />
              <span>返回大会</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={$page.url.pathname === `/conference/${conferenceId}/committee/${committeeId}`}
              onclick={() => navigateToCommittee(activeConference.id, activeCommittee.id)}
            >
              <Users />
              <span>席位管理</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.Separator class="my-1" />

          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={$page.url.pathname.includes('/directives')}
              onclick={() => goTo(`/conference/${conferenceId}/committee/${committeeId}/directives`)}
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
              onclick={() => goTo(`/conference/${conferenceId}/committee/${committeeId}/situation`)}
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
            <Sidebar.MenuButton isActive={$page.url.pathname === '/conference'} onclick={() => goTo('/conference')}>
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
