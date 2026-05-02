<script lang="ts">
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	import { useKeyboardShortcuts } from '$lib/hooks/use-keyboard-shortcuts.svelte';
	let { children } = $props();

	useKeyboardShortcuts();
</script>

<svelte:head>
	<title>{VETO_NAME}</title>
	<meta name="title" content={VETO_NAME} />
	<link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

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
