<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import type { Snippet } from 'svelte'

  let {
    shortcut,
    children,
    ...restProps
  }: {
    shortcut: string
    children: Snippet
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-xs'
    class?: string
    onclick?: (e: MouseEvent) => void
    disabled?: boolean
    title?: string
  } = $props()
</script>

<span class="relative flex flex-col items-center">
  <Button {...restProps}>
    {@render children?.()}
  </Button>
  <span class="absolute top-full mt-0.5 select-none font-mono text-[10px] leading-none text-muted-foreground/40">
    {shortcut}
  </span>
</span>
