<script lang="ts">
	import '../app.css';
	import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte';
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	import { page } from '$app/state';
	let { children } = $props();
</script>

<svelte:head>
	<title>{VETO_NAME}</title>
	<meta name="title" content={VETO_NAME} />
	<link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

<MyAlertDialog />

<div>
	<div>
		<main>
			{@render children?.()}
		</main>
	</div>
</div>

<style>
	* {
		margin: 0;
	}
</style>
