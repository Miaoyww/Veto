<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import MapIcon from '@lucide/svelte/icons/map';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createBattle } from '$lib/stores/battle/battle-store';
	import { TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/battle/game-clock.store';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import DatePicker from '$lib/components/ui/date-picker.svelte';
	import type { EventSetting } from '$lib/types';
	import EventConfigDrawer from './event-config-dialog.svelte';
	import type { InstalledPlugin } from '$lib/services/plugin-db';
	import { dbGetAllPlugins } from '$lib/services/plugin-db';

	const MAP_PRESETS = [
		{ label: '中国', center: [35, 105] as [number, number], zoom: 5 },
		{ label: '东亚', center: [37, 120] as [number, number], zoom: 4 },
		{ label: '欧洲', center: [50, 10] as [number, number], zoom: 4 },
		{ label: '中东', center: [30, 45] as [number, number], zoom: 5 },
		{ label: '全球', center: [20, 0] as [number, number], zoom: 2 }
	];

	const DEFAULT_EVENTS: EventSetting[] = [
		{ id: 'natural_disaster', label: '自然灾害', enabled: false, probability: 20 },
		{ id: 'refugee_crisis', label: '难民潮', enabled: false, probability: 30 },
		{ id: 'electronic_warfare', label: '电子干扰', enabled: true, probability: 50 },
		{ id: 'local_conflict', label: '局部冲突', enabled: true, probability: 60 },
		{ id: 'supply_disruption', label: '后勤断供', enabled: false, probability: 25 },
		{ id: 'civilian_uprising', label: '民众暴动', enabled: false, probability: 15 }
	];

	let { open = $bindable(false) }: { open: boolean } = $props();

	/** 已安装的插件列表（异步从 IndexedDB 加载） */
	let installedPlugins = $state<InstalledPlugin[]>([]);
	onMount(async () => {
		installedPlugins = await dbGetAllPlugins();
	});

	const campaignPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'campaign'));
	const factionPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'faction'));
	const scenarioPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'scenario'));
	const rulesetPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'ruleset'));
	const hasAnyMods = $derived(
		campaignPlugins.length +
			factionPlugins.length +
			scenarioPlugins.length +
			rulesetPlugins.length >
			0
	);

	/** 仅存在于对话框生命周期内的草稿——不写入任何 store */
	let draft = $state({
		name: '',
		mapPreset: 0,
		startDate: new CalendarDate(2026, 1, 1) as DateValue | undefined,
		timeScale: 60,
		pixelsPerKm: 10,
		iconStyle: 'nato' as 'nato' | 'simple',
		eventSettings: DEFAULT_EVENTS.map((e) => ({ ...e })),
		selectedCampaign: null as string | null,
		selectedFaction: null as string | null,
		selectedScenario: null as string | null,
		selectedRuleset: null as string | null
	});

	let eventDrawerOpen = $state(false);

	function resetDraft() {
		draft = {
			name: '',
			mapPreset: 0,
			startDate: new CalendarDate(2026, 1, 1),
			timeScale: 60,
			pixelsPerKm: 10,
			iconStyle: 'nato',
			eventSettings: DEFAULT_EVENTS.map((e) => ({ ...e })),
			selectedCampaign: null,
			selectedFaction: null,
			selectedScenario: null,
			selectedRuleset: null
		};
	}

	function handleCreate() {
		const name = draft.name.trim();
		if (!name) return;
		const preset = MAP_PRESETS[draft.mapPreset];
		const enabledMods = draft.selectedCampaign
			? [draft.selectedCampaign]
			: [draft.selectedFaction, draft.selectedScenario, draft.selectedRuleset].filter(
					(id): id is string => id !== null
				);
		console.log(enabledMods.length > 0 ? 'Creating battle with mods:' : 'Creating battle without mods', enabledMods);
		if (enabledMods.length === 0) {
			enabledMods.push("base");
			console.warn('No mods selected for the battle.');
		}
		const id = createBattle(name, {
			mapCenter: preset.center,
			mapZoom: preset.zoom,
			startDate: draft.startDate?.toString(),
			timeScale: draft.timeScale,
			pixelsPerKm: draft.pixelsPerKm,
			iconStyle: draft.iconStyle,
			eventSettings: draft.eventSettings,
			enabledMods
		});
		open = false;
		goto(`/battle/${id}`);
	}

	function handleOpenChange(value: boolean) {
		if (value) resetDraft();
		else eventDrawerOpen = false;
		open = value;
	}

	const enabledEventCount = $derived(draft.eventSettings.filter((e) => e.enabled).length);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-xl ">
			<Dialog.Header class="pb-1">
				<Dialog.Title class="text-base font-semibold tracking-wide">新建战局</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					配置推演参数。所有设置仅在点击「初始化战局」后写入系统。
				</Dialog.Description>
			</Dialog.Header>

			<!-- 事件配置面板，渲染在 Dialog 外，用 fixed 定位贴着对话框右边 -->
			<EventConfigDrawer
				bind:open={eventDrawerOpen}
				bind:eventSettings={draft.eventSettings}
				containerClass="fixed left-[calc(50%+19rem)] top-1/2 -translate-y-1/2 z-[60] w-[380px] max-h-[85vh]"
			/>

			<div class="flex flex-col gap-0 py-2">
				<!-- ── 战局名称 ── -->
				<section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
					<Label for="battle-name" class="mb-2 block text-xs text-muted-foreground">战局代号</Label>
					<Input
						id="battle-name"
						bind:value={draft.name}
						placeholder="输入战局名称..."
						class="h-9"
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCreate()}
					/>
				</section>

				<!-- ── 时间参数（两列） ── -->
				<section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
					<div class="mb-3 flex items-center gap-1.5">
						<CalendarDaysIcon size={12} class="text-muted-foreground" />
						<span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
							>时间参数</span
						>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<!-- 起始推演日期 -->
						<div>
							<Label class="mb-1.5 block text-xs text-muted-foreground">模拟日期</Label>
							<DatePicker bind:value={draft.startDate} class="h-9 w-full text-sm" />
						</div>
						<!-- 时间流速倍率 -->
						<div>
							<Label class="mb-1.5 block text-xs text-muted-foreground">
								<GaugeIcon size={11} class="mr-1 inline text-muted-foreground" />
								时间流速 (模拟秒/真实秒)
							</Label>
							<input
								type="number"
								min="1"
								bind:value={draft.timeScale}
								class="h-9 w-full [appearance:textfield] rounded-lg border border-stone-300 bg-white
									   px-3 text-sm text-stone-800
									   transition-colors outline-none focus:border-stone-400
									   focus:ring-2 focus:ring-stone-300/60
									   dark:border-stone-600 dark:bg-stone-800
									   dark:text-stone-200 dark:focus:border-stone-400 dark:focus:ring-stone-600/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<div class="mt-1.5 flex flex-wrap gap-1">
								{#each TIME_SCALES as scale}
									<button
										type="button"
										class="rounded border px-2 py-0.5 text-[11px] transition-all
											   {draft.timeScale === scale
											? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
											: 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
										onclick={() => (draft.timeScale = scale)}
									>
										{TIME_SCALE_LABELS[scale]}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</section>

				<!-- ── 地图参数（两列） ── -->
				<section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
					<div class="mb-3 flex items-center gap-1.5">
						<MapIcon size={12} class="text-muted-foreground" />
						<span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
							>地图参数</span
						>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<!-- 比例尺 -->
						<div>
							<Label for="pixels-per-km" class="mb-1.5 block text-xs text-muted-foreground"
								>比例尺 (px/km)</Label
							>
							<input
								id="pixels-per-km"
								type="number"
								min="1"
								max="500"
								step="1"
								bind:value={draft.pixelsPerKm}
								class="h-9 w-full [appearance:textfield] rounded-lg border border-stone-300 bg-white
									   px-3 text-sm text-stone-800
									   transition-colors outline-none focus:border-stone-400
									   focus:ring-2 focus:ring-stone-300/60
									   dark:border-stone-600 dark:bg-stone-800
									   dark:text-stone-200 dark:focus:border-stone-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</div>
						<!-- 地图区域 -->
						<div>
							<Label class="mb-1.5 block text-xs text-muted-foreground">初始区域</Label>
							<div class="flex flex-wrap gap-1.5">
								{#each MAP_PRESETS as preset, i}
									<button
										type="button"
										class="rounded-md border px-2.5 py-1 text-xs transition-all
											   {draft.mapPreset === i
											? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
											: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
										onclick={() => (draft.mapPreset = i)}
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</section>

				<!-- ── 视觉标准 ── -->
				<section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
					<div class="mb-3 flex items-center gap-1.5">
						<ShieldIcon size={12} class="text-muted-foreground" />
						<span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
							>视觉标准</span
						>
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-xs
								   transition-all {draft.iconStyle === 'nato'
								? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
								: 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
							onclick={() => (draft.iconStyle = 'nato')}
						>
							<ShieldIcon size={13} />
							北约标准
						</button>
						<button
							type="button"
							class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-xs
								   transition-all {draft.iconStyle === 'simple'
								? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
								: 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
							onclick={() => (draft.iconStyle = 'simple')}
						>
							<LayersIcon size={13} />
							简约图标
						</button>
					</div>
				</section>

				<!-- ── Mod 配置 ── -->
				{#if hasAnyMods}
					<section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
						<div class="mb-3 flex items-center gap-1.5">
							<PuzzleIcon size={12} class="text-muted-foreground" />
							<span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
								>Mod 配置</span
							>
						</div>

						<!-- 战役包（集合包，包含阵营/剧情/规则） -->
						{#if campaignPlugins.length > 0}
							<div class="mb-3">
								<Label class="mb-1.5 block text-xs text-muted-foreground">
									战役包 <span class="opacity-60">（选后自动包含阵营·剧情·规则）</span>
								</Label>
								<div class="flex flex-wrap gap-1.5">
									<button
										type="button"
										class="rounded-md border px-2.5 py-1 text-xs transition-all
										{!draft.selectedCampaign
											? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
											: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
										onclick={() => (draft.selectedCampaign = null)}>不使用</button
									>
									{#each campaignPlugins as p (p.id)}
										<button
											type="button"
											class="rounded-md border px-2.5 py-1 text-xs transition-all
											{draft.selectedCampaign === p.id
												? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
												: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
											onclick={() => (draft.selectedCampaign = p.id)}>{p.manifest.name}</button
										>
									{/each}
								</div>
							</div>
						{/if}

						<!-- 单独选择（战役选中时置灰） -->
						{#if factionPlugins.length > 0 || scenarioPlugins.length > 0 || rulesetPlugins.length > 0}
							<div
								class="space-y-2 transition-opacity {draft.selectedCampaign
									? 'pointer-events-none opacity-35'
									: ''}"
							>
								{#if factionPlugins.length > 0}
									<div>
										<Label class="mb-1.5 block text-xs text-muted-foreground">阵营包</Label>
										<div class="flex flex-wrap gap-1.5">
											<Button
												type="button"
												class="rounded-md border px-2.5 py-1 text-xs transition-all
												{!draft.selectedFaction
													? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
													: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
												onclick={() => (draft.selectedFaction = 'null')}
												>基础包</Button
											>
											{#each factionPlugins as p (p.id)}
												<Button
													type="button"
													class="rounded-md border px-2.5 py-1 text-xs transition-all
													{draft.selectedFaction === p.id
														? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
														: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
													onclick={() => (draft.selectedFaction = p.id)}>{p.manifest.name}</Button
												>
											{/each}
										</div>
									</div>
								{/if}
								{#if scenarioPlugins.length > 0}
									<div>
										<Label class="mb-1.5 block text-xs text-muted-foreground">剧情包</Label>
										<div class="flex flex-wrap gap-1.5">
											<button
												type="button"
												class="rounded-md border px-2.5 py-1 text-xs transition-all
												{!draft.selectedScenario
													? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
													: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
												onclick={() => (draft.selectedScenario = null)}>无</button
											>
											{#each scenarioPlugins as p (p.id)}
												<button
													type="button"
													class="rounded-md border px-2.5 py-1 text-xs transition-all
													{draft.selectedScenario === p.id
														? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
														: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
													onclick={() => (draft.selectedScenario = p.id)}>{p.manifest.name}</button
												>
											{/each}
										</div>
									</div>
								{/if}
								{#if rulesetPlugins.length > 0}
									<div>
										<Label class="mb-1.5 block text-xs text-muted-foreground">规则包</Label>
										<div class="flex flex-wrap gap-1.5">
											<button
												type="button"
												class="rounded-md border px-2.5 py-1 text-xs transition-all
												{!draft.selectedRuleset
													? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
													: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
												onclick={() => (draft.selectedRuleset = null)}>无</button
											>
											{#each rulesetPlugins as p (p.id)}
												<button
													type="button"
													class="rounded-md border px-2.5 py-1 text-xs transition-all
													{draft.selectedRuleset === p.id
														? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
														: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
													onclick={() => (draft.selectedRuleset = p.id)}>{p.manifest.name}</button
												>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</section>
				{/if}

				<!-- ── 突发事件配置入口 ── -->
				<section class="px-1 py-3">
					<button
						type="button"
						class="group flex w-full items-center justify-between rounded-lg border
							   border-dashed border-stone-300 bg-stone-50 px-4 py-3
							   transition-all hover:border-amber-400 hover:bg-amber-50
							   dark:border-stone-600 dark:bg-stone-800/60 dark:hover:border-amber-600 dark:hover:bg-amber-900/20"
						onclick={() => (eventDrawerOpen = true)}
					>
						<div class="flex items-center gap-3">
							<ZapIcon size={15} class="shrink-0 text-amber-500 dark:text-amber-400" />
							<div class="text-left">
								<p
									class="text-sm font-medium text-stone-700 transition-colors group-hover:text-amber-700 dark:text-stone-300 dark:group-hover:text-amber-400"
								>
									配置突发事件
								</p>
								<p class="mt-0.5 text-[11px] text-muted-foreground">
									{enabledEventCount} / {draft.eventSettings.length} 项已启用
								</p>
							</div>
						</div>
						<div
							class="rounded border border-stone-300 px-2 py-0.5 text-[10px] text-stone-400
								   transition-colors group-hover:border-amber-400 group-hover:text-amber-600
								   dark:border-stone-600 dark:text-stone-500 dark:group-hover:border-amber-600 dark:group-hover:text-amber-400"
						>
							配置 →
						</div>
					</button>
				</section>
			</div>

			<Dialog.Footer class="pt-1">
				<Button
					variant="outline"
					onclick={() => {
						open = false;
						eventDrawerOpen = false;
					}}>取消</Button
				>
				<Button onclick={handleCreate} disabled={!draft.name.trim()} class="min-w-[120px] gap-2">
					<PlusIcon size={15} />
					初始化战局
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
