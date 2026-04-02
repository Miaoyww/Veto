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
	import { page } from '$app/state';
	let { children } = $props();

	let isCrisis = $derived(page.url.pathname.startsWith('/crisis'));
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

{#if isCrisis}
	<LeftSidebar />
	<UnitPro />
	<Header />
	<Bottom />
	<RightSidebar />
	<SettingsDialog />
	<MyAlertDialog />
{/if}

<style>
	* {
		margin: 0;
	}
</style>
