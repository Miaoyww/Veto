<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte'
  import {
    House,
    CalendarRange,
    Send,
    Newspaper,
    Globe,
    Swords,
    UserPlus,
    Puzzle,
    Plus,
    UserRoundCheck,
    ArrowLeft,
    Wrench,
    Files,
    Monitor
  } from '@lucide/svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Button } from '$lib/components/ui/button'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { currentConferenceId, conferences } from '$lib/classes/stores/conference/conference-store'
  import { page } from '$app/stores'
  import { navigateToConference } from '$lib/utils'
  import BrandSwitcher from './app-sidebar/brand-switcher.svelte'
  import WindowControls from './app-sidebar/window-controls.svelte'
  import NavUser from './app-sidebar/nav-user.svelte'
  import DynamicIsland from './dynamic-island.svelte'
  import { currentConference } from '$lib/classes/stores/conference/conference-store'
  import { cn } from '$lib/utils.js'
  import JoinConferenceDialog from './home/join-conference-dialog.svelte'
  import DisplayOnlyDialog from './conference/display-only-dialog.svelte'
  let {
    className = '',
    collapsible = 'icon',
    children,
    ...restProps
  }: { className?: string; children: Snippet; collapsible?: 'offcanvas' | 'icon' | 'none' } & Omit<
    ComponentProps<typeof Sidebar.Root>,
    'children' | 'class'
  > = $props()

  const confId = $derived($currentConferenceId)
  const hasConf = $derived(confId != null)
  const routeId = $derived($page.url.pathname ?? '/')

  const confPrefix = $derived(hasConf ? `/conference/${confId}` : '/conference')

  const isStandaloneRoute = $derived(
    $page.url.pathname === '/login' ||
      $page.url.pathname.startsWith('/conference-display/') ||
      $page.url.pathname.startsWith('/delegate/')
  )

  // 最近大会列表（按 id 倒序，取前 5 条）
  const recentConfs = $derived([...$conferences].reverse().slice(0, 5))
  $effect(() => {
    console.log(routeId)
  })
  let displayOnlyDialogOpen = $state(false)
  let joinBattleDialogOpen = $state(false)
  function goTo(path: string): void {
    // @ts-expect-error resolve 要求字面量路由类型，这里接受通用 string
    goto(resolve(path))
  }

  type NavItem = {
    title: string
    icon: typeof House
    url: string
    needsConf: boolean
    isActive: boolean
  }

  const items = $derived<NavItem[]>([
    { title: '首页', icon: House, url: '/', needsConf: false, isActive: routeId === '/' },
    {
      title: '议程',
      icon: CalendarRange,
      url: confPrefix,
      needsConf: true,
      isActive: routeId === confPrefix
    },
    {
      title: '指令',
      icon: Send,
      url: `${confPrefix}/directives`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/directives`
    },
    {
      title: '新闻',
      icon: Newspaper,
      url: `${confPrefix}/news`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/news`
    },
    {
      title: '局势',
      icon: Globe,
      url: `${confPrefix}/situation`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/situation`
    },
    {
      title: '文件',
      icon: Files,
      url: `${confPrefix}/files`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/files`
    },
    {
      title: '工具',
      icon: Wrench,
      url: `${confPrefix}/tools`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/tools`
    },
    {
      title: '军事推演',
      icon: Swords,
      url: `${confPrefix}/battle`,
      needsConf: true,
      isActive: routeId === `${confPrefix}/battle`
    },
    {
      title: '代表管理',
      icon: UserRoundCheck,
      url: `${confPrefix}/delegations`,
      needsConf: false,
      isActive: routeId === `${confPrefix}/delegations`
    }
  ])

  const conf = $derived($currentConference)

  const presentCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present').length ?? 0
  )
  const votingCount = $derived(
    conf?.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length ?? 0
  )
  const simpleMajority = $derived(Math.floor(votingCount / 2) + 1)
  const twoThirds = $derived(Math.ceil((votingCount * 2) / 3))
</script>

{#if !isStandaloneRoute}
  <Sidebar.Provider>
    <Sidebar.Root variant="inset" class={className} {collapsible} {...restProps}>
      <Sidebar.Header>
        <BrandSwitcher {hasConf} {confPrefix} />
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Menu class="p-3">
          {#if !hasConf}
            <!-- 未加入大会：操作按钮 -->
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => (joinBattleDialogOpen = true)}
                class="cursor-pointer"
              >
                <UserPlus size={18} />
                <span>加入大会</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => goTo('/conference-events/new')}
                class="cursor-pointer"
              >
                <Plus size={18} />
                <span>创建大会</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.Separator class="my-1" />

            <!-- 最近大会列表 -->
            {#each recentConfs as conf (conf.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  onclick={() => navigateToConference(conf.id)}
                  class="cursor-pointer"
                >
                  <Globe size={18} />
                  <span class="truncate">{conf.name}</span>
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
          {:else}
            <!-- 已加入大会：导航菜单 -->
            {#each items as item, i (i)}
              {#if i === 1}
                <Sidebar.Separator class="my-1" />
              {/if}
              {#if !item.needsConf || hasConf}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    onclick={() => goTo(item.url)}
                    isActive={item.isActive}
                    class="cursor-pointer"
                  >
                    <item.icon size={18} />
                    <span>{item.title}</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/if}
            {/each}
          {/if}
          {#if conf}
            <Sidebar.Separator class="my-1" />

            <!-- 代表团列表 -->
            <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
              <div class="flex shrink-0 items-start gap-1.5 px-5 pb-2">
                <span class="text-[10px] text-muted-foreground/60">
                  {presentCount}/{conf.delegations.length} 出席，{votingCount} 可投票
                </span>
              </div>

              <div class="px-3 pb-3">
                {#each conf.delegations as delegation (delegation.id)}
                  {@const isPresent = delegation.attendance === 'present'}
                  {@const isObserver = isPresent && delegation.vetoPower === false}
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
            </div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.Content>

      <Sidebar.Footer class="mt-auto">
        <NavUser />
      </Sidebar.Footer>

      <Sidebar.Rail />
    </Sidebar.Root>

    <Sidebar.Inset>
      <header class="flex h-9 shrink-0 items-center gap-2 pl-4">
        {#if conf}
          <Button variant="ghost" size="icon" onclick={() => goto(resolve('/'))}>
            <ArrowLeft size={14} />
          </Button>
        {/if}
        <Sidebar.Trigger class="-ms-1" />

        {#if conf}
          <Separator orientation="vertical" class="me-2 h-4" />

          <!-- 表决信息 -->
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
        <!-- 中：拖拽区域 -->
        <div class="drag-region flex-1 h-full">
          {#if conf}
            <DynamicIsland />
          {/if}
        </div>

        <!-- 右：插件入口 / 用户 + 设置 + 窗口控制按钮 -->

        <Button
          variant="ghost"
          size="sm"
          class="no-drag flex items-center gap-1.5 px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={() => (displayOnlyDialogOpen = true)}
          title="显示窗口"
        >
          <Monitor size={14} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="no-drag flex items-center gap-1.5 px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={() => goto(resolve('/tools'))}
          title="插件"
        >
          <Puzzle size={14} />
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
