<script lang="ts">
  import type { SeatGroup, Seat } from '$lib/classes/types/delegate'
  import { currentConferenceId } from '$lib/classes/stores/conference/conference-store'
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
          {editingGroup}
          onClose={() => {
            showGroupEditor = false
            editingGroup = null
          }}
        />
      {:else if showSeatEditor}
        <SeatEditor
          seatGroupId={selectedGroup?.id ?? ''}
          {editingSeat}
          onClose={() => {
            showSeatEditor = false
            editingSeat = null
          }}
        />
      {:else}
        <SeatList
          {selectedGroup}
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
      conferenceId={$currentConferenceId ?? ''}
      onClose={() => {
        inviteSeat = null
      }}
    />
  {/if}
</div>

<style>
  .seat-management {
    padding: 1rem;
  }
  .management-grid {
    display: flex;
    width: 100%;
    gap: 1.5rem;
  }
  .left-panel,
  .right-panel {
    flex: 1 1 0;
    min-width: 0;
  }
  .left-panel {
    border-right: 1px solid var(--border);
    padding-right: 1rem;
  }
  .right-panel {
    min-height: 300px;
  }

  @media (max-width: 720px) {
    .management-grid {
      flex-direction: column;
    }
    .left-panel {
      border-right: 0;
      border-bottom: 1px solid var(--border);
      padding-right: 0;
      padding-bottom: 1rem;
    }
  }
</style>
