<script lang="ts">
	import { Tabs } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { Crosshair } from '@lucide/svelte';
	import type { Branch } from '$lib/types';
	import { BRANCH_LABELS } from '$lib/types';
	import { cn } from '$lib/utils';

	const BRANCHES: Branch[] = ['army', 'navy', 'air_force'];

	let {
		value,
		onchange,
	}: {
		value: Branch;
		onchange: (branch: Branch) => void;
	} = $props();
</script>

<div class="flex items-center gap-1.5">
	<Tabs.Root {value} onValueChange={(v) => onchange(v as Branch)} class="flex-1">
		<Tabs.List class="flex h-8 w-full rounded-lg bg-muted p-1" aria-label="军种选择">
			{#each BRANCHES as branch (branch)}
				<Tabs.Trigger
					value={branch}
					class={cn(
						'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
						'text-muted-foreground hover:text-foreground',
						'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
					)}
				>
					{BRANCH_LABELS[branch]}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>
</div>
