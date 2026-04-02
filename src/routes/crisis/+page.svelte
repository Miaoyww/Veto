<script>
	import Map from '$lib/components/map/map.svelte';
</script>

<div class="app-container">
	<div class="relative flex-1 bg-[var(--bg-primary)]">
		<div id="battle-map">
			<Map />
		</div>
	</div>
</div>

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
