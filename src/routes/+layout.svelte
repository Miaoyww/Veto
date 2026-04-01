<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/header.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import RightSidebar from '$lib/components/sidebar/right-sidebar.svelte';
	import Bottom from '$lib/components/bottom.svelte';
	import UnitPro from '$lib/components/unit-pro.svelte';
	import LeftSidebar from '$lib/components/sidebar/left-sidebar.svelte';
	import SettingsDialog from '$lib/components/dialog/settings-dialog.svelte';
	import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte';
	import { ARMYS_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	let { children } = $props();
</script>

<svelte:head>
	<title>{ARMYS_NAME}</title>
	<meta name="title" content="{ARMYS_NAME}" />
	<link rel="icon" type="image/x-icon" href="{logo}" />
</svelte:head>

<div>
	<div>
		<main>
			{@render children?.()}
		</main>
	</div>
</div>

<LeftSidebar />
<UnitPro />
<Header />
<Bottom />
<RightSidebar />
<SettingsDialog />
<MyAlertDialog />

<style>
	* {
		margin: 0;
	}

	.context-menu-item {
		padding: 8px 15px;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--text-primary);
		transition: background 0.2s;
	}

	.context-menu-item:hover {
		background: var(--bg-tertiary);
	}

	.range-legend {
		position: absolute;
		bottom: 70px;
		left: 20px;
		background: var(--bg-card);
		padding: 10px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow);
		z-index: 1000;
		max-width: 250px;
	}

	.range-legend h4 {
		font-size: 0.9rem;
		margin-bottom: 8px;
		color: var(--text-primary);
	}
</style>
