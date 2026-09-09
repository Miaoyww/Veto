<script lang="ts">
  import type { LucideIcon } from '@lucide/svelte'
  import { ArrowRight } from '@lucide/svelte'
  import * as Card from '$lib/components/ui/card'

  interface Props {
    icon: LucideIcon
    label: string
    value: string | number
    href: string
  }

  let { icon: Icon, label, value, href }: Props = $props()
</script>

<Card.Root class="gap-0 rounded-lg py-0 shadow-none transition-colors hover:bg-accent/50">
  <a
    {href}
    class="group block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Card.Header class="p-0">
      <Card.Title class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon class="size-4" />
        {label}
      </Card.Title>
      <Card.Action>
        <ArrowRight
          aria-hidden="true"
          class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </Card.Action>
    </Card.Header>
    <Card.Content class="p-0">
      <p class="mt-3 text-2xl font-semibold">{value}</p>
    </Card.Content>
  </a>
</Card.Root>
