<script lang="ts">
	import { Target, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	interface Props {
		/** 'tracking'=跟随鼠标阶段，'pinned'=固定确认阶段 */
		phase: 'tracking' | 'pinned';
		target: { lat: number; lng: number };
		radius: number;
		x: number;
		y: number;
		oncancel: () => void;
		onconfirm: () => void;
	}

	let { phase, target, radius = $bindable(), x, y, oncancel, onconfirm }: Props = $props();
</script>

<Card.Root
	class="z-[1002] w-64 gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm"
	style="position: fixed; left: {x}px; top: {y}px; pointer-events: {phase === 'pinned' ? 'auto' : 'none'};"
>
	<!-- 标题栏 -->
	<Card.Header class="flex flex-row items-center justify-between gap-1.5 px-3 py-2.5">
		<div class="flex items-center gap-2">
			<Target class="size-3.5 shrink-0 text-red-500" />
			<Card.Title class="text-xs font-medium">
				{phase === 'tracking' ? '确认打击半径' : '设置打击范围'}
			</Card.Title>
		</div>
		{#if phase === 'pinned'}
			<Button
				variant="ghost"
				size="icon"
				class="size-5 shrink-0 text-muted-foreground"
				onclick={oncancel}
			>
				<X class="size-3.5" />
			</Button>
		{/if}
	</Card.Header>

	<Separator />

	<!-- 目标坐标 -->
	<Card.Content class="px-3 py-2">
		<p class="font-mono text-[11px] text-muted-foreground">
			{target.lat.toFixed(4)}°N，{target.lng.toFixed(4)}°E
		</p>
	</Card.Content>

	<Separator />

	<!-- 半径控制 -->
	<Card.Content class="space-y-2.5 px-3 pt-2.5 pb-3">
		<div class="flex items-center justify-between">
			<Label class="text-xs text-muted-foreground">打击半径</Label>
			<span class="font-mono text-xs font-medium text-red-500">
				{(radius / 1000).toFixed(1)} km
			</span>
		</div>

		{#if phase === 'pinned'}
			<input
				type="range"
				min="100"
				max="500000"
				step="100"
				bind:value={radius}
				class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-red-500"
			/>
			<div class="flex items-center gap-2">
				<Input
					type="number"
					min="0.1"
					max="500"
					step="0.1"
					value={+(radius / 1000).toFixed(1)}
					oninput={(e) => {
						const km = parseFloat((e.target as HTMLInputElement).value);
						if (!isNaN(km) && km > 0) radius = Math.round(km * 1000);
					}}
					class="h-7 w-24 text-xs"
				/>
				<Label class="text-xs text-muted-foreground">km</Label>
			</div>
		{:else}
			<Card.Description class="text-[10px]">再次点击地图以确认半径</Card.Description>
		{/if}
	</Card.Content>

	<Card.Footer class="gap-2 border-t px-3 pt-2.5 pb-3">
		{#if phase === 'pinned'}
			<Button variant="outline" size="sm" class="h-7 flex-1 text-xs" onclick={oncancel}>
				取消
			</Button>
			<Button
				size="sm"
				class="h-7 flex-1 bg-red-500 text-xs text-white hover:bg-red-600"
				onclick={onconfirm}
			>
				确认打击
			</Button>
		{:else}
			<Button variant="outline" size="sm" class="h-7 w-full text-xs" onclick={oncancel}>
				取消
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
