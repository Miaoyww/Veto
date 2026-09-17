<script lang="ts">
  import SeatManagement from '$lib/components/conference/seat-management/SeatManagement.svelte'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import PageTopBar from '$lib/components/conference/common/page-top-bar.svelte'

  const confId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
</script>

<div class="seats-page">
  <PageTopBar title="席位管理" backHref={resolve(`/client/${confId}/committee/${committeeId}`)} />
  <SeatManagement />
</div>

<style>
  .seats-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
