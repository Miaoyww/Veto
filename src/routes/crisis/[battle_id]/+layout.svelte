<script lang="ts">
	import { onMount } from 'svelte';

	let { children } = $props();
	import { battles, currentBattleId } from '$lib/stores/crisis/battle-store';
	import { mods, registry } from '$lib/registry/mod-registry.svelte';
	import UnitStateCard from '$lib/components/map/cards/floating/unit-state-card.svelte';

	onMount(() => {});
</script>


<div>
	<div>
		<main>
			{@render children?.()}
		</main>
	</div>
</div>
