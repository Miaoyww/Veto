<script lang="ts" module>
  import {
    BookOpen,
    Bot,
    ChartPie,
    Frame,
    LifeBuoy,
    Send,
    Settings2,
    SquareTerminal
  } from '@lucide/svelte'
  const data = {
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg'
    },
    navMain: [
      {
        title: 'Playground',
        url: '#',
        icon: SquareTerminal,
        isActive: true,
        items: [
          {
            title: 'History',
            url: '#'
          },
          {
            title: 'Starred',
            url: '#'
          },
          {
            title: 'Settings',
            url: '#'
          }
        ]
      },
      {
        title: 'Models',
        url: '#',
        icon: Bot,
        items: [
          {
            title: 'Genesis',
            url: '#'
          },
          {
            title: 'Explorer',
            url: '#'
          },
          {
            title: 'Quantum',
            url: '#'
          }
        ]
      },
      {
        title: 'Documentation',
        url: '#',
        icon: BookOpen,
        items: [
          {
            title: 'Introduction',
            url: '#'
          },
          {
            title: 'Get Started',
            url: '#'
          },
          {
            title: 'Tutorials',
            url: '#'
          },
          {
            title: 'Changelog',
            url: '#'
          }
        ]
      },
      {
        title: 'Settings',
        url: '#',
        icon: Settings2,
        items: [
          {
            title: 'General',
            url: '#'
          },
          {
            title: 'Team',
            url: '#'
          },
          {
            title: 'Billing',
            url: '#'
          },
          {
            title: 'Limits',
            url: '#'
          }
        ]
      }
    ],
    navSecondary: [
      {
        title: 'Support',
        url: '#',
        icon: LifeBuoy
      },
      {
        title: 'Feedback',
        url: '#',
        icon: Send
      }
    ],
    projects: [
      {
        name: 'Design Engineering',
        url: '#',
        icon: Frame
      },
      {
        name: 'Sales & Marketing',
        url: '#',
        icon: ChartPie
      }
    ]
  }
</script>

<script lang="ts">
  import Command from '@lucide/svelte/icons/command'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import NavMain from './app-sidebar/nav-main.svelte'
  import NavProjects from './app-sidebar/nav-projects.svelte'
  import NavSecondary from './app-sidebar/nav-secondary.svelte'
  import NavUser from './app-sidebar/nav-user.svelte'
  import type { ComponentProps } from 'svelte'
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props()
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps} class="top-9 h-[calc(100svh-2.25rem)]!">
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="##" {...props}>
              <div
                class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
              >
                <Command class="size-4" />
              </div>
              <div class="grid flex-1 text-start text-sm leading-tight">
                <span class="truncate font-medium">Acme Inc</span>
                <span class="truncate text-xs">Enterprise</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={data.navMain} />
    <NavProjects projects={data.projects} />
    <NavSecondary items={data.navSecondary} class="mt-auto" />
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={data.user} />
  </Sidebar.Footer>
</Sidebar.Root>
