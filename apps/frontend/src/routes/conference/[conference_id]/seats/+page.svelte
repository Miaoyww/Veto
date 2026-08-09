<script lang="ts">
  import SeatManagement from '$lib/components/conference/seat-management/SeatManagement.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { ArrowLeft } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'

  const confId = $derived($page.params.conference_id ?? '')
</script>

<div class="seats-page">
  <div class="page-header">
    <Button
      variant="ghost"
      size="sm"
      class="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      onclick={() => goto(`/conference/${confId}`)}
    >
      <ArrowLeft size={14} />
      返回大会
    </Button>
    <h2 class="text-lg font-semibold">席位管理</h2>
  </div>
  <SeatManagement />
</div>

<style>
  .seats-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }
</style>
