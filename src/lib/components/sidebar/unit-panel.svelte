<script lang="ts">
	import {
		currentBattle,
		currentFaction,
		currentFactionId,
		currentBranch,
		addUnit,
		removeUnit,
		updateUnit,
		updateFaction,
		interactionMode,
		pendingPlaceUnitId
	} from '$lib/stores/battle-store';
	import type {
		ArmyUnit,
		NavyUnit,
		AirForceUnit,
		MilitaryUnit,
		ArmyInfantryType,
		InfantryQuality,
		ArmyArmorType,
		ArmorQuality,
		ArmyMissileType,
		MissileQuality,
		NavySurfaceType,
		NavalQuality,
		NavySubmarineType,
		SubmarineQuality,
		NavySupportType,
		NavalSupportQuality,
		AirForceFighterType,
		FighterQuality,
		AirForceBomberType,
		BomberQuality,
		AirForceSupportType,
		AirSupportQuality,
		Branch
	} from '$lib/types';
	import {
		BRANCH_LABELS,
		INFANTRY_TYPE_LABELS,
		INFANTRY_QUALITY_LABELS,
		ARMOR_TYPE_LABELS,
		ARMOR_QUALITY_LABELS,
		MISSILE_TYPE_LABELS,
		MISSILE_QUALITY_LABELS,
		SURFACE_TYPE_LABELS,
		NAVAL_QUALITY_LABELS,
		SUBMARINE_TYPE_LABELS,
		SUBMARINE_QUALITY_LABELS,
		NAVAL_SUPPORT_TYPE_LABELS,
		NAVAL_SUPPORT_QUALITY_LABELS,
		FIGHTER_TYPE_LABELS,
		FIGHTER_QUALITY_LABELS,
		BOMBER_TYPE_LABELS,
		BOMBER_QUALITY_LABELS,
		AIR_SUPPORT_TYPE_LABELS,
		AIR_SUPPORT_QUALITY_LABELS
	} from '$lib/types';
	import {
		Trash2,
		MapPin,
		ChevronDown,
		ChevronRight,
		Plus,
		X,
		Swords,
		Users,
		Shield,
		Rocket,
		Ship,
		Waves,
		Anchor,
		Plane,
		Bomb,
		Radio,
		Crosshair,
		Pencil,
		Check
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import UnitCompRow from '$lib/components/cards/units/unit-comp-row.svelte';
	import BranchSelector from '$lib/components/buttons/branch-selector.svelte';
	import { mapFlyTo } from '$lib/stores/map-store';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	// 编辑状态
	let editingUnitId = $state<string | null>(null);
	let newUnitName = $state('');

	// 阵营信息编辑
	let editingFaction = $state(false);
	let factionEditName = $state('');
	let factionEditColor = $state('');

	function startEditFaction() {
		if (!$currentFaction) return;
		factionEditName = $currentFaction.name;
		factionEditColor = $currentFaction.color;
		editingFaction = true;
	}

	function saveEditFaction() {
		if (!$currentFactionId) return;
		const name = factionEditName.trim();
		if (!name) return;
		updateFaction($currentFactionId, { name, color: factionEditColor });
		editingFaction = false;
	}

	$effect(() => {
		// 切换阵营时关闭编辑
		$currentFactionId;
		editingFaction = false;
	});

	// 陆军添加表单
	let armyInfantryType = $state<ArmyInfantryType>('light');
	let armyInfantryQuality = $state<InfantryQuality>('basic');
	let armyInfantryCount = $state(1000);

	let armyArmorType = $state<ArmyArmorType>('light_tank');
	let armyArmorQuality = $state<ArmorQuality>('gen1');
	let armyArmorCount = $state(50);

	let armyMissileType = $state<ArmyMissileType>('anti_tank');
	let armyMissileQuality = $state<MissileQuality>('basic');
	let armyMissileCount = $state(20);

	// 海军添加表单
	let navySurfaceType = $state<NavySurfaceType>('destroyer');
	let navySurfaceQuality = $state<NavalQuality>('basic');
	let navySurfaceCount = $state(2);

	let navySubType = $state<NavySubmarineType>('attack_sub');
	let navySubQuality = $state<SubmarineQuality>('basic');
	let navySubCount = $state(1);

	let navySupportType = $state<NavySupportType>('amphibious');
	let navySupportQuality = $state<NavalSupportQuality>('basic');
	let navySupportCount = $state(1);

	// 空军添加表单
	let airFighterType = $state<AirForceFighterType>('air_superiority');
	let airFighterQuality = $state<FighterQuality>('gen4');
	let airFighterCount = $state(12);

	let airBomberType = $state<AirForceBomberType>('strategic');
	let airBomberQuality = $state<BomberQuality>('basic');
	let airBomberCount = $state(4);

	let airSupportType = $state<AirForceSupportType>('awacs');
	let airSupportQuality = $state<AirSupportQuality>('basic');
	let airSupportCount = $state(2);

	// ============ 辅助函数 ============
	function genId() {
		return crypto.randomUUID();
	}

	// 获取当前编辑的单位
	let editingUnit = $derived.by(() => {
		if (!editingUnitId || !$currentFaction) return null;
		return $currentFaction.units.find((u) => u.id === editingUnitId) ?? null;
	});

	// 快速创建空单位
	function quickCreateUnit() {
		const name = newUnitName.trim();
		if (!name || !$currentFactionId) return;
		const id = genId();
		let unit: MilitaryUnit;
		switch ($currentBranch) {
			case 'army':
				unit = { id, name, branch: 'army', infantry: [], armor: [], missiles: [] };
				break;
			case 'navy':
				unit = { id, name, branch: 'navy', surface: [], submarines: [], support: [] };
				break;
			case 'air_force':
				unit = { id, name, branch: 'air_force', fighters: [], bombers: [], support: [] };
				break;
		}
		addUnit($currentFactionId, unit);
		editingUnitId = id;
		newUnitName = '';
	}

	function toggleEdit(unitId: string) {
		editingUnitId = editingUnitId === unitId ? null : unitId;
	}

	// ============ 添加组件到单位 ============
	function addInfantryComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'army') return u;
			return {
				...u,
				infantry: [
					...u.infantry,
					{
						id: genId(),
						type: armyInfantryType,
						quality: armyInfantryQuality,
						count: armyInfantryCount
					}
				]
			};
		});
	}

	function addArmorComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'army') return u;
			return {
				...u,
				armor: [
					...u.armor,
					{ id: genId(), type: armyArmorType, quality: armyArmorQuality, count: armyArmorCount }
				]
			};
		});
	}

	function addMissileComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'army') return u;
			return {
				...u,
				missiles: [
					...u.missiles,
					{
						id: genId(),
						type: armyMissileType,
						quality: armyMissileQuality,
						count: armyMissileCount
					}
				]
			};
		});
	}

	function addSurfaceComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return {
				...u,
				surface: [
					...u.surface,
					{
						id: genId(),
						type: navySurfaceType,
						quality: navySurfaceQuality,
						count: navySurfaceCount
					}
				]
			};
		});
	}

	function addSubComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return {
				...u,
				submarines: [
					...u.submarines,
					{ id: genId(), type: navySubType, quality: navySubQuality, count: navySubCount }
				]
			};
		});
	}

	function addNavSupportComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return {
				...u,
				support: [
					...u.support,
					{
						id: genId(),
						type: navySupportType,
						quality: navySupportQuality,
						count: navySupportCount
					}
				]
			};
		});
	}

	function addFighterComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return {
				...u,
				fighters: [
					...u.fighters,
					{ id: genId(), type: airFighterType, quality: airFighterQuality, count: airFighterCount }
				]
			};
		});
	}

	function addBomberComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return {
				...u,
				bombers: [
					...u.bombers,
					{ id: genId(), type: airBomberType, quality: airBomberQuality, count: airBomberCount }
				]
			};
		});
	}

	function addAirSupportComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return {
				...u,
				support: [
					...u.support,
					{ id: genId(), type: airSupportType, quality: airSupportQuality, count: airSupportCount }
				]
			};
		});
	}

	function removeComponent(compId: string) {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			switch (u.branch) {
				case 'army':
					return {
						...u,
						infantry: u.infantry.filter((c) => c.id !== compId),
						armor: u.armor.filter((c) => c.id !== compId),
						missiles: u.missiles.filter((c) => c.id !== compId)
					};
				case 'navy':
					return {
						...u,
						surface: u.surface.filter((c) => c.id !== compId),
						submarines: u.submarines.filter((c) => c.id !== compId),
						support: u.support.filter((c) => c.id !== compId)
					};
				case 'air_force':
					return {
						...u,
						fighters: u.fighters.filter((c) => c.id !== compId),
						bombers: u.bombers.filter((c) => c.id !== compId),
						support: u.support.filter((c) => c.id !== compId)
					};
			}
		});
	}

	// 定位到当前军种已放置单位
	function locateBranch() {
		const battle = $currentBattle;
		const faction = $currentFaction;
		if (!battle || !faction) return;
		const branchUnitIds = new Set(
			faction.units.filter((u) => u.branch === $currentBranch).map((u) => u.id)
		);
		const placed = battle.placedUnits.find(
			(p) => p.factionId === faction.id && branchUnitIds.has(p.unitId)
		);
		if (placed) mapFlyTo.set({ lat: placed.lat, lng: placed.lng });
	}

	// 在地图上放置单位
	function handlePlaceUnit(unitId: string) {
		pendingPlaceUnitId.set(unitId);
		interactionMode.set('place');
	}
</script>

<Card
	class="absolute z-[100] h-full w-[24rem] gap-0 border-border/70 bg-background/75 py-0 shadow-xl backdrop-blur-md"
>
	<CardHeader class="border-b px-5 py-4">
		<CardTitle class="flex items-center gap-2 text-sm font-semibold tracking-wide">
			<Swords class="size-4" />军事单位
		</CardTitle>

		{#if $currentFaction}
			{#if editingFaction}
				<!-- 编辑模式 -->
				<div class="mt-2 space-y-2">
					<div class="flex items-center gap-2">
						<div
							class="h-4 w-4 shrink-0 rounded-full ring-2 ring-background"
							style:background-color={factionEditColor}
						></div>
						<Input
							class="h-7 flex-1 text-xs"
							bind:value={factionEditName}
							placeholder="阵营名称"
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter') saveEditFaction();
								if (e.key === 'Escape') editingFaction = false;
							}}
						/>
					</div>
					<div class="flex items-center gap-2">
						<Label class="shrink-0 text-xs text-muted-foreground">颜色</Label>
						<input
							type="color"
							bind:value={factionEditColor}
							class="h-7 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
						/>
						<div class="ml-auto flex gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								class="h-7 px-2 text-xs text-muted-foreground"
								onclick={() => (editingFaction = false)}
							>
								<X class="mr-1 size-3" />取消
							</Button>
							<Button
								size="sm"
								class="h-7 px-2 text-xs"
								onclick={saveEditFaction}
								disabled={!factionEditName.trim()}
							>
								<Check class="mr-1 size-3" />保存
							</Button>
						</div>
					</div>
				</div>
			{:else}
				<!-- 展示模式 -->
				<div class="mt-1.5 flex items-center justify-between">
					<div class="flex min-w-0 items-center gap-2">
						<span
							class="h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
							style:background-color={$currentFaction.color}
						></span>
						<span class="truncate text-xs text-muted-foreground">{$currentFaction.name}</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						class="size-6 shrink-0 text-muted-foreground hover:text-foreground"
						title="编辑阵营信息"
						onclick={startEditFaction}
					>
						<Pencil class="size-3" />
					</Button>
				</div>
			{/if}
		{:else}
			<CardDescription class="text-xs text-muted-foreground">部署军事单位</CardDescription>
		{/if}
	</CardHeader>
	<CardContent class="sidebar-body overflow-y-auto px-4 py-4">
		<div class="space-y-3">
			<div class="space-y-2">
				{#if !$currentFaction}
					<p class="py-4 text-center text-xs text-muted-foreground">请先选择阵营</p>
				{:else}
					<!-- 军种选择 -->
					<BranchSelector
						value={$currentBranch}
						onchange={(b) => {
							currentBranch.set(b);
							editingUnitId = null;
						}}
					/>
					<!-- 快速创建 -->
					<div class="flex gap-2">
						<Input
							class="h-8 flex-1 text-sm"
							placeholder="输入单位名称"
							bind:value={newUnitName}
							onkeydown={(e) => {
								if (e.key === 'Enter') quickCreateUnit();
							}}
						/>
						<Button size="sm" onclick={quickCreateUnit} disabled={!newUnitName.trim()}>
							<Plus />创建
						</Button>
					</div>

					<!-- 已有单位列表 -->
					<ScrollArea class="h-36">
						<div class="flex flex-col gap-0.5 pr-2">
							{#each $currentFaction.units.filter((u) => u.branch === $currentBranch) as unit (unit.id)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors
							{editingUnitId === unit.id ? 'bg-muted' : 'hover:bg-muted/60'}"
									onclick={() => toggleEdit(unit.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') toggleEdit(unit.id);
									}}
									role="button"
									tabindex="0"
								>
									<div class="flex min-w-0 flex-1 items-center gap-1.5">
										{#if editingUnitId === unit.id}
											<ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
										{:else}
											<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
										{/if}
										<span class="truncate">{unit.name}</span>
									</div>
									<div class="flex shrink-0 gap-0.5">
										{#each [$currentBattle?.placedUnits.find((p) => p.unitId === unit.id && p.factionId === $currentFactionId)] as placed}
											{#if placed}
												<Button
													variant="ghost"
													size="icon-sm"
													title="定位到地图"
													class="size-6 text-muted-foreground hover:text-blue-500"
													onclick={(e) => {
														e.stopPropagation();
														mapFlyTo.set({ lat: placed.lat, lng: placed.lng });
													}}
												>
													<Crosshair class="size-3.5" />
												</Button>
											{/if}
										{/each}
										<Button
											variant="ghost"
											size="icon-sm"
											title="放置到地图"
											class="size-6 text-muted-foreground hover:text-green-600"
											onclick={(e) => {
												e.stopPropagation();
												handlePlaceUnit(unit.id);
											}}
										>
											<MapPin class="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											title="删除"
											class="size-6 text-muted-foreground hover:text-destructive"
											onclick={(e) => {
												e.stopPropagation();
												removeUnit($currentFactionId!, unit.id);
												if (editingUnitId === unit.id) editingUnitId = null;
											}}
										>
											<Trash2 class="size-3.5" />
										</Button>
									</div>
								</div>
							{/each}
							{#if $currentFaction.units.filter((u) => u.branch === $currentBranch).length === 0}
								<p class="py-4 text-center text-xs text-muted-foreground">
									暂无单位，输入名称快速创建
								</p>
							{/if}
						</div>
					</ScrollArea>

					<!-- 编辑面板：选中单位后展开 -->
					{#if editingUnit}
						<Separator />

						<div>
							<div class="flex flex-col gap-3">
								<p class="text-xs font-semibold">编辑：{editingUnit.name}</p>

								{#if editingUnit.branch === 'army'}
									{@const army = editingUnit as ArmyUnit}

									<!-- 步兵 -->
									<div class="flex w-[20rem] flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Users class="size-3.5" />步兵
										</p>
										{#each army.infantry as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{INFANTRY_TYPE_LABELS[comp.type]} · {INFANTRY_QUALITY_LABELS[
														comp.quality
													]}
													× {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={armyInfantryType}
											typeItems={INFANTRY_TYPE_LABELS}
											bind:qualityValue={armyInfantryQuality}
											qualityItems={INFANTRY_QUALITY_LABELS}
											bind:count={armyInfantryCount}
											max={10000}
											onAdd={addInfantryComp}
										/>
									</div>

									<!-- 装甲 -->
									<div class="flex w-[20rem] flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Shield class="size-3.5" />装甲
										</p>
										{#each army.armor as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{ARMOR_TYPE_LABELS[comp.type]} · {ARMOR_QUALITY_LABELS[comp.quality]} ×
													{comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={armyArmorType}
											typeItems={ARMOR_TYPE_LABELS}
											bind:qualityValue={armyArmorQuality}
											qualityItems={ARMOR_QUALITY_LABELS}
											bind:count={armyArmorCount}
											max={1000}
											onAdd={addArmorComp}
										/>
									</div>

									<!-- 导弹 -->
									<div class="flex w-[20rem] flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Rocket class="size-3.5" />导弹
										</p>
										{#each army.missiles as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{MISSILE_TYPE_LABELS[comp.type]} · {MISSILE_QUALITY_LABELS[comp.quality]}
													×
													{comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={armyMissileType}
											typeItems={MISSILE_TYPE_LABELS}
											bind:qualityValue={armyMissileQuality}
											qualityItems={MISSILE_QUALITY_LABELS}
											bind:count={armyMissileCount}
											max={500}
											onAdd={addMissileComp}
										/>
									</div>
								{:else if editingUnit.branch === 'navy'}
									{@const navy = editingUnit as NavyUnit}

									<!-- 水面舰艇 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Ship class="size-3.5" />水面舰艇
										</p>
										{#each navy.surface as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{SURFACE_TYPE_LABELS[comp.type]} · {NAVAL_QUALITY_LABELS[comp.quality]}
													× {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={navySurfaceType}
											typeItems={SURFACE_TYPE_LABELS}
											bind:qualityValue={navySurfaceQuality}
											qualityItems={NAVAL_QUALITY_LABELS}
											bind:count={navySurfaceCount}
											max={20}
											onAdd={addSurfaceComp}
										/>
									</div>

									<!-- 潜艇 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Waves class="size-3.5" />潜艇
										</p>
										{#each navy.submarines as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{SUBMARINE_TYPE_LABELS[comp.type]} · {SUBMARINE_QUALITY_LABELS[
														comp.quality
													]} × {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={navySubType}
											typeItems={SUBMARINE_TYPE_LABELS}
											bind:qualityValue={navySubQuality}
											qualityItems={SUBMARINE_QUALITY_LABELS}
											bind:count={navySubCount}
											max={15}
											onAdd={addSubComp}
										/>
									</div>

									<!-- 支援舰艇 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Anchor class="size-3.5" />支援舰艇
										</p>
										{#each navy.support as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{NAVAL_SUPPORT_TYPE_LABELS[comp.type]} · {NAVAL_SUPPORT_QUALITY_LABELS[
														comp.quality
													]} × {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={navySupportType}
											typeItems={NAVAL_SUPPORT_TYPE_LABELS}
											bind:qualityValue={navySupportQuality}
											qualityItems={NAVAL_SUPPORT_QUALITY_LABELS}
											bind:count={navySupportCount}
											max={10}
											onAdd={addNavSupportComp}
										/>
									</div>
								{:else if editingUnit.branch === 'air_force'}
									{@const air = editingUnit as AirForceUnit}

									<!-- 战斗机 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Plane class="size-3.5" />战斗机
										</p>
										{#each air.fighters as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{FIGHTER_TYPE_LABELS[comp.type]} · {FIGHTER_QUALITY_LABELS[comp.quality]}
													×
													{comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={airFighterType}
											typeItems={FIGHTER_TYPE_LABELS}
											bind:qualityValue={airFighterQuality}
											qualityItems={FIGHTER_QUALITY_LABELS}
											bind:count={airFighterCount}
											max={50}
											onAdd={addFighterComp}
										/>
									</div>

									<!-- 轰炸机 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Bomb class="size-3.5" />轰炸机
										</p>
										{#each air.bombers as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{BOMBER_TYPE_LABELS[comp.type]} · {BOMBER_QUALITY_LABELS[comp.quality]}
													× {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={airBomberType}
											typeItems={BOMBER_TYPE_LABELS}
											bind:qualityValue={airBomberQuality}
											qualityItems={BOMBER_QUALITY_LABELS}
											bind:count={airBomberCount}
											max={20}
											onAdd={addBomberComp}
										/>
									</div>

									<!-- 支援飞机 -->
									<div class="flex flex-col gap-1.5">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<Radio class="size-3.5" />支援飞机
										</p>
										{#each air.support as comp (comp.id)}
											<div
												class="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
											>
												<span
													>{AIR_SUPPORT_TYPE_LABELS[comp.type]} · {AIR_SUPPORT_QUALITY_LABELS[
														comp.quality
													]}
													× {comp.count}</span
												>
												<Button
													variant="ghost"
													size="icon-xs"
													class="size-5 text-muted-foreground hover:text-destructive"
													onclick={() => removeComponent(comp.id)}
												>
													<X class="size-3" />
												</Button>
											</div>
										{/each}
										<UnitCompRow
											bind:typeValue={airSupportType}
											typeItems={AIR_SUPPORT_TYPE_LABELS}
											bind:qualityValue={airSupportQuality}
											qualityItems={AIR_SUPPORT_QUALITY_LABELS}
											bind:count={airSupportCount}
											max={15}
											onAdd={addAirSupportComp}
										/>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</CardContent>
</Card>
