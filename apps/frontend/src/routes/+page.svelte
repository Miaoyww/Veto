<script lang="ts">
  import ConferencePanel from '$lib/components/home/conference-panel.svelte'
  import { fly } from 'svelte/transition'
</script>

<div class="flex h-full w-full flex-row" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
  <ConferencePanel />
</div>
