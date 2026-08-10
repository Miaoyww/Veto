<script lang="ts">
  import { BadgeCheck, ChevronsUpDown, LogOut, User } from '@lucide/svelte'
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { settingsDialogOpen, activeSettingsSection } from '$lib/stores/app/global-ui-store'
  import { setOffline, authStore } from '$lib/stores/auth-store'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  const user = $derived(
    $authStore.user ?? {
      name: '用户',
      email: '',
      avatar: ''
    }
  )
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            <Avatar.Root class="size-8 rounded-lg">
              {#if user.avatar}
                <Avatar.Image src={user.avatar} alt={user.name} />
              {/if}
              <Avatar.Fallback class="rounded-lg">
                <User size={16} />
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email || '未登录'}</span>
            </div>
            <ChevronsUpDown size={16} class="ms-auto" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar.Root class="size-8 rounded-lg">
              {#if user.avatar}
                <Avatar.Image src={user.avatar} alt={user.name} />
              {/if}
              <Avatar.Fallback class="rounded-lg">
                <User size={16} />
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email || '未登录'}</span>
            </div>
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item
            class="gap-2"
            onclick={() => {
              activeSettingsSection.set('account')
              settingsDialogOpen.set(true)
            }}
          >
            <BadgeCheck size={16} />
            账户设置
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          class="gap-2"
          onclick={() => {
            setOffline(false)
            goto(resolve('/login'))
          }}
        >
          <LogOut size={16} />
          退出登录
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
