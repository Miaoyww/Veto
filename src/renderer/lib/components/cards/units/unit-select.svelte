<script lang="ts">
	import * as Select from '$lib/components/ui/select';

	let {
		value = $bindable<string>(),
		items,
		label
	}: {
		value: string;
		items: Record<string, string>;
		label?: string;
	} = $props();
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger size="sm" class="h-7 flex-1 text-xs">
		{items[value] ?? value}
	</Select.Trigger>
	<Select.Content class="z-[1001]">
		<Select.Group>
			{#if label}
				<Select.Label>{label}</Select.Label>
			{/if}
			{#each Object.entries(items) as [v, l] (v)}
				<Select.Item value={v} label={l}>{l}</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
