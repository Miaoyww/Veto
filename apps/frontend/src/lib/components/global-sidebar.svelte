<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte'
  import { House, CalendarRange, Send, Newspaper, Globe, Swords, Timer } from '@lucide/svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { navigate, currentRoute } from '$lib/router.svelte'
  import { currentConferenceId } from '$lib/stores/conference/conference-store'
  import { page } from '$app/stores'
  import { standaloneTimer, timerDialogOpen } from '$lib/stores/conference/timer-store'
  import { formatTime } from '$lib/utils'
  import { Button } from '$lib/components/ui/button'
  import BrandSwitcher from './app-sidebar/brand-switcher.svelte'
  import WindowControls from './app-sidebar/window-controls.svelte'
  import UserButton from './app-sidebar/user-button.svelte'

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
  const routeId = $derived(currentRoute?.routeId ?? '/')

  const confPrefix = $derived(hasConf ? `/conference/${confId}` : '/conference')

  const isLoginPage = $derived($page.url.pathname === '/login')

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
      isActive: routeId.startsWith('/conference/')
    },
    {
      title: '指令',
      icon: Send,
      url: `${confPrefix}/directives`,
      needsConf: true,
      isActive: routeId === `/conference/${confId}/directives`
    },
    {
      title: '新闻',
      icon: Newspaper,
      url: `${confPrefix}/news`,
      needsConf: true,
      isActive: routeId === `/conference/${confId}/news`
    },
    {
      title: '局势',
      icon: Globe,
      url: `${confPrefix}/situation`,
      needsConf: true,
      isActive: routeId === `/conference/${confId}/situation`
    },
    {
      title: '军事推演',
      icon: Swords,
      url: '/battle',
      needsConf: true,
      isActive: routeId.startsWith('/battle')
    }
  ])
</script>

{#if !isLoginPage}
  <Sidebar.Provider>
    <Sidebar.Root
      variant="inset"
      class="h-[calc(100svh-2.25rem)]! {className}"
      {collapsible}
      {...restProps}
    >
      <Sidebar.Header>
        <BrandSwitcher {hasConf} {confPrefix} />
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Menu class="p-3">
          {#each items as item, i (i)}
            {#if hasConf}
              {#if i === 1}
                <Sidebar.Separator class="my-1" />
              {/if}
            {/if}
            {#if !item.needsConf || hasConf}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  onclick={() => navigate(item.url)}
                  isActive={item.isActive}
                  class="cursor-pointer"
                >
                  <item.icon size={18} />
                  <span>{item.title}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/if}
            {#if hasConf}
              {#if i === 4}
                <Sidebar.Separator class="my-1" />
              {/if}
            {/if}
          {/each}
        </Sidebar.Menu>
      </Sidebar.Content>

      <Sidebar.Footer>
        {#if !hasConf}
          <div
            class="px-3 py-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
          >
            请先加入大会
          </div>
        {/if}
      </Sidebar.Footer>

      <Sidebar.Rail />
    </Sidebar.Root>
    <Sidebar.Inset>
      <header class="flex h-9 shrink-0 items-center gap-2 pl-4">
        <Sidebar.Trigger class="-ms-1" />

        <Separator orientation="vertical" class="me-2 h-4" />

        <!-- 中：计时器显示 / 拖拽区域 -->
        <div class="drag-region flex-1 h-full flex items-center justify-center">
          {#if $standaloneTimer}
            {@const st = $standaloneTimer}
            {@const expired = !st.isRunning && st.remainingSec <= 0}
            <Button
              class="no-drag flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono tabular-nums transition-colors hover:bg-accent/50 {expired
                ? 'text-red-500'
                : st.isRunning
                  ? 'text-indigo-500'
                  : 'text-amber-500'}"
              variant="ghost"
              onclick={() => timerDialogOpen.set(true)}
              title={expired
                ? '计时器已到期（点击打开）'
                : st.isRunning
                  ? '计时器运行中（点击打开）'
                  : '计时器已暂停（点击打开）'}
            >
              <Timer size={12} class={expired ? 'animate-pulse' : st.isRunning ? '' : ''} />
              <span>{formatTime(st.remainingSec)}</span>
            </Button>
          {/if}
        </div>

        <!-- 右：用户 + 设置 + 窗口控制按钮 -->
        <UserButton />
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

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
</style>
