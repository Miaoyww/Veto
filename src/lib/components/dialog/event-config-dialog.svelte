<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { EventSetting } from '$lib/types';
	import { ZapIcon, XIcon, PlusIcon } from '@lucide/svelte/icons';
	import EventCard from '$lib/components/cards/settings/event-card.svelte';

	const PRESET_IDS = new Set([
		'natural_disaster',
		'refugee_crisis',
		'electronic_warfare',
		'local_conflict',
		'supply_disruption',
		'civilian_uprising'
	]);

	let {
		open = $bindable(false),
		eventSettings = $bindable<EventSetting[]>([])
	}: {
		open: boolean;
		eventSettings: EventSetting[];
	} = $props();

	let localDraft = $state<EventSetting[]>([]);
	let newLabel = $state('');
	let newProbability = $state(50);

	$effect(() => {
		if (open) {
			localDraft = eventSettings.map((e) => ({ ...e }));
			newLabel = '';
			newProbability = 50;
		}
	});

	function close() {
		open = false;
	}

	function handleApply() {
		eventSettings = localDraft.map((e) => ({ ...e }));
		close();
	}

	function addCustomEvent() {
		const label = newLabel.trim();
		if (!label) return;
		localDraft = [
			...localDraft,
			{
				id: `custom_${Date.now()}`,
				label,
				enabled: true,
				probability: newProbability
			}
		];
		newLabel = '';
		newProbability = 50;
	}

	function deleteEvent(id: string) {
		localDraft = localDraft.filter((e) => e.id !== id);
	}

	const enabledCount = $derived(localDraft.filter((e) => e.enabled).length);
</script>

{#if open}
	<!-- 面板本体：fixed，贴紧对话框右侧（对话框 max-w-xl=36rem，右边缘约 50vw+18rem） -->
	<div
		transition:fly={{ x: -180, duration: 280 }}
		class="fixed left-[calc(50%+19rem)] top-1/2 -translate-y-1/2 z-[60] flex w-[380px] max-h-[85vh] flex-col
			   bg-white border border-stone-200 rounded-lg shadow-lg"
	>
		<!-- 头部 -->
		<div class="flex shrink-0 items-start justify-between border-b border-stone-200 bg-stone-50 px-5 py-4 rounded-t-lg">
			<div>
				<div class="flex items-center gap-2">
					<ZapIcon size={14} class="text-amber-500 shrink-0" />
					<h2 class="text-sm font-semibold text-stone-700 tracking-widest uppercase">
						突发事件配置
					</h2>
				</div>
				<p class="mt-1.5 text-[11px] leading-relaxed text-stone-400">
					已启用
					<span class="text-amber-500 font-medium tabular-nums">{enabledCount}</span>
					/ {localDraft.length} 项
				</p>
			</div>
			<button
				type="button"
				class="rounded-md p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
				onclick={close}
			>
				<XIcon size={15} />
			</button>
		</div>

		<!-- 事件列表 -->
		<div class="flex-1 space-y-2 overflow-y-auto px-4 py-3">
			{#each localDraft as _, i (localDraft[i].id)}
				<EventCard
					bind:event={localDraft[i]}
					canDelete={!PRESET_IDS.has(localDraft[i].id)}
					ondelete={() => deleteEvent(localDraft[i].id)}
				/>
			{/each}

			<!-- 新增自定义事件表单 -->
			<div class="rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-3.5 space-y-3 mt-1">
				<p class="text-[11px] font-medium text-stone-500 uppercase tracking-wider">新增自定义事件</p>
				<Input
					placeholder="事件名称"
					bind:value={newLabel}
					class="h-8 text-sm bg-white"
					onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') addCustomEvent(); }}
				/>
				<div class="space-y-1.5">
					<div class="flex justify-between items-center">
						<span class="text-[11px] text-stone-500">初始触发概率</span>
						<span class="text-xs font-mono font-semibold text-amber-600 tabular-nums">{newProbability}%</span>
					</div>
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						bind:value={newProbability}
						style="--val: {newProbability}%"
						class="prob-slider w-full cursor-pointer"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					class="w-full h-8 text-[11px] gap-1.5 border-stone-300 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
					onclick={addCustomEvent}
					disabled={!newLabel.trim()}
				>
					<PlusIcon size={12} />
					添加事件
				</Button>
			</div>
		</div>

		<!-- 底部 -->
		<div class="shrink-0 flex gap-3 border-t border-stone-200 bg-stone-50 px-4 py-4 rounded-b-lg">
			<Button variant="outline" class="flex-1" onclick={close}>取消</Button>
			<Button class="flex-1" onclick={handleApply}>应用事件预设</Button>
		</div>
	</div>
{/if}

<style>
	.prob-slider {
		appearance: none;
		height: 6px;
		border-radius: 9999px;
		background: linear-gradient(
			to right,
			#f59e0b 0%,
			#f59e0b var(--val, 50%),
			#e5e7eb var(--val, 50%),
			#e5e7eb 100%
		);
		outline: none;
	}
	.prob-slider::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #f59e0b;
		border: 2px solid #ffffff;
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.4);
		cursor: pointer;
		transition: box-shadow 0.15s;
	}
	.prob-slider::-webkit-slider-thumb:hover {
		box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25);
	}
	.prob-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #f59e0b;
		border: 2px solid #ffffff;
		cursor: pointer;
	}
</style>
