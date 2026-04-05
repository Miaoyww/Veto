<script lang="ts">
	import { MapPin, Navigation, X, Target, Ruler } from '@lucide/svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { interactionMode, pendingPlaceUnitId } from '$lib/stores/battle-store';
	import { pendingRoute } from '$lib/stores/pending-route.store';

	let {
		strikePendingTarget
	}: {
		strikePendingTarget: { lat: number; lng: number } | null;
	} = $props();
</script>

{#if $interactionMode !== 'select'}
	<div class="absolute top-20 left-1/2 z-[1001] -translate-x-1/2">
		<div class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/90 px-4 py-2.5 shadow-md backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/90">
			{#if $interactionMode === 'place'}
				<MapPin class="h-4 w-4 text-stone-600 dark:text-stone-400" />
				<span class="text-sm text-stone-700 dark:text-stone-300">点击地图放置单位</span>
			{:else if $interactionMode === 'route'}
				<Navigation class="h-4 w-4 text-stone-600 dark:text-stone-400" />
				<span class="text-sm text-stone-700 dark:text-stone-300">
					{#if $pendingRoute}
						{$pendingRoute.type === 'reset' ? '改设路线' : '追加路线'}模式 · 已录入 {$pendingRoute.points.length} 个节点 · Esc 完成并确认
					{:else}
						路线绘制模式（直接生效）· Esc 完成
					{/if}
				</span>
			{:else if $interactionMode === 'strike'}
				<Target class="h-4 w-4 text-stone-600 dark:text-stone-400" />
				<span class="text-sm text-stone-700 dark:text-stone-300">
					{strikePendingTarget ? '再次点击地图确认打击半径' : '点击地图选择打击目标位置'}
				</span>
			{:else if $interactionMode === 'measure'}
				<Ruler class="h-4 w-4 text-amber-500" />
				<span class="text-sm text-stone-700 dark:text-stone-300">点击添加测量点 · Esc 退出</span>
			{/if}
			<div class="mx-1 h-4 w-px bg-stone-200 dark:bg-stone-700"></div>
			<Button
				variant="ghost"
				size="sm"
				class="h-7 gap-1.5 px-2 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
				onclick={() => { interactionMode.set('select'); pendingPlaceUnitId.set(null); }}
			>
				<X class="h-3 w-3" />
				取消
				<Kbd.Root class="ml-0.5 text-[10px]">Esc</Kbd.Root>
			</Button>
		</div>
	</div>
{/if}
