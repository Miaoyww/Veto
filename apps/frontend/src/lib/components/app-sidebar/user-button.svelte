<script lang="ts">
  import { ChevronsUpDown, User } from '@lucide/svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import { Button } from '$lib/components/ui/button'
  import { settingsDialogOpen } from '$lib/stores/app/global-ui-store'
  import { authStore, setOffline } from '$lib/stores/auth-store'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  // TODO: replace with real user data from auth/profile store
  let { userName = '用户', avatar = '' }: { userName?: string; avatar?: string } = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="sm"
        class="no-drag flex items-center gap-1.5 px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {#if avatar}
          <img src={avatar} alt={userName} class="size-5 rounded-full" />
        {:else}
          <div class="flex size-5 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <User size={10} />
          </div>
        {/if}
        <span class="max-w-[80px] truncate">{userName}</span>
        <ChevronsUpDown size={10} />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="min-w-48 rounded-lg" align="end" side="bottom" sideOffset={8}>
    <DropdownMenu.Label class="text-xs text-muted-foreground">
      <div class="flex items-center gap-2 px-1 py-1">
        {#if avatar}
          <img src={avatar} alt={userName} class="size-8 rounded-full" />
        {:else}
          <div class="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <User size={16} />
          </div>
        {/if}
        <div>
          <div class="font-medium text-foreground text-sm">{userName}</div>
        </div>
      </div>
    </DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={() => settingsDialogOpen.set(true)} class="gap-2">
      设置
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => {
        setOffline(false)
        goto(resolve('/login'))
      }}
      class="gap-2"
    >
      退出登录
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
