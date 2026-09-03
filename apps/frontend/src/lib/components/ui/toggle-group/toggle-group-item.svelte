<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import { cn } from "$lib/classes/utils.js";
  import type { Snippet } from "svelte";

  let {
    ref = $bindable(null),
    class: className,
    value,
    children,
    ...restProps
  }: ToggleGroupPrimitive.ItemProps & {
    children: Snippet;
  } = $props();
</script>

<ToggleGroupPrimitive.Item
  bind:ref
  {value}
  data-slot="toggle-group-item"
  class={cn(
    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px group/toggle-group-item inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 gap-2 h-9 px-2.5",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</ToggleGroupPrimitive.Item>
