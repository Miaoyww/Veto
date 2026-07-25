<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import type { Snippet } from "svelte";

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(""),
    type = "single" as const,
    children,
    ...restProps
  }: Omit<ToggleGroupPrimitive.RootProps, "type"> & {
    type?: "single";
    children: Snippet;
  } = $props();
</script>

<ToggleGroupPrimitive.Root
  bind:ref
  bind:value
  {type}
  data-slot="toggle-group"
  class={cn("flex items-center justify-center gap-1", className)}
  {...restProps}
>
  {@render children?.()}
</ToggleGroupPrimitive.Root>
