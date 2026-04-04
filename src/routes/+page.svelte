<script lang="ts">
	import { VETO_NAME } from '$lib/const';
	import { Swords, Users, Plus, CircleHelp, Settings, Search } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { battles } from '$lib/stores/battle-store';
	import BattleCard from '$lib/components/cards/battle/battle-card.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import CreateBattleDialog from '$lib/components/dialog/create-battle-dialog.svelte';
	import { fly } from 'svelte/transition';

	// ---- 地图预设 ----（已移至 CreateBattleDialog 组件）

	let query = $state('');
	let selectedMode = $state<'crisis' | null>(null);

	// ---- 新建对话框状态 ----
	let dialogOpen = $state(false);

	const filteredBattles = $derived(
		query.trim()
			? $battles.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
			: $battles
	);

	function openCreateDialog() {
		dialogOpen = true;
	}

	function goToHelp() {
		goto('/help');
	}

	function goToSettings() {
		goto('/settings');
	}
</script>

<div class="flex h-screen w-screen flex-col bg-gradient-to-br from-slate-100 to-stone-200">
	<!-- 主内容区：垂直居中 -->
	<main class="flex flex-1 flex-col items-center justify-center gap-8 px-6">
		<!-- 标题与模式选择 -->
		<div class="flex flex-col items-center gap-4" in:fly={{ y: -20, duration: 400, opacity: 0 }}>
			<h1 class="text-4xl font-bold tracking-wide text-stone-800">{VETO_NAME}</h1>
			<p class="text-sm text-stone-400">选择模式</p>

			<div class="flex gap-6">
				<button
					class="group flex w-48 flex-col items-center gap-2 rounded-2xl border p-5 transition-all hover:scale-105 hover:shadow-lg {selectedMode ===
					'crisis'
						? 'border-red-400 bg-white/80 shadow-lg'
						: 'border-stone-200 bg-white/50 hover:border-stone-400'}"
					onclick={() => (selectedMode = 'crisis')}
				>
					<Swords
						class="h-9 w-9 transition-colors {selectedMode === 'crisis'
							? 'text-red-600'
							: 'text-stone-600 group-hover:text-red-600'}"
					/>	
					<span class="text-base font-semibold text-stone-700">危机推演</span>
					<span class="text-xs text-stone-400">战棋模拟 · 行军作战</span>
				</button>

				<div
					class="flex w-48 cursor-not-allowed flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white/30 p-5 opacity-50"
				>
					<Users class="h-9 w-9 text-stone-400" />
					<span class="text-base font-semibold text-stone-500">模拟大会</span>
					<span class="text-xs text-stone-400">敬请期待</span>
				</div>
			</div>
		</div>

		<!-- 战局管理 -->
		{#if selectedMode === 'crisis'}
			<div
				class="flex w-full max-w-lg flex-col gap-4"
				in:fly={{ y: 24, duration: 350, opacity: 0 }}
			>
				<h2 class="text-2xl font-semibold text-stone-700">战局管理</h2>

				<!-- 搜索 + 新建 -->
				<div class="flex gap-3">
					<InputGroup.Root class="flex w-full">
						<InputGroup.Input
							bind:value={query}
							placeholder="搜索战局..."
						/>
						<InputGroup.Addon>
							<Search class="h-4 w-4" />
						</InputGroup.Addon>
						{#if query.trim()}
							<InputGroup.Addon align="inline-end" class="text-xs text-stone-400">
								{filteredBattles.length} 条
							</InputGroup.Addon>
						{/if}
					</InputGroup.Root>

					<Button onclick={openCreateDialog} class="gap-2">
						<Plus size={16} />
						新建
					</Button>
				</div>

				<!-- 战局列表 -->
				<ScrollArea class="h-64 w-full rounded-xl">
					<div class="flex flex-col gap-2 pr-3">
						{#if filteredBattles.length === 0}
							<div
								class="rounded-xl border border-dashed border-stone-300 bg-white/30 px-6 py-12 text-center"
							>
								{#if query.trim() && $battles.length > 0}
									<p class="text-stone-500">未找到匹配的战局</p>
									<p class="mt-1 text-sm text-stone-400">试试其他关键词？</p>
								{:else}
									<p class="text-stone-500">暂无已保存的战局</p>
									<p class="mt-1 text-sm text-stone-400">创建一个新战局开始推演</p>
								{/if}
							</div>
						{:else}
							{#each filteredBattles as battle (battle.id)}
								<BattleCard {battle} />
							{/each}
						{/if}
					</div>
				</ScrollArea>
			</div>
		{:else}
<div></div>
		{/if}
	</main>

	<!-- 页脚 -->
	<footer class="w-full py-6 text-center text-xs text-stone-400">
		<p>Copyright © <a href="https://github.com/Miaoyww" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-stone-600">Miaoyww</a> 2025–2026</p>
		<p class="mt-1">
			Powered by
			<a
				href="https://svelte.dev"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-stone-600">Svelte</a
			>
			·
			<a
				href="https://vercel.com"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-stone-600">Vercel</a
			>
		</p>
	</footer>
</div>

<div class="fixed right-6 bottom-6 z-20 flex flex-col gap-3">
	<Button
		type="button"
		class="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white/90 text-stone-700 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
		title="帮助"
		onclick={goToHelp}
	>
		<CircleHelp size={20} />
	</Button>
	<Button
		type="button"
		class="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white/90 text-stone-700 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
		title="设置"
		onclick={goToSettings}
	>
		<Settings size={20} />
	</Button>
</div>

<!-- 新建战局 Dialog -->
<CreateBattleDialog bind:open={dialogOpen} />
