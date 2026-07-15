<script lang="ts">
	import '../app.css';
	import '../css/components.css';
	import '$units'; // 初始化 ModRegistry 基础数据
	import MyAlertDialog from '$lib/components/dialog/my-alert-dialog.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { VETO_NAME } from '$lib/const';
	import logo from '$lib/assets/logo.svg';
	import TitleBar from '$lib/components/titlebar.svelte';
	import { setRouteError } from '$lib/router.svelte';
	import { dbGetAllPlugins } from '$lib/services/plugin-db';
	import { injectToRegistry } from '$lib/services/plugin-registry';
	import { markPluginsReady } from '$lib/registry/mod-registry.svelte';
	import SettingsDialog from '$lib/components/settings/settings-dialog.svelte';
	import ModeSidebar from "$lib/components/home/mode-sidebar.svelte";
	import BattlePanel from "$lib/components/home/battle-panel.svelte";

	let selectedMode = $state<string | null>(null);

	// 从 IndexedDB 恢复用户已安装的插件到运行时 ModRegistry
	if (typeof window !== 'undefined') {
		dbGetAllPlugins().then((plugins) => {
			for (const plugin of plugins) {
				injectToRegistry(plugin);
			}
			markPluginsReady();
		});

		// 移动端 UA 检测
		const ua = navigator.userAgent ?? '';
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
			setRouteError(403, '暂不支持移动设备访问');
		}
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
<SettingsDialog />
<Toaster richColors position="bottom-right" />

<div class="pt-9">
	<div class="flex h-[calc(100vh-2.25rem)] w-screen overflow-hidden">
		<ModeSidebar
			{selectedMode}
			onSelectMode={(mode) => (selectedMode = mode)}
		/>
		<BattlePanel mode={selectedMode} class="m-2" />
	</div>
</div>

<style>
	* {
		margin: 0;
	}
</style>
