<script lang="ts">
	import Header from '$lib/components/header.svelte';
	import Bottom from '$lib/components/bottom.svelte';
	import LeftSidebar from '$lib/components/sidebar/left-sidebar.svelte';
	import SettingsDialog from '$lib/components/dialog/settings/crisis/settings-dialog.svelte';
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	import { browser } from '$app/environment';
	import { useKeyboardShortcuts } from '$lib/hooks/use-keyboard-shortcuts.svelte';
	let { children } = $props();

	const isTauri = browser && '__TAURI_INTERNALS__' in window;

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

<LeftSidebar />

<Header class={isTauri ? 'top-14' : ''} />
<Bottom />
<SettingsDialog />

<style>
	* {
		margin: 0;
	}
</style>
