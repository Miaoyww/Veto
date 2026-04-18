<script lang="ts">
  import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "$lib/components/ui/alert-dialog";
  import { alertDialogStore, hideAlert } from "$lib/stores/global-ui-store";
  import { get } from "svelte/store";

  let state = get(alertDialogStore);
  alertDialogStore.subscribe((value) => (state = value));

  function handleConfirm() {
    state.onConfirm?.();
    hideAlert();
  }
</script>

<AlertDialog bind:open={state.open}>
  <AlertDialogContent class="absolute z-1000 overflow-hidden rounded-lg">
    <AlertDialogHeader>
      <AlertDialogTitle>{state.title}</AlertDialogTitle>
      <AlertDialogDescription>{state.description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      {#if state.onConfirm}
        <AlertDialogCancel onclick={hideAlert}>取消</AlertDialogCancel>
        <AlertDialogAction onclick={handleConfirm}>确认</AlertDialogAction>
      {:else}
        <AlertDialogAction onclick={hideAlert}>确定</AlertDialogAction>
      {/if}
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>