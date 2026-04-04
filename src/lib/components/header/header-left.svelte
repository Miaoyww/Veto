<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { PanelsTopLeft, ArrowLeft } from '@lucide/svelte';
	import MapTypeButton from '$lib/components/buttons/map-type-button.svelte';
	import { leftBarPinned } from '$lib/stores/sidebar-store';
	import { currentBattle, selectFaction } from '$lib/stores/battle-store';

	function togglePin() {
		selectFaction('');
		leftBarPinned.update((prev) => !prev);
	}
</script>

<div class="blur-backdrop flex items-center gap-3 rounded-lg p-3">
	<a
		href="/"
		class="-ml-1 inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-200/50 hover:text-stone-900"
		title="返回首页"
	>
		<ArrowLeft class="h-5 w-5" />
	</a>
	<Separator orientation="vertical" class="h-6" />
	<Button
		variant="ghost"
		class="cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200 active:border-accent active:bg-accent active:text-white"
		size="icon"
		onclick={togglePin}
		title="切换侧边栏固定"
	>
		<PanelsTopLeft />
	</Button>
	<div class="flex gap-2">
		<MapTypeButton>标准</MapTypeButton>
		<MapTypeButton>地形</MapTypeButton>
		<MapTypeButton>卫星</MapTypeButton>
	</div>
	{#if $currentBattle}
		<Separator orientation="vertical" class="h-6" />
		<span class="text-sm font-medium text-stone-700">{$currentBattle.name}</span>
	{/if}
</div>
