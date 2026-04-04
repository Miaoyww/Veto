<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { Eye, LocateFixed, Route, ArrowRightLeft, Target, Activity, Trash2, Check } from '@lucide/svelte';
	import { UNIT_STATUS_LABELS } from '$lib/types';
	import type { PlacedUnit } from '$lib/types';
	import { currentBattle, selectedPlacedUnitId } from '$lib/stores/battle-store';

	interface Props {
		open: boolean;
		virtualAnchor: any;
		contextUnitId: string | null;
		onviewproperties?: () => void;
		onlocateunit?: () => void;
		ondrawroute?: () => void;
		onclearroute?: () => void;
		onsetstrike?: () => void;
		onsetstatus?: (status: PlacedUnit['status']) => void;
		ondelete?: () => void;
	}

	let {
		open = $bindable(false),
		virtualAnchor,
		contextUnitId,
		onviewproperties,
		onlocateunit,
		ondrawroute,
		onclearroute,
		onsetstrike,
		onsetstatus,
		ondelete
	}: Props = $props();

	const STATUS_LIST = ['idle', 'moving', 'attacking', 'defending', 'retreating'] as const;

	let currentStatus = $derived(
		$currentBattle?.placedUnits.find((u) => u.id === (contextUnitId || $selectedPlacedUnitId))?.status
	);

	let hasUnit = $derived(!!(contextUnitId || $selectedPlacedUnitId));

	function getOpen() {
		return open;
	}

	function setOpen(v: boolean) {
		open = v;
	}
</script>

<ContextMenu.Root bind:open={getOpen, setOpen}>
	<ContextMenu.Portal>
		<ContextMenu.Content
			class="absolute z-[9999] w-[220px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
			customAnchor={virtualAnchor}
		>
			{#if hasUnit}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={onviewproperties}
				>
					<Eye class="mr-2 size-4" />
					查看属性
				</ContextMenu.Item>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={onlocateunit}
				>
					<LocateFixed class="mr-2 size-4" />
					定位单位
				</ContextMenu.Item>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={ondrawroute}
				>
					<Route class="mr-2 size-4" />
					绘制行动路线
				</ContextMenu.Item>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={onclearroute}
				>
					<ArrowRightLeft class="mr-2 size-4" />
					清除路线
				</ContextMenu.Item>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={onsetstrike}
				>
					<Target class="mr-2 size-4" />
					设置打击目标
				</ContextMenu.Item>

				<!-- 设置状态子菜单 -->
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-medium select-none focus-visible:outline-none data-highlighted:bg-muted data-[state=open]:bg-muted"
					>
						<Activity class="mr-2 size-4" />
						设置状态
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent
						class="z-100 w-[160px] rounded-xl border border-muted bg-background px-1 py-1.5 ring-0! shadow-popover ring-transparent!"
						sideOffset={10}
					>
						{#each STATUS_LIST as status}
							<ContextMenu.Item
								class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none focus-visible:outline-none data-highlighted:bg-muted"
								onSelect={() => onsetstatus?.(status)}
							>
								<Check class="mr-2 size-4 {currentStatus === status ? 'opacity-100' : 'opacity-0'}" />
								{UNIT_STATUS_LABELS[status]}
							</ContextMenu.Item>
						{/each}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>

				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal text-red-500 select-none focus-visible:outline-none data-highlighted:bg-muted"
					onSelect={ondelete}
				>
					<Trash2 class="mr-2 size-4" />
					删除单位
				</ContextMenu.Item>
			{:else}
				<ContextMenu.Item
					class="rounded-button flex h-9 items-center py-3 pr-1.5 pl-3 text-sm font-normal select-none opacity-50 focus-visible:outline-none"
					disabled
				>
					右键单位查看更多操作
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
