<script lang="ts">
  import { ChevronsUpDown, House, CalendarRange } from '@lucide/svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import favicon from '$lib/assets/favicon.png'
  import { VETO_NAME } from '$lib/classes/const'
  import { currentConference } from '$lib/classes/stores/conference/conference-store'

  let { hasConf = false, confPrefix = '/conference' }: { hasConf?: boolean; confPrefix?: string } =
    $props()

  const conf = $derived($currentConference)

  let title = $derived(conf ? `${conf.name}` : VETO_NAME)
  let subTitle = $derived(conf ? `${conf.venue}` : '会议系统')
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div
              class="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground"
            >
              <img src={favicon} alt={VETO_NAME} class="size-8" />
            </div>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{title}</span>
              <span class="truncate text-xs">{subTitle}</span>
            </div>
            <ChevronsUpDown size={16} class="ms-auto" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenu.Label class="text-xs text-muted-foreground">导航</DropdownMenu.Label>
        <DropdownMenu.Item onclick={() => goto(resolve('/'))} class="gap-2 p-2">
          <House size={16} />
          首页
        </DropdownMenu.Item>
        {#if hasConf}
          <DropdownMenu.Item onclick={() => goto(resolve('/' + confPrefix.split('/').slice(1).join('/')))} class="gap-2 p-2">
            <CalendarRange size={16} />
            议程
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
