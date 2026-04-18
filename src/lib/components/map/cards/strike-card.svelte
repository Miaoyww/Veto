<script lang="ts">
	import * as L from 'leaflet';
	import { Target, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		interactionMode,
		selectedPlacedUnitId,
		updatePlacedUnit,
		addLog
	} from '$lib/stores/crisis/battle-store';

	let {
		map,
		pendingTarget = $bindable<{ lat: number; lng: number } | null>(null)
	}: {
		map: L.Map | undefined;
		pendingTarget?: { lat: number; lng: number } | null;
	} = $props();

	let pinned = $state(false);
	let pendingUnitId: string | null = $state(null);
	let radius = $state(5000);
	let mouseX = $state(0);
	let mouseY = $state(0);
	let pinnedX = $state(0);
	let pinnedY = $state(0);
	let previewCircle: L.Circle | null = null;
	let hoverMarker: L.CircleMarker | null = null;

	function cancelStrike() {
		pinned = false;
		pendingTarget = null;
		pendingUnitId = null;
		interactionMode.set('select');
		if (hoverMarker) { hoverMarker.remove(); hoverMarker = null; }
	}

	function confirmStrike() {
		if (pendingUnitId && pendingTarget) {
			updatePlacedUnit(
				pendingUnitId,
				{ strikeTarget: pendingTarget, strikeRadius: radius },
				'设置打击目标'
			);
			addLog(
				`设置打击目标 (${pendingTarget.lat.toFixed(3)}°N, ${pendingTarget.lng.toFixed(3)}°E)，半径 ${(radius / 1000).toFixed(1)} km`
			);
		}
		pinned = false;
		pendingUnitId = null;
		pendingTarget = null;
		if (hoverMarker) { hoverMarker.remove(); hoverMarker = null; }
	}

	function handleMouseMove(e: L.LeafletMouseEvent) {
		mouseX = e.originalEvent.clientX;
		mouseY = e.originalEvent.clientY;
		if (!pendingTarget) {
			if (!hoverMarker) {
				hoverMarker = L.circleMarker(e.latlng, {
					radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2
				}).addTo(map!);
			} else {
				hoverMarker.setLatLng(e.latlng);
			}
		} else {
			const dist = map!.distance([pendingTarget.lat, pendingTarget.lng], e.latlng);
			if (dist > 100) radius = Math.round(dist);
		}
	}

	function handleClick(e: L.LeafletMouseEvent) {
		const placedId = $selectedPlacedUnitId;
		if (!placedId) return;
		const latlng = e.latlng;
		if (!pendingTarget) {
			// 阶段 1 → 2：选定目标，开始跟随鼠标
			pendingUnitId = placedId;
			pendingTarget = { lat: latlng.lat, lng: latlng.lng };
			radius = 5000;
			if (hoverMarker) { hoverMarker.remove(); hoverMarker = null; }
			hoverMarker = L.circleMarker([latlng.lat, latlng.lng], {
				radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2
			}).addTo(map!);
		} else {
			// 阶段 2 → 3：固定卡片
			const CARD_W = 256, CARD_H = 220;
			const cx = e.originalEvent.clientX, cy = e.originalEvent.clientY;
			let px = cx + 16;
			let py = cy - CARD_H / 2;
			if (px + CARD_W > window.innerWidth - 8) px = cx - CARD_W - 16;
			if (py < 8) py = 8;
			if (py + CARD_H > window.innerHeight - 8) py = window.innerHeight - CARD_H - 8;
			pinnedX = px;
			pinnedY = py;
			pinned = true;
			interactionMode.set('select');
		}
	}

	// 注册/注销 Leaflet 事件（仅在打击模式下）
	$effect(() => {
		const m = map;
		const mode = $interactionMode;
		if (!m || mode !== 'strike') {
			if (hoverMarker && !pendingTarget) { hoverMarker.remove(); hoverMarker = null; }
			return;
		}
		m.on('mousemove', handleMouseMove);
		m.on('click', handleClick);
		return () => {
			m.off('mousemove', handleMouseMove);
			m.off('click', handleClick);
			if (hoverMarker && !pendingTarget) { hoverMarker.remove(); hoverMarker = null; }
		};
	});

	// 打击目标预览圆
	$effect(() => {
		const m = map;
		if (pendingTarget && m) {
			const { lat, lng } = pendingTarget;
			const r = radius;
			if (!previewCircle) {
				previewCircle = L.circle([lat, lng], {
					radius: r, color: '#ef4444', weight: 2,
					fillColor: '#ef4444', fillOpacity: 0.12, dashArray: '6 4'
				}).addTo(m);
			} else {
				previewCircle.setRadius(r);
			}
		} else {
			if (previewCircle) { previewCircle.remove(); previewCircle = null; }
		}
	});
</script>

<Card.Root
	class="z-[1002] w-64 gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm"
	style="position: fixed; left: {pinned ? pinnedX : mouseX + 18}px; top: {pinned ? pinnedY : mouseY - 18}px; pointer-events: {pinned ? 'auto' : 'none'}; display: {pendingTarget ? 'block' : 'none'};"
>
	<!-- 标题栏 -->
	<Card.Header class="flex flex-row items-center justify-between gap-1.5 px-3 py-2.5">
		<div class="flex items-center gap-2">
			<Target class="size-3.5 shrink-0 text-red-500" />
			<Card.Title class="text-xs font-medium">
				{pinned ? '设置打击范围' : '确认打击半径'}
			</Card.Title>
		</div>
		{#if pinned}
			<Button
				variant="ghost"
				size="icon"
				class="size-5 shrink-0 text-muted-foreground"
				onclick={cancelStrike}
			>
				<X class="size-3.5" />
			</Button>
		{/if}
	</Card.Header>

	<Separator />

	<!-- 目标坐标 -->
	<Card.Content class="px-3 py-2">
		<p class="font-mono text-[11px] text-muted-foreground">
			{pendingTarget?.lat.toFixed(4)}°N，{pendingTarget?.lng.toFixed(4)}°E
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

		{#if pinned}
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
		{#if pinned}
			<Button variant="outline" size="sm" class="h-7 flex-1 text-xs" onclick={cancelStrike}>
				取消
			</Button>
			<Button
				size="sm"
				class="h-7 flex-1 bg-red-500 text-xs text-white hover:bg-red-600"
				onclick={confirmStrike}
			>
				确认打击
			</Button>
		{:else}
			<Button variant="outline" size="sm" class="h-7 w-full text-xs" onclick={cancelStrike}>
				取消
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && (pendingTarget || pinned)) {
			cancelStrike();
		}
	}}
/>
