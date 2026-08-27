<script lang="ts">
  import type { SeatGroup, Seat } from '$lib/types-delegate'
  import { currentConference } from '$lib/classes/stores/conference/conference-store'
  import SeatGroupList from './SeatGroupList.svelte'
  import SeatGroupEditor from './SeatGroupEditor.svelte'
  import SeatList from './SeatList.svelte'
  import SeatEditor from './SeatEditor.svelte'
  import InviteCodeDisplay from './InviteCodeDisplay.svelte'

  let selectedGroup = $state<SeatGroup | null>(null)
  let editingGroup = $state<SeatGroup | null>(null)
  let editingSeat = $state<Seat | null>(null)
  let showGroupEditor = $state(false)
  let showSeatEditor = $state(false)
  let inviteSeat = $state<Seat | null>(null)

  function handleSelectGroup(group: SeatGroup): void {
    selectedGroup = group
    showGroupEditor = false
    showSeatEditor = false
  }

  function handleEditGroup(group: SeatGroup): void {
    editingGroup = group
    showGroupEditor = true
  }

  function handleCreateGroup(): void {
    editingGroup = null
    showGroupEditor = true
  }

  function handleEditSeat(seat: Seat): void {
    editingSeat = seat
    showSeatEditor = true
  }

  function handleCreateSeat(): void {
    editingSeat = null
    showSeatEditor = true
  }

  function handleShowInvite(seat: Seat): void {
    inviteSeat = seat
  }
</script>

<div class="seat-management">
  <div class="management-grid">
    <div class="left-panel">
      <SeatGroupList
        onEdit={handleEditGroup}
        onSelect={handleSelectGroup}
        onCreateNew={handleCreateGroup}
        selectedId={selectedGroup?.id}
      />
    </div>

    <div class="right-panel">
      {#if showGroupEditor}
        <SeatGroupEditor
          editingGroup={editingGroup}
          onClose={() => { showGroupEditor = false; editingGroup = null }}
        />
      {:else if showSeatEditor}
        <SeatEditor
          seatGroupId={selectedGroup?.id ?? ''}
          editingSeat={editingSeat}
          onClose={() => { showSeatEditor = false; editingSeat = null }}
        />
      {:else}
        <SeatList
          selectedGroup={selectedGroup}
          onEdit={handleEditSeat}
          onCreateNew={handleCreateSeat}
          onShowInvite={handleShowInvite}
        />
      {/if}
    </div>
  </div>

  {#if inviteSeat}
    <InviteCodeDisplay
      seat={inviteSeat}
      conferenceId={$currentConference?.id ?? ''}
      onClose={() => { inviteSeat = null }}
    />
  {/if}
</div>

<style>
  .seat-management {
    padding: 1rem;
  }
  .management-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
    max-width: 960px;
  }
  .left-panel {
    border-right: 1px solid var(--border);
    padding-right: 1rem;
  }
  .right-panel {
    min-height: 300px;
  }
</style>
