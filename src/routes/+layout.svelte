<script lang="ts">
	import '../app.css';
	import '$units'; // 初始化 ModRegistry 基础数据
	import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	import TitleBar from '$lib/components/titlebar.svelte';
	import { browser } from '$app/environment';
	import { dbGetAllPlugins } from '$lib/services/plugin-db';
	import { injectToRegistry } from '$lib/services/plugin-registry';
	import { registry } from '$lib/registry/mod-registry';
	import { currentBattleId, battles } from '$lib/stores/battle-store';
	import { get } from 'svelte/store';
	let { children } = $props();

	// 从 IndexedDB 恢复用户已安装的插件到运行时 ModRegistry
	if (browser) {
		dbGetAllPlugins().then((plugins) => {
			for (const plugin of plugins) {
				injectToRegistry(plugin);
			}
			// 注入完成后，若已进入战局则立即按战局配置激活对应 Mod
			const battleId = get(currentBattleId);
			if (battleId) {
				const battle = get(battles).find((b) => b.id === battleId);
				if (battle) registry.prepareBattleRegistry(battle.enabledMods ?? []);
			}
		});
	}

	// Vercel Analytics & Speed Insights（仅在非 Tauri 环境下注入）
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	const isTauri = browser && '__TAURI_INTERNALS__' in window;
	if (!isTauri) {
		injectAnalytics({ mode: dev ? 'development' : 'production' });
		injectSpeedInsights();
	}
</script>

<svelte:head>
	<title>{VETO_NAME}</title>
	<meta name="title" content={VETO_NAME} />
	<link rel="icon" type="image/x-icon" href={logo} />
</svelte:head>

<TitleBar />
<ModeWatcher />
<MyAlertDialog />
<Toaster richColors position="bottom-right" />

<div class={isTauri ? 'pt-9' : ''}>
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
