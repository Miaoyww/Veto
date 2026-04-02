<script lang="ts">
	import { coords } from '$lib/stores/map-store';
</script>

<div class="bottom-5 left-5 right-5 bottom-status flex justify-end z-1000 absolute">
	<div class="coordinates rounded-lg blur-backdrop">
		坐标: {$coords.lat.toFixed(5)}, {$coords.lng.toFixed(5)}
	</div>
</div>

<style>
	.mode-indicator,
	.coordinates {
		padding: 8px 15px;
		box-shadow: var(--shadow);
		font-size: 1rem;
		color: var(--foreground);
	}
</style>
