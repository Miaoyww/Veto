<script lang="ts">
	import { currentFactionId, selectFaction, removeFaction } from '$lib/stores/battle-store';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from '@lucide/svelte';
	import type { Faction } from '$lib/types';

	let { faction }: { faction: Faction } = $props();
</script>

<div
	class="group flex items-center justify-between gap-2 rounded-lg border px-2 py-2 transition-all"
	class:border-primary={$currentFactionId === faction.id}
	class:bg-muted={$currentFactionId === faction.id}
>
	<Button
		type="button"
		variant="ghost"
		class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
		title={$currentFactionId === faction.id ? '点击取消选择' : '点击选择阵营'}
		onclick={() => selectFaction(faction.id)}
	>
		<span
			class="h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
			style:background-color={faction.color}
		></span>
		<span class="truncate text-sm font-medium">{faction.name}</span>
	</Button>
	<Button
		type="button"
		variant="ghost"
		size="icon"
		class="h-7 w-7 text-muted-foreground hover:text-destructive"
		title="删除阵营"
		onclick={(e: MouseEvent) => {
			e.stopPropagation();
			removeFaction(faction.id);
		}}
	>
		<Trash2 class="h-4 w-4" />
	</Button>
</div>
