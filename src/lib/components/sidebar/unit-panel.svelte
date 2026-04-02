<script lang="ts">
	import {
		currentBattle,
		currentFaction,
		currentFactionId,
		currentBranch,
		addUnit,
		removeUnit,
		updateUnit,
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
	import { Trash2, MapPin, ChevronDown, ChevronRight, Plus } from '@lucide/svelte';

	const branches: Branch[] = ['army', 'navy', 'air_force'];

	// 编辑状态
	let editingUnitId = $state<string | null>(null);
	let newUnitName = $state('');

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
			return { ...u, infantry: [...u.infantry, { id: genId(), type: armyInfantryType, quality: armyInfantryQuality, count: armyInfantryCount }] };
		});
	}

	function addArmorComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'army') return u;
			return { ...u, armor: [...u.armor, { id: genId(), type: armyArmorType, quality: armyArmorQuality, count: armyArmorCount }] };
		});
	}

	function addMissileComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'army') return u;
			return { ...u, missiles: [...u.missiles, { id: genId(), type: armyMissileType, quality: armyMissileQuality, count: armyMissileCount }] };
		});
	}

	function addSurfaceComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return { ...u, surface: [...u.surface, { id: genId(), type: navySurfaceType, quality: navySurfaceQuality, count: navySurfaceCount }] };
		});
	}

	function addSubComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return { ...u, submarines: [...u.submarines, { id: genId(), type: navySubType, quality: navySubQuality, count: navySubCount }] };
		});
	}

	function addNavSupportComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'navy') return u;
			return { ...u, support: [...u.support, { id: genId(), type: navySupportType, quality: navySupportQuality, count: navySupportCount }] };
		});
	}

	function addFighterComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return { ...u, fighters: [...u.fighters, { id: genId(), type: airFighterType, quality: airFighterQuality, count: airFighterCount }] };
		});
	}

	function addBomberComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return { ...u, bombers: [...u.bombers, { id: genId(), type: airBomberType, quality: airBomberQuality, count: airBomberCount }] };
		});
	}

	function addAirSupportComp() {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			if (u.branch !== 'air_force') return u;
			return { ...u, support: [...u.support, { id: genId(), type: airSupportType, quality: airSupportQuality, count: airSupportCount }] };
		});
	}

	function removeComponent(compId: string) {
		if (!$currentFactionId || !editingUnitId) return;
		updateUnit($currentFactionId, editingUnitId, (u) => {
			switch (u.branch) {
				case 'army':
					return { ...u, infantry: u.infantry.filter((c) => c.id !== compId), armor: u.armor.filter((c) => c.id !== compId), missiles: u.missiles.filter((c) => c.id !== compId) };
				case 'navy':
					return { ...u, surface: u.surface.filter((c) => c.id !== compId), submarines: u.submarines.filter((c) => c.id !== compId), support: u.support.filter((c) => c.id !== compId) };
				case 'air_force':
					return { ...u, fighters: u.fighters.filter((c) => c.id !== compId), bombers: u.bombers.filter((c) => c.id !== compId), support: u.support.filter((c) => c.id !== compId) };
			}
		});
	}

	// 在地图上放置单位
	function handlePlaceUnit(unitId: string) {
		pendingPlaceUnitId.set(unitId);
		interactionMode.set('place');
	}
</script>

<div class="panel-section">
	<div class="panel-title">
		<span class="icon">⚔️</span>
		<span>军事单位</span>
	</div>

	{#if !$currentFaction}
		<p class="empty-hint">请先选择阵营</p>
	{:else}
		<!-- 军种选择 -->
		<div class="branch-selector">
			{#each branches as branch (branch)}
				<button
					class="branch-btn"
					class:active={$currentBranch === branch}
					onclick={() => { currentBranch.set(branch); editingUnitId = null; }}
				>
					{BRANCH_LABELS[branch]}
				</button>
			{/each}
		</div>

		<!-- 快速创建 -->
		<div class="quick-create">
			<input
				type="text"
				bind:value={newUnitName}
				placeholder="输入单位名称"
				onkeydown={(e) => { if (e.key === 'Enter') quickCreateUnit(); }}
			/>
			<button class="quick-create-btn" onclick={quickCreateUnit} disabled={!newUnitName.trim()}>
				<Plus size={14} />
				<span>创建</span>
			</button>
		</div>

		<!-- 已有单位列表 -->
		<div class="unit-list">
			{#each $currentFaction.units.filter((u) => u.branch === $currentBranch) as unit (unit.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="unit-item" class:editing={editingUnitId === unit.id}>
					<div
						class="unit-header"
						onclick={() => toggleEdit(unit.id)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleEdit(unit.id); }}
						role="button"
						tabindex="0"
					>
						<div class="unit-info">
							{#if editingUnitId === unit.id}
								<ChevronDown size={14} />
							{:else}
								<ChevronRight size={14} />
							{/if}
							<span class="unit-name">{unit.name}</span>
						</div>
						<div class="unit-actions">
							<button class="unit-action-btn place" title="放置到地图"
								onclick={(e) => { e.stopPropagation(); handlePlaceUnit(unit.id); }}>
								<MapPin size={14} />
							</button>
							<button class="unit-action-btn delete" title="删除"
								onclick={(e) => { e.stopPropagation(); removeUnit($currentFactionId!, unit.id); if (editingUnitId === unit.id) editingUnitId = null; }}>
								<Trash2 size={14} />
							</button>
						</div>
					</div>
				</div>
			{/each}
			{#if $currentFaction.units.filter((u) => u.branch === $currentBranch).length === 0}
				<p class="empty-hint">暂无单位，输入名称快速创建</p>
			{/if}
		</div>

		<!-- 编辑面板：选中单位后展开 -->
		{#if editingUnit}
			<div class="edit-panel">
				<div class="edit-header">编辑: {editingUnit.name}</div>

				{#if editingUnit.branch === 'army'}
					{@const army = editingUnit as ArmyUnit}

					<div class="component-group">
						<div class="component-title">🪖 步兵</div>
						{#each army.infantry as comp (comp.id)}
							<div class="component-item">
								<span>{INFANTRY_TYPE_LABELS[comp.type]} · {INFANTRY_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={armyInfantryType}>
								{#each Object.entries(INFANTRY_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={armyInfantryQuality}>
								{#each Object.entries(INFANTRY_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={armyInfantryCount} min="1" max="10000" />
							<button class="comp-add-btn" onclick={addInfantryComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">🛡️ 装甲</div>
						{#each army.armor as comp (comp.id)}
							<div class="component-item">
								<span>{ARMOR_TYPE_LABELS[comp.type]} · {ARMOR_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={armyArmorType}>
								{#each Object.entries(ARMOR_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={armyArmorQuality}>
								{#each Object.entries(ARMOR_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={armyArmorCount} min="1" max="1000" />
							<button class="comp-add-btn" onclick={addArmorComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">🚀 导弹</div>
						{#each army.missiles as comp (comp.id)}
							<div class="component-item">
								<span>{MISSILE_TYPE_LABELS[comp.type]} · {MISSILE_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={armyMissileType}>
								{#each Object.entries(MISSILE_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={armyMissileQuality}>
								{#each Object.entries(MISSILE_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={armyMissileCount} min="1" max="500" />
							<button class="comp-add-btn" onclick={addMissileComp}>+</button>
						</div>
					</div>

				{:else if editingUnit.branch === 'navy'}
					{@const navy = editingUnit as NavyUnit}

					<div class="component-group">
						<div class="component-title">🚢 水面舰艇</div>
						{#each navy.surface as comp (comp.id)}
							<div class="component-item">
								<span>{SURFACE_TYPE_LABELS[comp.type]} · {NAVAL_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={navySurfaceType}>
								{#each Object.entries(SURFACE_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={navySurfaceQuality}>
								{#each Object.entries(NAVAL_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={navySurfaceCount} min="1" max="20" />
							<button class="comp-add-btn" onclick={addSurfaceComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">🔱 潜艇</div>
						{#each navy.submarines as comp (comp.id)}
							<div class="component-item">
								<span>{SUBMARINE_TYPE_LABELS[comp.type]} · {SUBMARINE_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={navySubType}>
								{#each Object.entries(SUBMARINE_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={navySubQuality}>
								{#each Object.entries(SUBMARINE_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={navySubCount} min="1" max="15" />
							<button class="comp-add-btn" onclick={addSubComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">⚓ 支援舰艇</div>
						{#each navy.support as comp (comp.id)}
							<div class="component-item">
								<span>{NAVAL_SUPPORT_TYPE_LABELS[comp.type]} · {NAVAL_SUPPORT_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={navySupportType}>
								{#each Object.entries(NAVAL_SUPPORT_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={navySupportQuality}>
								{#each Object.entries(NAVAL_SUPPORT_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={navySupportCount} min="1" max="10" />
							<button class="comp-add-btn" onclick={addNavSupportComp}>+</button>
						</div>
					</div>

				{:else if editingUnit.branch === 'air_force'}
					{@const air = editingUnit as AirForceUnit}

					<div class="component-group">
						<div class="component-title">✈️ 战斗机</div>
						{#each air.fighters as comp (comp.id)}
							<div class="component-item">
								<span>{FIGHTER_TYPE_LABELS[comp.type]} · {FIGHTER_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={airFighterType}>
								{#each Object.entries(FIGHTER_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={airFighterQuality}>
								{#each Object.entries(FIGHTER_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={airFighterCount} min="1" max="50" />
							<button class="comp-add-btn" onclick={addFighterComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">💣 轰炸机</div>
						{#each air.bombers as comp (comp.id)}
							<div class="component-item">
								<span>{BOMBER_TYPE_LABELS[comp.type]} · {BOMBER_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={airBomberType}>
								{#each Object.entries(BOMBER_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={airBomberQuality}>
								{#each Object.entries(BOMBER_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={airBomberCount} min="1" max="20" />
							<button class="comp-add-btn" onclick={addBomberComp}>+</button>
						</div>
					</div>

					<div class="component-group">
						<div class="component-title">📡 支援飞机</div>
						{#each air.support as comp (comp.id)}
							<div class="component-item">
								<span>{AIR_SUPPORT_TYPE_LABELS[comp.type]} · {AIR_SUPPORT_QUALITY_LABELS[comp.quality]} × {comp.count}</span>
								<button class="remove-btn" onclick={() => removeComponent(comp.id)}>✕</button>
							</div>
						{/each}
						<div class="component-add">
							<select bind:value={airSupportType}>
								{#each Object.entries(AIR_SUPPORT_TYPE_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<select bind:value={airSupportQuality}>
								{#each Object.entries(AIR_SUPPORT_QUALITY_LABELS) as [v, l]}<option value={v}>{l}</option>{/each}
							</select>
							<input type="number" bind:value={airSupportCount} min="1" max="15" />
							<button class="comp-add-btn" onclick={addAirSupportComp}>+</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.panel-section {
		padding: 10px;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 12px;
		padding-bottom: 8px;
	}

	.panel-title .icon {
		width: 20px;
		text-align: center;
	}

	.branch-selector {
		display: flex;
		gap: 4px;
		margin-bottom: 12px;
	}

	.branch-btn {
		flex: 1;
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.branch-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.branch-btn.active {
		background: var(--accent-color, #3182ce);
		color: white;
		border-color: transparent;
	}

	.unit-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;
		max-height: 150px;
		overflow-y: auto;
	}

	.unit-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 0.85rem;
	}

	.unit-actions {
		display: flex;
		gap: 4px;
	}

	.unit-action-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px;
		opacity: 0.6;
		color: inherit;
		display: flex;
		align-items: center;
	}

	.unit-action-btn:hover {
		opacity: 1;
	}

	.unit-action-btn.place:hover {
		color: var(--success-color, #38a169);
	}

	.unit-action-btn.delete:hover {
		color: var(--danger-color, #e53e3e);
	}

	.custom-unit-panel {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.form-group {
		margin-bottom: 8px;
	}

	.form-group label {
		display: block;
		margin-bottom: 4px;
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.form-group input[type='text'] {
		width: 100%;
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		font-size: 0.85rem;
	}

	.component-group {
		margin-bottom: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.component-title {
		font-size: 0.9rem;
		margin-bottom: 8px;
		font-weight: 600;
	}

	.component-controls {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}

	.component-controls select,
	.component-controls input {
		flex: 1;
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		font-size: 0.8rem;
	}

	.component-controls input[type='number'] {
		max-width: 70px;
	}

	.add-component-btn {
		width: 100%;
		padding: 6px;
		border-radius: 6px;
		border: 1px solid rgba(56, 161, 105, 0.3);
		background: rgba(56, 161, 105, 0.15);
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 0.8rem;
		margin-bottom: 6px;
		transition: background 0.2s;
	}

	.add-component-btn:hover {
		background: rgba(56, 161, 105, 0.3);
	}

	.component-list {
		max-height: 120px;
		overflow-y: auto;
	}

	.component-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px;
		margin-bottom: 3px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.06);
		font-size: 0.78rem;
	}

	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		opacity: 0.5;
		font-size: 0.8rem;
		padding: 0 4px;
	}

	.remove-btn:hover {
		opacity: 1;
		color: var(--danger-color, #e53e3e);
	}

	.create-unit-btn {
		width: 100%;
		padding: 10px;
		margin-top: 12px;
		border-radius: 6px;
		border: 1px solid rgba(214, 158, 46, 0.3);
		background: rgba(214, 158, 46, 0.2);
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		transition: background 0.2s;
	}

	.create-unit-btn:hover:not(:disabled) {
		background: rgba(214, 158, 46, 0.35);
	}

	.create-unit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.empty-hint {
		font-size: 0.8rem;
		opacity: 0.5;
		text-align: center;
		padding: 10px;
	}
</style>
