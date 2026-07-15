<script lang="ts">
	import { currentRoute, navigate } from '$lib/router.svelte';
	import { onDestroy, onMount } from 'svelte';
	import Map from '$lib/components/map/map.svelte';
	import { battles, currentBattleId } from '$lib/stores/battle/battle-store';
	import { mods, pluginsReady } from '$lib/registry/mod-registry.svelte';
	import { get } from 'svelte/store';
	import LeftSidebar from '$lib/components/sidebar/left-sidebar.svelte';
	import Header from '$lib/components/header.svelte';
	import Bottom from '$lib/components/bottom.svelte';
	import { useKeyboardShortcuts } from '$lib/hooks/use-keyboard-shortcuts.svelte';
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';

	useKeyboardShortcuts();

	const battleId = currentRoute.params.battle_id ?? null;
	const battle = get(battles).find((b) => b.id === battleId);
	const exists = !!battle;

	if (!exists) {
		navigate('/');
	} else {
		currentBattleId.set(battleId);
	}

	onMount(async () => {
		if (exists && battle) {
			// 等待插件加载完成
			await pluginsReady;
			// 然后加载战局对应的 Mod
			mods.loadMods(battle.enabledMods ?? []);
		}
	});

	onDestroy(() => {
		// 离开战局页面时清理当前战局状态
		mods.clear();
	});
</script>

<svelte:head>
	<title>{VETO_NAME}</title>
	<meta name="title" content={VETO_NAME} />
	<link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

<LeftSidebar />

<Header class="top-14" />
<Bottom />
{#if exists}
	<div class="app-container">
		<div class="relative flex-1 bg-[var(--bg-primary)]">
			<div id="battle-map">
				<Map />
			</div>
		</div>
	</div>
{/if}

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
