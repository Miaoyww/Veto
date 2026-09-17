<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import WindowControls from './app-sidebar/window-controls.svelte'

  let {
    class: className = '',
    collapsible = 'icon',
    sidebar,
    toolbar,
    children,
    ...restProps
  }: {
    class?: string
    collapsible?: 'offcanvas' | 'icon' | 'none'
    sidebar?: Snippet
    toolbar?: Snippet
    children: Snippet
  } & Omit<ComponentProps<typeof Sidebar.Root>, 'children' | 'class'> = $props()
</script>

<Sidebar.Provider class="h-svh overflow-hidden">
  <Sidebar.Root variant="inset" class={className} {collapsible} {...restProps}>
    {@render sidebar?.()}
    <Sidebar.Rail />
  </Sidebar.Root>

  <Sidebar.Inset class="min-h-0 overflow-hidden">
    <header class="flex h-9 shrink-0 items-center gap-2 pl-4">
      {@render toolbar?.()}
      <WindowControls />
    </header>

    <div class="flex min-h-0 flex-1 flex-col">
      {@render children()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
