<script lang="ts">
	import { VETO_NAME } from '$lib/const';
	import { Swords, Users, Plus, CircleHelp, Settings, Search } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { battles } from '$lib/stores/crisis/battle-store';
	import BattleCard from '$lib/components/cards/battle/battle-card.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import CreateBattleDialog from '$lib/components/dialog/create-battle-dialog.svelte';
	import { fly } from 'svelte/transition';
	import Footer from '$lib/components/footer.svelte';

	let query = $state('');
	let selectedMode = $state<'crisis' | null>(null);
	let dialogOpen = $state(false);

	const filteredBattles = $derived(
		query.trim()
			? $battles.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
			: $battles
	);
</script>

<Tooltip.Provider>
<div class="flex h-screen w-screen flex-col bg-gradient-to-br from-page-from to-page-to">
	<main class="flex flex-1 flex-col items-center justify-center gap-8 px-6 pt-10">
		<!-- 标题与模式选择 -->
		<div class="flex flex-col items-center gap-4" in:fly={{ y: -20, duration: 400, opacity: 0 }}>
			<h1 class="text-4xl font-bold tracking-wide text-foreground">{VETO_NAME}</h1>
			<p class="text-sm text-muted-foreground">选择模式</p>

			<div class="flex gap-6">
				<!-- 危机推演 -->
				<button class="group focus:outline-none" onclick={() => (selectedMode = 'crisis')}>
					<Card.Root
						class="w-48 cursor-pointer items-center gap-2 p-5 transition-all hover:scale-105 hover:shadow-lg {selectedMode === 'crisis'
							? 'border-red-400 bg-card/80'
							: 'bg-card/50 hover:border-border/80'}"
					>
						<Card.Content class="flex flex-col items-center gap-2 p-0">
							<Swords
								class="h-9 w-9 transition-colors {selectedMode === 'crisis'
									? 'text-red-600'
									: 'text-muted-foreground group-hover:text-red-600'}"
							/>
							<span class="text-base font-semibold text-foreground">危机推演</span>
							<span class="text-xs text-muted-foreground">战棋模拟 &middot; 行军作战</span>
						</Card.Content>
					</Card.Root>
				</button>

				<!-- 模拟大会（不可用） -->
				<Card.Root class="w-48 cursor-not-allowed items-center gap-2 bg-card/30 p-5 opacity-50">
					<Card.Content class="flex flex-col items-center gap-2 p-0">
						<Users class="h-9 w-9 text-muted-foreground" />
						<span class="text-base font-semibold text-muted-foreground">模拟大会</span>
						<span class="text-xs text-muted-foreground">敬请期待</span>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- 战局管理 -->
		{#if selectedMode === 'crisis'}
			<div
				class="flex w-full max-w-lg flex-col gap-4"
				in:fly={{ y: 24, duration: 350, opacity: 0 }}
			>
				<h2 class="text-2xl font-semibold text-foreground">战局管理</h2>

				<!-- 搜索 + 新建 -->
				<div class="flex gap-3">
					<InputGroup.Root class="flex w-full">
						<InputGroup.Input bind:value={query} placeholder="搜索战局..." />
						<InputGroup.Addon>
							<Search class="h-4 w-4" />
						</InputGroup.Addon>
						{#if query.trim()}
							<InputGroup.Addon align="inline-end" class="text-xs text-muted-foreground">
								{filteredBattles.length} 条
							</InputGroup.Addon>
						{/if}
					</InputGroup.Root>

					<Button onclick={() => (dialogOpen = true)} class="gap-2">
						<Plus size={16} />
						新建
					</Button>
				</div>

				<!-- 战局列表 -->
				<ScrollArea class="h-64 w-full rounded-xl">
					<div class="flex flex-col gap-2 pr-3">
						{#if filteredBattles.length === 0}
							<Card.Root class="border-dashed bg-card/30 px-6 py-12 text-center shadow-none">
								<Card.Content class="p-0">
									{#if query.trim() && $battles.length > 0}
										<p class="text-muted-foreground">未找到匹配的战局</p>
										<p class="mt-1 text-sm text-muted-foreground/70">试试其他关键词？</p>
									{:else}
										<p class="text-muted-foreground">暂无已保存的战局</p>
										<p class="mt-1 text-sm text-muted-foreground/70">创建一个新战局开始推演</p>
									{/if}
								</Card.Content>
							</Card.Root>
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

	<Footer />
</div>

<!-- 浮动操作按钮 -->
<div class="fixed right-6 bottom-6 z-20 flex flex-col gap-3">
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					type="button"
					variant="outline"
					size="icon"
					class="h-12 w-12 rounded-full shadow-md backdrop-blur-sm"
					onclick={() => goto('/help')}
				>
					<CircleHelp size={20} />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="left">帮助</Tooltip.Content>
	</Tooltip.Root>

	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					type="button"
					variant="outline"
					size="icon"
					class="h-12 w-12 rounded-full shadow-md backdrop-blur-sm"
					onclick={() => goto('/settings')}
				>
					<Settings size={20} />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="left">设置</Tooltip.Content>
	</Tooltip.Root>
</div>
</Tooltip.Provider>

<!-- 新建战局 Dialog -->
<CreateBattleDialog bind:open={dialogOpen} />
