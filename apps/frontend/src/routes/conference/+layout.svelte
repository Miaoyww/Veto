<script lang="ts">
  import { Globe, House, Monitor, Plus, Puzzle } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import GlobalSidebar from '$lib/components/global-sidebar.svelte'
  import BrandSwitcher from '$lib/components/app-sidebar/brand-switcher.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { conferences } from '$lib/classes/stores/conference/conference-store'
  import { navigateToConference } from '$lib/classes/utils'

  let { children } = $props()
  let displayOnlyDialogOpen = $state(false)

  const recentConferences = $derived([...$conferences].reverse().slice(0, 5))

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
      <Sidebar.Menu class="p-3">
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive onclick={() => goTo('/conference')}>
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
