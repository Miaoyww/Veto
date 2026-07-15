<script lang="ts">
  import ModeSidebar from "$lib/components/home/mode-sidebar.svelte";
  import BattlePanel from "$lib/components/home/battle-panel.svelte";

  let selectedMode = $state<string | null>(null);
</script>

<div class="flex h-[calc(100vh-2.25rem)] w-screen overflow-hidden">
  <ModeSidebar
    {selectedMode}
    onSelectMode={(mode) => (selectedMode = mode)}
  />
  <BattlePanel mode={selectedMode} class="m-2" />
</div>
