<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { EventSetting } from '$lib/types';
	import {
		AlertTriangleIcon,
		UsersIcon,
		RadioIcon,
		SwordsIcon,
		PackageXIcon,
		FlameIcon,
		ZapIcon,
		XIcon
	} from '@lucide/svelte/icons';

	interface EventMeta {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		description: string;
		colorClass: string;
	}

	const EVENT_META: Record<string, EventMeta> = {
		natural_disaster: {
			icon: AlertTriangleIcon,
			description: '地震、洪水、台风等自然灾害波及作战区域，影响机动与后勤',
			colorClass: 'text-orange-400'
		},
		refugee_crisis: {
			icon: UsersIcon,
			description: '大规模难民潮涌入，阻塞交通线并引发人道主义压力',
			colorClass: 'text-yellow-400'
		},
		electronic_warfare: {
			icon: RadioIcon,
			description: 'GPS 欺骗、通信干扰及雷达压制，降低蓝军态势感知',
			colorClass: 'text-sky-400'
		},
		local_conflict: {
			icon: SwordsIcon,
			description: '第三方武装突发冲突，扰乱战场侧翼秩序',
			colorClass: 'text-red-400'
		},
		supply_disruption: {
			icon: PackageXIcon,
			description: '关键补给线路遭袭，前线物资补给告急',
			colorClass: 'text-purple-400'
		},
		civilian_uprising: {
			icon: FlameIcon,
			description: '后方民众暴动并占领基础设施，威胁纵深稳定',
			colorClass: 'text-rose-400'
		}
	};

	let {
		open = $bindable(false),
		eventSettings = $bindable<EventSetting[]>([])
	}: {
		open: boolean;
		eventSettings: EventSetting[];
	} = $props();

	let localDraft = $state<EventSetting[]>([]);

	$effect(() => {
		if (open) {
			localDraft = eventSettings.map((e) => ({ ...e }));
		}
	});

	function close() {
		open = false;
	}

	function handleApply() {
		eventSettings = localDraft.map((e) => ({ ...e }));
		close();
	}

	function handleTrigger(label: string) {
		console.info(`[推演裁决] 手动触发事件：${label}`);
	}

	const enabledCount = $derived(localDraft.filter((e) => e.enabled).length);
</script>

{#if open}
	<!-- 面板本体：fixed，贴紧对话框右侧（对话框 max-w-xl=36rem，右边缘约 50vw+18rem） -->
	<div
		transition:fly={{ x: -180, duration: 280 }}
		class="fixed left-[calc(50%+19rem)] top-1/2 -translate-y-1/2 z-[60] flex w-[380px] max-h-[85vh] flex-col
			   bg-white border border-stone-200 rounded-lg"
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
			{#each localDraft as event (event.id)}
				{@const meta = EVENT_META[event.id]}
				<div
					class="rounded-lg border p-3.5 space-y-3 transition-all duration-200 {event.enabled
						? 'border-stone-200 bg-white'
						: 'border-stone-100 bg-stone-50/60 opacity-60'}"
				>
					<!-- 标题行 -->
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-start gap-3 min-w-0">
							{#if meta}
								{@const EventIcon = meta.icon}
								<div class="mt-0.5 shrink-0">
									<EventIcon size={14} class={meta.colorClass} />
								</div>
							{/if}
							<div class="min-w-0">
								<p class="text-sm font-medium text-stone-700 leading-none">{event.label}</p>
								{#if meta}
									<p class="text-[11px] text-stone-400 mt-1.5 leading-snug">{meta.description}</p>
								{/if}
							</div>
						</div>
						<Switch bind:checked={event.enabled} class="shrink-0 mt-0.5" />
					</div>

					<!-- 概率滑块 -->
					{#if event.enabled}
						<div class="space-y-2 pt-2 border-t border-stone-100">
							<div class="flex justify-between items-center">
								<span class="text-[11px] text-stone-500">触发概率</span>
								<span class="text-xs font-mono font-semibold text-amber-600 tabular-nums"
									>{event.probability}%</span
								>
							</div>
							<input
								type="range"
								min="0"
								max="100"
								step="5"
								bind:value={event.probability}
								style="--val: {event.probability}%"
								class="prob-slider w-full cursor-pointer"
							/>
							<div class="flex justify-between text-[10px] text-stone-400 select-none">
								<span>极低</span>
								<span>中等</span>
								<span>必然</span>
							</div>
						</div>
					{/if}

					<!-- 手动触发 -->
					<Button
						variant="outline"
						size="sm"
						class="w-full h-7 text-[11px] gap-1.5
							   hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50"
						onclick={() => handleTrigger(event.label)}
					>
						<ZapIcon size={11} />
						立即手动触发
					</Button>
				</div>
			{/each}
		</div>

		<!-- 底部 -->
		<div class="shrink-0 flex gap-3 border-t border-stone-200 bg-stone-50 px-4 py-4 rounded-b-lg">
			<Button
				variant="outline"
				class="flex-1"
				onclick={close}
			>
				取消
			</Button>
			<Button class="flex-1" onclick={handleApply}>
				应用事件预设
			</Button>
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


	