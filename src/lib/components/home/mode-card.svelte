<script lang="ts">
  import type { Component } from "svelte";
  import * as Card from "$lib/components/ui/card/index.js";

  interface Props {
    icon: Component;
    label: string;
    description: string;
    selected: boolean;
    disabled?: boolean;
    onclick: () => void;
  }

  let { icon: Icon, label, description, selected, disabled = false, onclick }: Props = $props();
</script>

<button
  class="text-left focus:outline-none"
  disabled={disabled}
  {onclick}
>
  <Card.Root
    class="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md {disabled
      ? 'cursor-not-allowed bg-card/30 opacity-50'
      : selected
        ? 'border-red-400 bg-card/90 shadow-sm'
        : 'bg-card/50 hover:border-border/80'}"
  >
    <Card.Content class="flex items-center gap-4 p-4">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg {disabled
          ? 'bg-muted text-muted-foreground'
          : selected
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-muted text-muted-foreground'}"
      >
        <Icon size={20} />
      </div>
      <div>
        <p class="text-sm font-semibold text-foreground">{label}</p>
        <p class="text-xs text-muted-foreground">{description}</p>
      </div>
    </Card.Content>
  </Card.Root>
</button>
