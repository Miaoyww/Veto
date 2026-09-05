<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import { loadConference, saveConferencesNow } from '$lib/classes/stores/conference/conference-store'
  import { destroyAllTimers } from '$lib/classes/services/engine/conference-engine'
  import SeatManagement from '$lib/components/conference/seat-management/SeatManagement.svelte'

  const conferenceId = $derived($page.params.conference_id ?? null)

  onMount(() => {
    if (conferenceId) loadConference(conferenceId)
  })

  onDestroy(async () => {
    await saveConferencesNow()
    destroyAllTimers()
  })
</script>

<div class="seats-page">
  <div class="page-header">
    <h2 class="text-lg font-semibold">席位管理</h2>
    <span class="text-xs text-muted-foreground">大会级席位与席位组</span>
  </div>
  <SeatManagement />
</div>

<style>
  .seats-page { display: flex; flex-direction: column; height: 100%; }
  .page-header { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--border); }
</style>
