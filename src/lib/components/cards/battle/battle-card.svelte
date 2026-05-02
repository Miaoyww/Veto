<script lang="ts">
	import { goto } from '$app/navigation';
	import { Trash2, Play, Pencil, Check, X, CalendarDays, Clock, Zap } from '@lucide/svelte';
	import type { Battle } from '$lib/types';
	import { currentBattleId, loadBattle, deleteBattle, renameBattle } from '$lib/stores/battle/battle-store';
	import { showConfirm } from '$lib/stores/global-ui-store';
	import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { battle }: { battle: Battle } = $props();

	let editing = $state(false);
	let editName = $state(battle.name);
	let inputRef = $state<HTMLInputElement | null>(null);

	const isActive = $derived($currentBattleId === battle.id);
	const enabledEvents = $derived((battle.eventSettings ?? []).filter((e) => e.enabled).length);

	function handleLoad() {
		if (editing) return;
		loadBattle(battle.id);
		goto(`/battle/${battle.id}`);
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		showConfirm('确认删除', `将永久删除战局「${battle.name}」，此操作无法撤销。是否继续？`, () =>
			deleteBattle(battle.id)
		);
	}

	function startEdit(e: MouseEvent) {
		e.stopPropagation();
		editName = battle.name;
		editing = true;
		setTimeout(() => inputRef?.focus(), 0);
	}

	function commitEdit() {
		if (editName.trim()) renameBattle(battle.id, editName);
		editing = false;
	}

	function cancelEdit() {
		editName = battle.name;
		editing = false;
	}

	function handleInputKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Enter') commitEdit();
		else if (e.key === 'Escape') cancelEdit();
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<Card
	role="button"
	tabindex={0}
	class="group w-full cursor-pointer gap-2 py-4 backdrop-blur-sm transition-all hover:shadow-md {isActive
			? 'border-stone-400 bg-card/90 dark:border-stone-500'
		: 'bg-card/70 hover:bg-card/90'}"
	onclick={handleLoad}
	onkeydown={(e) => e.key === 'Enter' && handleLoad()}
>
	<CardHeader class="px-5">
		<CardTitle class="flex min-w-0 items-center gap-1.5 text-sm">
			{#if editing}
				<Input
					bind:ref={inputRef}
					bind:value={editName}
					class="h-7 min-w-0 flex-1 text-sm font-semibold"
					onclick={(e: MouseEvent) => e.stopPropagation()}
					onkeydown={handleInputKeydown}
				/>
				<Button
					variant="ghost"
					size="icon-sm"
					class="shrink-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300"
					title="保存"
					onclick={(e: MouseEvent) => { e.stopPropagation(); commitEdit(); }}
				>
					<Check />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					class="shrink-0"
					title="取消"
					onclick={(e: MouseEvent) => { e.stopPropagation(); cancelEdit(); }}
				>
					<X />
				</Button>
			{:else}
				<span class="truncate font-semibold">{battle.name}</span>
				<Button
					variant="ghost"
					size="icon-sm"
					class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
					title="重命名"
					onclick={startEdit}
				>
					<Pencil />
				</Button>
			{/if}
		</CardTitle>

		<CardAction class="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
			<Button
				variant="outline"
				size="sm"
				class="gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
				onclick={(e: MouseEvent) => { e.stopPropagation(); handleLoad(); }}
			>
				<Play class="size-3" />
				进入
			</Button>
			<Button
				variant="destructive"
				size="icon-sm"
				title="删除战局"
				onclick={handleDelete}
			>
				<Trash2 />
			</Button>
		</CardAction>
	</CardHeader>

	<CardContent class="px-5">
		<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<CalendarDays class="size-3" />
				{formatDate(battle.createdAt)}
			</span>
			<span class="flex items-center gap-1">
				<Clock class="size-3" />
				{battle.startDate ?? '未设置模拟时间'}
			</span>
			<span class="flex items-center gap-1">
				<Zap class="size-3" />
				{enabledEvents} 个启用事件
			</span>
		</div>
	</CardContent>
</Card>
