<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { Map, Puzzle, Settings, Info } from '@lucide/svelte';

	type Section = 'venue' | 'mods' | 'general' | 'about';

	interface NavItem {
		key: Section;
		label: string;
		icon: typeof Map;
	}

	const NAV_ITEMS: NavItem[] = [
		{ key: 'venue', label: '会场', icon: Map },
		{ key: 'mods', label: 'Mod 管理', icon: Puzzle },
		{ key: 'general', label: '常规', icon: Settings },
		{ key: 'about', label: '关于', icon: Info }
	];

	let {
		activeSection = $bindable<Section>('venue'),
		class: className = ''
	}: {
		activeSection?: Section;
		class?: string;
	} = $props();
</script>

<div class={cn('flex w-36 flex-col gap-1 rounded-lg p-2', className)}>
	{#each NAV_ITEMS as item}
		<Button
			class="w-full justify-start gap-2 px-3 cursor-pointer"
			variant={activeSection === item.key ? 'secondary' : 'ghost'}
			onclick={() => (activeSection = item.key)}
		>
			<item.icon size={15} />
			<span class="text-sm">{item.label}</span>
		</Button>
	{/each}
</div>
