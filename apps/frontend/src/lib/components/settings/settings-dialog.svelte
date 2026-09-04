<script lang="ts">
  import { Settings, Info, X, Puzzle, Map } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Separator from '$lib/components/ui/separator/index.js'
  import GeneralPage from './pages/common/general.svelte'
  import ModsPage from './pages/common/mods.svelte'
  import AboutPage from '../settings/pages/common/about.svelte'
  import VenuePage from './pages/common/venue.svelte'

  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { settingsDialogOpen, activeSettingsSection } from '$lib/classes/stores/app/global-ui-store'
  const version = __APP_VERSION__

  let activeSection = $state<Section>('general')
  type Section = 'general' | 'mods' | 'venue' | 'about'

  interface NavItem {
    key: Section
    label: string
    icon: typeof Settings
  }

  let NAV_TOP: NavItem[] = $state([
    { key: 'general', label: '常规设置', icon: Settings },
    { key: 'mods', label: '模组设置', icon: Puzzle },
    { key: 'venue', label: '会场设置', icon: Map }
  ])

  let NAV_BOTTOM: NavItem[] = $state([{ key: 'about', label: '关于', icon: Info }])

  let open = $state(false)
  settingsDialogOpen.subscribe((v) => {
    const wasClosed = !open && v
    open = v
    if (wasClosed) {
      // 打开时读取指定的 section，否则默认 general
      const target = $activeSettingsSection
      if (target && target !== 'account') {
        activeSection = target
        activeSettingsSection.set(null)
      } else {
        activeSection = 'general'
      }
    }
  })

  function onOpenChange(o: boolean): void {
    settingsDialogOpen.set(o)
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content
      class="w-[1024px] max-w-[calc(100vw-40px)] sm:max-w-[1024px] h-[85vh] p-0 gap-0"
      showCloseButton={false}
    >
      <!-- 关闭按钮 -->
      <Button
        class="absolute end-4 top-4 z-10 opacity-70 transition-opacity hover:opacity-100"
        variant="ghost"
        size="icon"
        onclick={() => settingsDialogOpen.set(false)}
      >
        <X size={18} />
      </Button>
      <div class="flex h-full w-full overflow-hidden rounded-lg">
        <!-- 左侧导航 -->
        <div class="flex w-[240px] shrink-0 flex-col bg-muted/50">
          <div class="px-5 pt-5 pb-2">
            <h1 class="text-[26px] font-bold leading-none tracking-tight">设置</h1>
            <p class="mt-1.5 text-sm text-muted-foreground">个性化与全局设置</p>
          </div>

          <!-- 用户卡片 -->
          <!-- <div class="px-3 pt-1 pb-1">
            <button
              class="w-full cursor-pointer rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-accent"
              class:bg-accent={activeSection === 'account'}
              onclick={() => (activeSection = 'account')}
            >
              <div class="flex items-center gap-3">
                <Avatar.Root class="size-9 rounded-full shrink-0">
                  {#if user?.avatar}
                    <Avatar.Image src={user.avatar} alt={user.name ?? ''} />
                  {/if}
                  <Avatar.Fallback class="rounded-full bg-muted">
                    <User size={16} />
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium">{user?.name ?? '未登录'}</div>
                  <div class="truncate text-xs text-muted-foreground">{user?.email ?? ''}</div>
                </div>
                <BadgeCheck size={16} class="shrink-0 text-muted-foreground" />
              </div>
            </button>
          </div> -->

          <div class="px-3 pb-1">
            <Separator.Root />
          </div>

          <div class="flex flex-1 flex-col gap-0.5 px-3 pt-3">
            {#each NAV_TOP as item (item.key)}
              <Button
                class="w-full cursor-pointer justify-start gap-2.5 px-3 h-9"
                variant={activeSection === item.key ? 'secondary' : 'ghost'}
                onclick={() => (activeSection = item.key)}
              >
                <item.icon size={18} />
                <span class="text-sm">{item.label}</span>
              </Button>
            {/each}
          </div>
          <div class="mt-auto flex flex-col gap-0.5 px-3 pt-2 pb-5">
            {#each NAV_BOTTOM as item (item.key)}
              <Button
                class="w-full cursor-pointer justify-start gap-2.5 px-3 h-9"
                variant={activeSection === item.key ? 'secondary' : 'ghost'}
                onclick={() => (activeSection = item.key)}
              >
                <item.icon size={18} />
                <span class="text-sm">{item.label}</span>
              </Button>
            {/each}
          </div>

          <div class="flex flex-col gap-1 px-5 pb-5">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">Veto</span>
            </div>
            <span class="text-xs text-muted-foreground">Version {version}</span>
          </div>
        </div>

        <!-- 右侧内容 -->
        <div class="flex flex-1 flex-col bg-background">
          <ScrollArea class="h-full w-full">
            <div class="p-10">
              {#if activeSection === 'general'}<GeneralPage />{/if}
              {#if activeSection === 'mods'}<ModsPage />{/if}
              {#if activeSection === 'venue'}<VenuePage />{/if}
              {#if activeSection === 'about'}<AboutPage />{/if}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
