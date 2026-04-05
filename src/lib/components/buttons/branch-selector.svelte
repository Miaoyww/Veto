<script lang="ts">
	import { Tabs } from 'bits-ui';
	import { registry, registryRevision } from '$lib/registry/mod-registry';
	import { cn } from '$lib/utils';

	let {
		value,
		onchange,
		orientation = 'horizontal'
	}: {
		value: string;
		onchange: (branchId: string) => void;
		orientation?: 'horizontal' | 'vertical';
	} = $props();

	// 桥接 writable store → 本地 $state，供 $derived 追踪
	let rev = $state(0);
	$effect(() => registryRevision.subscribe((v) => { rev = v; }));

	// 从注册表动态获取所有军种，响应 Mod 切换
	const branches = $derived.by(() => {
		void rev;
		return [...registry.branches.values()];
	});

	console.log('BranchSelector: branches updated', branches);
</script>

<Tabs.Root
	{value}
	onValueChange={(v) => onchange(v)}
	class={cn(
		orientation === 'vertical' ? 'flex-col' : 'flex-row',
		'flex items-stretch'
	)}
>
	<Tabs.List
		class={cn(
			'flex rounded-lg bg-muted p-1',
			orientation === 'vertical' ? 'h-auto w-full flex-col gap-0.5' : 'h-8 w-full flex-row'
		)}
		aria-label="军种选择"
	>
		{#each branches as branch (branch.id)}
			<Tabs.Trigger
				value={branch.id}
				class={cn(
					'rounded-md px-2 py-1 text-xs font-medium transition-colors',
					'text-muted-foreground hover:text-foreground',
					'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
					orientation === 'vertical' ? 'w-full text-left' : 'flex-1'
				)}
			>
				{registry.getLabel('branch.' + branch.id, branch.id)}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
