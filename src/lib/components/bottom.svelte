<script lang="ts">
	import { coords } from '$lib/stores/map-store';
	import { interactionMode } from '$lib/stores/battle-store';

	let modeName = $derived({
		select: '选择单位',
		place: '放置单位',
		route: '绘制路线',
		strike: '设置范围'
	}[$interactionMode]);
</script>

<div class="bottom-5 left-5 right-5 bottom-status flex justify-between z-1000 absolute">
	<div class="mode-indicator rounded-lg blur-backdrop">{modeName}</div>
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
