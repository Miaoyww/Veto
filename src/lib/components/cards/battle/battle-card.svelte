<script lang="ts">
	import { goto } from '$app/navigation';
	import { Trash2, Play } from '@lucide/svelte';
	import type { Battle } from '$lib/types';
	import { currentBattleId, loadBattle, deleteBattle } from '$lib/stores/battle-store';
	import { showConfirm } from '$lib/stores/alert-dialog-store';

	let { battle }: { battle: Battle } = $props();

	function handleLoad() {
		loadBattle(battle.id);
		goto(`/crisis/${battle.id}`);
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		showConfirm('确认删除', `将永久删除战局「${battle.name}」，此操作无法撤销。是否继续？`, () =>
			deleteBattle(battle.id)
		);
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleString('zh-CN');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	role="button"
	tabindex="0"
	class="group flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white/60 px-5 py-4 text-left shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-md {$currentBattleId ===
	battle.id
		? 'border-stone-500 bg-white/80'
		: 'border-stone-200'}"
	onclick={handleLoad}
	onkeydown={(e) => e.key === 'Enter' && handleLoad()}
>
	<div class="min-w-0 flex-1">
		<div class="text-sm font-semibold text-stone-700">{battle.name}</div>
		<div class="mt-1 flex gap-2 text-xs text-stone-400">
			<span>{battle.factions.length} 个阵营</span>
			<span>·</span>
			<span>{battle.placedUnits.length} 个单位</span>
			<span>·</span>
			<span>{formatDate(battle.updatedAt)}</span>
		</div>
	</div>
	<div class="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
		<span
			class="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"
		>
			<Play size={12} />
			进入
		</span>
		<button
			class="flex items-center rounded-lg px-2 py-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
			title="删除战局"
			onclick={handleDelete}
		>
			<Trash2 size={14} />
		</button>
	</div>
</div>
