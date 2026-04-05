<script lang="ts">
	import { settingOpen } from '$lib/stores/setting-dialog-store';
	import { Button } from '../../../ui/button';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import About from '$lib/components/settings/pages/about.svelte';
	import Battle from '$lib/components/dialog/settings/crisis/pages/battle.svelte';
	import { fade, scale } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

	let activeTab = $state('about'); // 控制当前选中 tab

	function switchTab(tab: string) {
		activeTab = tab;
	}
</script>

{#if $settingOpen}
	<div
		class="setting-dialog absolute z-1000 flex items-center justify-center rounded-lg"
		transition:fade={{ duration: 150 }}
	>
		<!-- 左侧边栏 -->
		<Tabs.Tabs bind:value={activeTab} orientation="vertical" class="flex h-full bg-background/75 backdrop-blur-md rounded-lg">
			<Tabs.List>
				<Tabs.Trigger value="battle" onclick={() => switchTab('battle')}>战局</Tabs.Trigger>
				<Tabs.Trigger value="about" onclick={() => switchTab('about')}>关于</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Tabs>

		<!-- 页面内容 -->
		<div class="bg-background/75 backdrop-blur-md ml-6 flex h-200 w-240 flex-1 flex-col rounded-lg p-6">
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-4 right-4"
				onclick={() => settingOpen.set(false)}
			>
				<X />
			</Button>

			<div>
				<ScrollArea class="mt-5 h-180 w-full" scrollbarYClasses="hidden">
					{#if activeTab === 'about'}<About />{/if}
					{#if activeTab === 'battle'}<Battle />{/if}
				</ScrollArea>
			</div>
		</div>
	</div>
{/if}

<style>
	.setting-dialog {
		position: absolute;
		min-width: 50rem;
		min-height: 50rem;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>
