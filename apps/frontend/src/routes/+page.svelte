<script lang="ts">
  import Command from '@lucide/svelte/icons/command'
  import {
    House,
    CalendarRange,
    Building2,
    FileText,
    ChartColumn,
    Puzzle,
    Settings,
    Swords
  } from '@lucide/svelte'

  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import NavMain from '$lib/components/app-sidebar/nav-main.svelte'
  import NavUser from '$lib/components/app-sidebar/nav-user.svelte'
  import { authStore } from '$lib/stores/auth-store'

  const data = $derived({
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg'
    },
    navGroups: [
      {
        label: '工作台',
        items: [
          {
            title: '首页',
            url: '/',
            icon: House,
            isActive: true
          },
          {
            title: '会议',
            url: '/conference',
            icon: CalendarRange,
            isActive: false,
            items: $authStore.offline
              ? [
                  { title: '议程', url: '/conference' },
                  { title: '危机军推', url: '/battle' }
                ]
              : [
                  { title: '议程', url: '/conference' },
                  { title: '危机军推', url: '/battle' },
                  { title: '指令', url: '/conference' },
                  { title: '新闻', url: '/conference' },
                  { title: '局势', url: '/conference' }
                ]
          }
        ]
      },
      {
        label: '管理',
        items: [
          { title: '组织', url: '/organizations', icon: Building2 },
          { title: '模板', url: '/templates', icon: FileText },
          { title: '数据分析', url: '/analytics', icon: ChartColumn }
        ]
      },
      {
        label: '开发者',
        items: [{ title: '插件', url: '/plugins', icon: Puzzle }]
      },
      {
        label: '系统',
        items: [{ title: '设置', url: '/settings', icon: Settings }]
      }
    ]
  })

  const visibleGroups = $derived(
    $authStore.offline ? data.navGroups.filter((g) => g.label === '工作台') : data.navGroups
  )
</script>

<Sidebar.Provider>
  <Sidebar.Root variant="inset" class="top-9 h-[calc(100svh-2.25rem)]!">
    <Sidebar.Header>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton size="lg">
            {#snippet child({ props })}
              <a href="/" {...props}>
                <div
                  class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  <Command class="size-4" />
                </div>
                <div class="grid flex-1 text-start text-sm leading-tight">
                  <span class="truncate font-medium">Veto</span>
                  <span class="truncate text-xs">模拟联合国</span>
                </div>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Header>
    <Sidebar.Content>
      <NavMain groups={visibleGroups} />
    </Sidebar.Content>
    <Sidebar.Footer>
      <NavUser user={data.user} />
    </Sidebar.Footer>
  </Sidebar.Root>

  <Sidebar.Inset>
    <div class="flex flex-1 items-center justify-center h-full">
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Swords size={48} class="opacity-30" />
        <p class="text-lg font-medium">欢迎使用 Veto</p>
        <p class="text-sm opacity-70">从左侧导航选择一个模块以开始</p>
      </div>
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
