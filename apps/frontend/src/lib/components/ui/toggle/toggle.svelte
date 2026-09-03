<script lang="ts">
  import { Toggle as TogglePrimitive } from "bits-ui";
  import { cn } from "$lib/classes/utils.js";
  import { tv, type VariantProps } from "tailwind-variants";
  import type { Snippet } from "svelte";

  export const toggleVariants = tv({
    base: "hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px aria-invalid:ring-3 group/toggle inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 min-w-9 px-2.5",
        sm: "h-8 min-w-8 px-2",
        lg: "h-10 min-w-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });

  type ToggleVariant = VariantProps<typeof toggleVariants>["variant"];
  type ToggleSize = VariantProps<typeof toggleVariants>["size"];

  let {
    ref = $bindable(null),
    class: className,
    variant = "default" as ToggleVariant,
    size = "default" as ToggleSize,
    pressed = $bindable(false),
    children,
    ...restProps
  }: Omit<TogglePrimitive.RootProps, "pressed"> & {
    variant?: ToggleVariant;
    size?: ToggleSize;
    pressed?: boolean;
    children: Snippet;
  } = $props();
</script>

<TogglePrimitive.Root
  bind:ref
  bind:pressed
  data-slot="toggle"
  class={cn(toggleVariants({ variant, size }), className)}
  {...restProps}
>
  {@render children?.()}
</TogglePrimitive.Root>
