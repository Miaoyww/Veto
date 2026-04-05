<script lang="ts">
	import { Puzzle } from '@lucide/svelte';
	import { registry, registryRevision } from '$lib/registry/mod-registry';
	import ModCard from '$lib/components/cards/settings/mod-card.svelte';

	let rev = $state(0);
	$effect(() => registryRevision.subscribe((v) => { rev = v; }));

	const modList = $derived.by(() => { void rev; return registry.getModList(); });
	const userMods = $derived(modList.filter((m) => m.source === 'user'));
	const systemMods = $derived(modList.filter((m) => m.source === 'system'));
</script>

<div class="space-y-4">
	<!-- 系统 Mod -->
	{#if systemMods.length > 0}
		<div>
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				系统内置
			</p>
			<div class="flex flex-col gap-2">
				{#each systemMods as entry (entry.mod.id)}
				<ModCard {entry} ontoggle={() => {}} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- 用户 Mod -->
	{#if userMods.length > 0}
		<div>
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				用户安装
			</p>
			<div class="flex flex-col gap-2">
				{#each userMods as entry (entry.mod.id)}
				<ModCard {entry} ontoggle={() => {}} />
				{/each}
			</div>
		</div>
	{/if}

	{#if modList.length === 0}
		<div
			class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 py-16 text-stone-400 dark:border-stone-700 dark:text-stone-500"
		>
			<Puzzle size={32} class="opacity-40" />
			<span class="text-sm">暂无任何 Mod</span>
		</div>
	{/if}
</div>
