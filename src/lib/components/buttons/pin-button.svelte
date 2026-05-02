<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Pin, PinOff } from '@lucide/svelte';
	import { rightBarPinned } from '$lib/stores/battle/battle-ui-store';

	function togglePin() {
		rightBarPinned.update((prev) => !prev);
	}
</script>

<Button variant="ghost" size="icon" onclick={togglePin} title="切换侧边栏固定">
	{#if $rightBarPinned}
		<Pin />
	{:else}
		<PinOff />
	{/if}
</Button>
