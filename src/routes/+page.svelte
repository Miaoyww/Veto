<script lang="ts">
	import { VETO_NAME } from '$lib/const';
	import { Swords, Users, Plus, CircleHelp, Settings } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { battles, createBattle } from '$lib/stores/battle-store';
	import BattleCard from '$lib/components/cards/battle/battle-card.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let newBattleName = $state('');
	let selectedMode = $state<'crisis' | null>(null);

	function handleCreate() {
		const name = newBattleName.trim();
		if (!name) return;
		const id = createBattle(name);
		newBattleName = '';
		goto(`/crisis/${id}`);
	}

	function goToHelp() {
		goto('/help');
	}

	function goToSettings() {
		goto('/settings');
	}
</script>

<div class="flex h-screen w-screen flex-col items-center bg-gradient-to-br from-slate-100 to-stone-200 pt-24">
	<!-- 顶部：模式选择 -->
	<div class="flex flex-shrink-0 flex-col items-center gap-4 px-6 pb-8">
		<h1 class="text-4xl font-bold tracking-wide text-stone-800">{VETO_NAME}</h1>
		<p class="text-sm text-stone-400">选择模式</p>

		<div class="flex gap-6">
			<button
				class="group flex w-48 flex-col items-center gap-2 rounded-2xl border p-5 transition-all hover:scale-105 hover:shadow-lg {selectedMode === 'crisis' ? 'border-red-400 bg-white/80 shadow-lg' : 'border-stone-200 bg-white/50 hover:border-stone-400'}"
				onclick={() => (selectedMode = 'crisis')}
			>
				<Swords class="h-9 w-9 transition-colors {selectedMode === 'crisis' ? 'text-red-600' : 'text-stone-600 group-hover:text-red-600'}" />
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
	<div class="w-full max-w-lg overflow-y-auto px-8">
		{#if selectedMode === 'crisis'}
			<div class="flex flex-col gap-6">
				<h2 class="text-2xl font-semibold text-stone-700">战局管理</h2>

				<!-- 创建新战局 -->
				<div class="flex gap-3">
					<input
						type="text"
						bind:value={newBattleName}
						placeholder="输入新战局名称..."
						class="flex-1 rounded-xl border border-stone-300 bg-white/70 px-4 py-3 text-sm text-stone-800 shadow-sm backdrop-blur-sm transition-colors focus:border-stone-500 focus:outline-none"
						onkeydown={(e) => e.key === 'Enter' && handleCreate()}
					/>
					<button
						class="flex items-center gap-2 rounded-xl border-none bg-stone-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						onclick={handleCreate}
						disabled={!newBattleName.trim()}
					>
						<Plus size={16} />
						创建
					</button>
				</div>

				<!-- 已有战局列表 -->
				<div class="flex flex-col gap-2">
					{#if $battles.length === 0}
						<div class="rounded-xl border border-dashed border-stone-300 bg-white/30 px-6 py-12 text-center">
							<p class="text-stone-500">暂无已保存的战局</p>
							<p class="mt-1 text-sm text-stone-400">创建一个新战局开始推演</p>
						</div>
					{:else}
						{#each $battles as battle (battle.id)}
						<BattleCard {battle} />
						{/each}
					{/if}
				</div>
			</div>
		{:else}
			<div class="pt-4 text-center text-stone-400">
				<p class="text-lg">↑ 请先选择一个模式</p>
			</div>
		{/if}
	</div>
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
