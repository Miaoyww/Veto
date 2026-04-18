<script lang="ts">
	import { onMount } from 'svelte';

	let { children } = $props();
	import { battles, currentBattleId } from '$lib/stores/crisis/battle-store';
	import { registry } from '$lib/registry/mod-registry';

	onMount(() => {

    });

	$effect(() => {
		console.log('Page realoded: currentBattleId =', $currentBattleId);
		console.log('battles =', $battles);
		console.log(
			'exists =',
			$battles.some((b) => b.id === $currentBattleId)
		);
		console.log('registry mods =', registry.getModList());
	});
</script>

<div>
	<div>
		<main>
			{@render children?.()}
		</main>
	</div>
</div>
