<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Map from '$lib/components/map/map.svelte';
	import { battles, currentBattleId } from '$lib/stores/battle-store';
	import { get } from 'svelte/store';

	const battleId = page.params.battle_id ?? null;
	const exists = get(battles).some((b) => b.id === battleId);

	if (!exists) {
		goto('/');
	} else {
		currentBattleId.set(battleId);
	}
</script>

{#if exists}
	<div class="app-container">
		<div class="relative flex-1 bg-[var(--bg-primary)]">
			<div id="battle-map">
				<Map />
			</div>
		</div>
	</div>
{/if}

<style>
	* {
		margin: 0;
		box-sizing: border-box;
	}

	.app-container {
		display: flex;
		height: 100vh;
	}

	#battle-map {
		width: 100%;
		height: 100%;
	}
</style>
