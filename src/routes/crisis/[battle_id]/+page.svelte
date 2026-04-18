<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Map from '$lib/components/map/map.svelte';
	import { battles, currentBattleId } from '$lib/stores/crisis/battle-store';
	import { registry } from '$lib/registry/mod-registry';
	import { get } from 'svelte/store';

	const battleId = page.params.battle_id ?? null;
	const battle = get(battles).find((b) => b.id === battleId);
	const exists = !!battle;

	if (!exists) {
		goto('/');
	} else {
		currentBattleId.set(battleId);
	}

	onMount(() => {
		if (exists && battle) {
			registry.prepareBattleRegistry(battle.enabledMods ?? []);
		}
	});
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
