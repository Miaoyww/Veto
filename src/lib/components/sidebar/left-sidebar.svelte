<script lang="ts">
	import { leftBarPinned } from '$lib/stores/sidebar-store';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import FactionPanel from './faction-panel.svelte';
	import UnitPanel from './unit-panel.svelte';
	import ActionLogPanel from './action-log-panel.svelte';
</script>

{#if $leftBarPinned}
	<div
		class="sidebar blur-backdrop absolute top-30 bottom-30 z-1000 overflow-hidden rounded-lg"
		style:left={'20px'}
		transition:slide={{ duration: 500, delay: 50, easing: cubicInOut, axis: 'y' }}
	>
		<div class="sidebar-content">
			<FactionPanel />
			<UnitPanel />
			<ActionLogPanel />
		</div>
	</div>
{/if}

<style>
	.sidebar-content {
		flex: 1;
		padding: 15px;
		overflow-y: auto;
		max-height: 100%;
	}
</style>
