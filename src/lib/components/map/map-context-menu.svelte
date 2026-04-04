<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { UserPlus } from '@lucide/svelte';
	import { currentBattle, currentFactionId } from '$lib/stores/battle-store';
	import { leftBarPinned } from '$lib/stores/sidebar-store';

	interface Props {
		open: boolean;
		virtualAnchor: any;
	}

	let {
		open = $bindable(false),
		virtualAnchor
	}: Props = $props();

	function getOpen() {
		return open;
	}

	function setOpen(v: boolean) {
		open = v;
	}

	function handleSelectFaction(factionId: string) {
		currentFactionId.set(factionId);
		leftBarPinned.set(true);
		open = false;
	}
</script>

<ContextMenu.Root bind:open={getOpen, setOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={virtualAnchor}
		>
			{#if $currentBattle && $currentBattle.factions.length > 0}
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						<UserPlus class="mr-2 size-4" />
						新建单位
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent
						class="z-[10000] w-[180px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
						sideOffset={10}
					>
						{#each $currentBattle.factions as faction (faction.id)}
							<ContextMenu.Item
								class="rounded-button flex h-9 items-center gap-2 py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
								onSelect={() => handleSelectFaction(faction.id)}
							>
								<span class="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style="background: {faction.color};"></span>
								{faction.name}
							</ContextMenu.Item>
						{/each}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
			{:else}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none opacity-50 focus-visible:outline-none"
					disabled
				>
					暂无阵营，请先创建阵营
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
