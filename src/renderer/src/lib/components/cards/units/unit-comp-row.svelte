<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import UnitSelect from './unit-select.svelte';

	let {
		typeValue = $bindable<string>(),
		typeItems,
		qualityValue = $bindable<string>(),
		qualityItems,
		count = $bindable(1),
		min = 1,
		max = 9999,
		onAdd
	}: {
		typeValue: string;
		typeItems: Record<string, string>;
		qualityValue: string;
		qualityItems: Record<string, string>;
		count: number;
		min?: number;
		max?: number;
		onAdd: () => void;
	} = $props();
</script>

<div class="flex items-center gap-1">
	<UnitSelect bind:value={typeValue} items={typeItems} label="类型" />
	<UnitSelect bind:value={qualityValue} items={qualityItems} label="质量" />
	<Input type="number" bind:value={count} {min} {max} class="h-7 w-20 shrink-0 text-xs" />
	<Button size="icon-sm" onclick={onAdd} class="size-7 shrink-0">
		<Plus class="size-3.5" />
	</Button>
</div>
