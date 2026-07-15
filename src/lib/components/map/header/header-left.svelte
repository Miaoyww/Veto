<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ArrowLeft } from '@lucide/svelte';
	import MapTypeButton from '$lib/components/buttons/map-type-button.svelte';
	import { currentBattle } from '$lib/stores/battle/battle-store';
	import { cn, type WithElementRef } from '$lib/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { InputType } from 'jszip';
	import { isTauri } from '@tauri-apps/api/core';

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;
	let { class: className }: Props = $props();
</script>

<div
	class={cn(
		'veto-card gap-3',
		className
	)}
>
	<a
		href="/"
		class="-ml-1 inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-200/50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-700/50 dark:hover:text-stone-100"
		title="返回首页"
	>
		<ArrowLeft class="h-5 w-5" />
	</a>
	<div class="flex gap-2">
		<MapTypeButton>标准</MapTypeButton>
		<MapTypeButton>地形</MapTypeButton>
		<MapTypeButton>卫星</MapTypeButton>
	</div>
	{#if $currentBattle}
		{#if !isTauri()}
			<span class="text-sm font-medium text-stone-700 dark:text-stone-300"
				>{$currentBattle.name}</span
			>
		{/if}
	{/if}
</div>
