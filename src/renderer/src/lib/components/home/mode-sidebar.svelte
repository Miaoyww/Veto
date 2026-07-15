<script lang="ts">
  import { Swords, Users } from "@lucide/svelte";
  import { VETO_NAME } from "$lib/const";
  import ModeCard from "./mode-card.svelte";

  const version = __APP_VERSION__;

  interface Props {
    selectedMode: string | null;
    onSelectMode: (mode: string) => void;
  }

  let { selectedMode, onSelectMode }: Props = $props();
</script>

<aside class="flex h-full w-[280px] shrink-0 flex-col border-r bg-muted/30">
  <!-- Title -->
  <div class="px-6 pt-8 pb-4 text-center">
    <h1 class="text-2xl font-bold tracking-wide text-foreground">{VETO_NAME}</h1>
    <p class="mt-1 text-sm text-muted-foreground">选择推演模式</p>
  </div>

  <!-- Mode Cards -->
  <div class="flex flex-col gap-3 px-4">
    <ModeCard
      icon={Swords}
      label="危机推演"
      description="战棋模拟 · 行军作战"
      selected={selectedMode === "crisis"}
      onclick={() => onSelectMode("crisis")}
    />

    <ModeCard
      icon={Users}
      label="模拟大会"
      description="敬请期待"
      selected={false}
      disabled
      onclick={() => {}}
    />
  </div>

  <!-- Version -->
  <div class="mt-auto px-6 pb-6">
    <p class="text-xs text-muted-foreground">
      <span class="font-semibold text-foreground">{VETO_NAME}</span>
      · v{version}
    </p>
  </div>
</aside>
