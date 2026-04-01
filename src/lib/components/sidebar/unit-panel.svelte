<script lang="ts">
	import {
		currentBattle,
		currentFaction,
		currentFactionId,
		currentBranch,
		addUnit,
		removeUnit,
		interactionMode,
		pendingPlaceUnitId
	} from '$lib/stores/battle-store';
	import type {
		ArmyUnit,
		NavyUnit,
		AirForceUnit,
		MilitaryUnit,
		InfantryComponent,
		ArmorComponent,
		MissileComponent,
		SurfaceShipComponent,
		SubmarineComponent,
		NavalSupportComponent,
		FighterComponent,
		BomberComponent,
		AirSupportComponent,
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
	import { Trash2, MapPin } from '@lucide/svelte';

	const branches: Branch[] = ['army', 'navy', 'air_force'];

	// ============ 陆军表单状态 ============
	let armyName = $state('');
	let armyInfantryType = $state<ArmyInfantryType>('light');
	let armyInfantryQuality = $state<InfantryQuality>('basic');
	let armyInfantryCount = $state(1000);
	let armyInfantryList = $state<InfantryComponent[]>([]);

	let armyArmorType = $state<ArmyArmorType>('light_tank');
	let armyArmorQuality = $state<ArmorQuality>('gen1');
	let armyArmorCount = $state(50);
	let armyArmorList = $state<ArmorComponent[]>([]);

	let armyMissileType = $state<ArmyMissileType>('anti_tank');
	let armyMissileQuality = $state<MissileQuality>('basic');
	let armyMissileCount = $state(20);
	let armyMissileList = $state<MissileComponent[]>([]);

	// ============ 海军表单状态 ============
	let navyName = $state('');
	let navySurfaceType = $state<NavySurfaceType>('destroyer');
	let navySurfaceQuality = $state<NavalQuality>('basic');
	let navySurfaceCount = $state(2);
	let navySurfaceList = $state<SurfaceShipComponent[]>([]);

	let navySubType = $state<NavySubmarineType>('attack_sub');
	let navySubQuality = $state<SubmarineQuality>('basic');
	let navySubCount = $state(1);
	let navySubList = $state<SubmarineComponent[]>([]);

	let navySupportType = $state<NavySupportType>('amphibious');
	let navySupportQuality = $state<NavalSupportQuality>('basic');
	let navySupportCount = $state(1);
	let navySupportList = $state<NavalSupportComponent[]>([]);

	// ============ 空军表单状态 ============
	let airName = $state('');
	let airFighterType = $state<AirForceFighterType>('air_superiority');
	let airFighterQuality = $state<FighterQuality>('gen4');
	let airFighterCount = $state(12);
	let airFighterList = $state<FighterComponent[]>([]);

	let airBomberType = $state<AirForceBomberType>('strategic');
	let airBomberQuality = $state<BomberQuality>('basic');
	let airBomberCount = $state(4);
	let airBomberList = $state<BomberComponent[]>([]);

	let airSupportType = $state<AirForceSupportType>('awacs');
	let airSupportQuality = $state<AirSupportQuality>('basic');
	let airSupportCount = $state(2);
	let airSupportList = $state<AirSupportComponent[]>([]);

	// ============ 辅助函数 ============
	function genId() {
		return crypto.randomUUID();
	}

	// 陆军操作
	function addInfantry() {
		armyInfantryList = [
			...armyInfantryList,
			{ id: genId(), type: armyInfantryType, quality: armyInfantryQuality, count: armyInfantryCount }
		];
	}

	function addArmor() {
		armyArmorList = [
			...armyArmorList,
			{ id: genId(), type: armyArmorType, quality: armyArmorQuality, count: armyArmorCount }
		];
	}

	function addMissile() {
		armyMissileList = [
			...armyMissileList,
			{ id: genId(), type: armyMissileType, quality: armyMissileQuality, count: armyMissileCount }
		];
	}

	function createArmyUnit() {
		if (!$currentFactionId || !armyName.trim()) return;
		const unit: ArmyUnit = {
			id: genId(),
			name: armyName.trim(),
			branch: 'army',
			infantry: [...armyInfantryList],
			armor: [...armyArmorList],
			missiles: [...armyMissileList]
		};
		addUnit($currentFactionId, unit);
		armyName = '';
		armyInfantryList = [];
		armyArmorList = [];
		armyMissileList = [];
	}

	// 海军操作
	function addSurface() {
		navySurfaceList = [
			...navySurfaceList,
			{ id: genId(), type: navySurfaceType, quality: navySurfaceQuality, count: navySurfaceCount }
		];
	}

	function addSubmarine() {
		navySubList = [
			...navySubList,
			{ id: genId(), type: navySubType, quality: navySubQuality, count: navySubCount }
		];
	}

	function addNavalSupport() {
		navySupportList = [
			...navySupportList,
			{ id: genId(), type: navySupportType, quality: navySupportQuality, count: navySupportCount }
		];
	}

	function createNavyUnit() {
		if (!$currentFactionId || !navyName.trim()) return;
		const unit: NavyUnit = {
			id: genId(),
			name: navyName.trim(),
			branch: 'navy',
			surface: [...navySurfaceList],
			submarines: [...navySubList],
			support: [...navySupportList]
		};
		addUnit($currentFactionId, unit);
		navyName = '';
		navySurfaceList = [];
		navySubList = [];
		navySupportList = [];
	}

	// 空军操作
	function addFighter() {
		airFighterList = [
			...airFighterList,
			{ id: genId(), type: airFighterType, quality: airFighterQuality, count: airFighterCount }
		];
	}

	function addBomber() {
		airBomberList = [
			...airBomberList,
			{ id: genId(), type: airBomberType, quality: airBomberQuality, count: airBomberCount }
		];
	}

	function addAirSupport() {
		airSupportList = [
			...airSupportList,
			{ id: genId(), type: airSupportType, quality: airSupportQuality, count: airSupportCount }
		];
	}

	function createAirForceUnit() {
		if (!$currentFactionId || !airName.trim()) return;
		const unit: AirForceUnit = {
			id: genId(),
			name: airName.trim(),
			branch: 'air_force',
			fighters: [...airFighterList],
			bombers: [...airBomberList],
			support: [...airSupportList]
		};
		addUnit($currentFactionId, unit);
		airName = '';
		airFighterList = [];
		airBomberList = [];
		airSupportList = [];
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
					onclick={() => currentBranch.set(branch)}
				>
					{BRANCH_LABELS[branch]}
				</button>
			{/each}
		</div>

		<!-- 已有单位列表 -->
		<div class="unit-list">
			{#each $currentFaction.units.filter((u) => u.branch === $currentBranch) as unit (unit.id)}
				<div class="unit-item">
					<span class="unit-name">{unit.name}</span>
					<div class="unit-actions">
						<button
							class="unit-action-btn place"
							title="放置到地图"
							onclick={() => handlePlaceUnit(unit.id)}
						>
							<MapPin size={14} />
						</button>
						<button
							class="unit-action-btn delete"
							title="删除"
							onclick={() => removeUnit($currentFactionId!, unit.id)}
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- 陆军编组面板 -->
		{#if $currentBranch === 'army'}
			<div class="custom-unit-panel">
				<div class="form-group">
					<label>编组名称</label>
					<input type="text" bind:value={armyName} placeholder="输入编组名称" />
				</div>

				<!-- 步兵 -->
				<div class="component-group">
					<div class="component-title">步兵单位</div>
					<div class="component-controls">
						<select bind:value={armyInfantryType}>
							{#each Object.entries(INFANTRY_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={armyInfantryQuality}>
							{#each Object.entries(INFANTRY_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={armyInfantryCount} min="1" max="10000" />
					</div>
					<button class="add-component-btn" onclick={addInfantry}>
						<span class="icon">➕</span>
						<span>添加步兵单位</span>
					</button>
					<div class="component-list">
						{#each armyInfantryList as item, i (item.id)}
							<div class="component-item">
								<span>{INFANTRY_TYPE_LABELS[item.type]} · {INFANTRY_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (armyInfantryList = armyInfantryList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 装甲 -->
				<div class="component-group">
					<div class="component-title">装甲单位</div>
					<div class="component-controls">
						<select bind:value={armyArmorType}>
							{#each Object.entries(ARMOR_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={armyArmorQuality}>
							{#each Object.entries(ARMOR_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={armyArmorCount} min="1" max="1000" />
					</div>
					<button class="add-component-btn" onclick={addArmor}>
						<span class="icon">➕</span>
						<span>添加装甲单位</span>
					</button>
					<div class="component-list">
						{#each armyArmorList as item, i (item.id)}
							<div class="component-item">
								<span>{ARMOR_TYPE_LABELS[item.type]} · {ARMOR_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (armyArmorList = armyArmorList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 导弹 -->
				<div class="component-group">
					<div class="component-title">导弹单位</div>
					<div class="component-controls">
						<select bind:value={armyMissileType}>
							{#each Object.entries(MISSILE_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={armyMissileQuality}>
							{#each Object.entries(MISSILE_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={armyMissileCount} min="1" max="500" />
					</div>
					<button class="add-component-btn" onclick={addMissile}>
						<span class="icon">➕</span>
						<span>添加导弹单位</span>
					</button>
					<div class="component-list">
						{#each armyMissileList as item, i (item.id)}
							<div class="component-item">
								<span>{MISSILE_TYPE_LABELS[item.type]} · {MISSILE_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (armyMissileList = armyMissileList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<button class="create-unit-btn" onclick={createArmyUnit} disabled={!armyName.trim()}>
					<span class="icon">🛠️</span>
					<span>创建陆军单位</span>
				</button>
			</div>
		{/if}

		<!-- 海军编组面板 -->
		{#if $currentBranch === 'navy'}
			<div class="custom-unit-panel">
				<div class="form-group">
					<label>编组名称</label>
					<input type="text" bind:value={navyName} placeholder="输入编组名称" />
				</div>

				<!-- 水面舰艇 -->
				<div class="component-group">
					<div class="component-title">水面舰艇</div>
					<div class="component-controls">
						<select bind:value={navySurfaceType}>
							{#each Object.entries(SURFACE_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={navySurfaceQuality}>
							{#each Object.entries(NAVAL_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={navySurfaceCount} min="1" max="20" />
					</div>
					<button class="add-component-btn" onclick={addSurface}>
						<span class="icon">➕</span>
						<span>添加水面舰艇</span>
					</button>
					<div class="component-list">
						{#each navySurfaceList as item, i (item.id)}
							<div class="component-item">
								<span>{SURFACE_TYPE_LABELS[item.type]} · {NAVAL_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (navySurfaceList = navySurfaceList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 潜艇 -->
				<div class="component-group">
					<div class="component-title">潜艇单位</div>
					<div class="component-controls">
						<select bind:value={navySubType}>
							{#each Object.entries(SUBMARINE_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={navySubQuality}>
							{#each Object.entries(SUBMARINE_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={navySubCount} min="1" max="15" />
					</div>
					<button class="add-component-btn" onclick={addSubmarine}>
						<span class="icon">➕</span>
						<span>添加潜艇单位</span>
					</button>
					<div class="component-list">
						{#each navySubList as item, i (item.id)}
							<div class="component-item">
								<span>{SUBMARINE_TYPE_LABELS[item.type]} · {SUBMARINE_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (navySubList = navySubList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 支援舰艇 -->
				<div class="component-group">
					<div class="component-title">支援舰艇</div>
					<div class="component-controls">
						<select bind:value={navySupportType}>
							{#each Object.entries(NAVAL_SUPPORT_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={navySupportQuality}>
							{#each Object.entries(NAVAL_SUPPORT_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={navySupportCount} min="1" max="10" />
					</div>
					<button class="add-component-btn" onclick={addNavalSupport}>
						<span class="icon">➕</span>
						<span>添加支援舰艇</span>
					</button>
					<div class="component-list">
						{#each navySupportList as item, i (item.id)}
							<div class="component-item">
								<span>{NAVAL_SUPPORT_TYPE_LABELS[item.type]} · {NAVAL_SUPPORT_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (navySupportList = navySupportList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<button class="create-unit-btn" onclick={createNavyUnit} disabled={!navyName.trim()}>
					<span class="icon">🛠️</span>
					<span>创建海军单位</span>
				</button>
			</div>
		{/if}

		<!-- 空军编组面板 -->
		{#if $currentBranch === 'air_force'}
			<div class="custom-unit-panel">
				<div class="form-group">
					<label>编组名称</label>
					<input type="text" bind:value={airName} placeholder="输入编组名称" />
				</div>

				<!-- 战斗机 -->
				<div class="component-group">
					<div class="component-title">战斗机单位</div>
					<div class="component-controls">
						<select bind:value={airFighterType}>
							{#each Object.entries(FIGHTER_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={airFighterQuality}>
							{#each Object.entries(FIGHTER_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={airFighterCount} min="1" max="50" />
					</div>
					<button class="add-component-btn" onclick={addFighter}>
						<span class="icon">➕</span>
						<span>添加战斗机单位</span>
					</button>
					<div class="component-list">
						{#each airFighterList as item, i (item.id)}
							<div class="component-item">
								<span>{FIGHTER_TYPE_LABELS[item.type]} · {FIGHTER_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (airFighterList = airFighterList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 轰炸机 -->
				<div class="component-group">
					<div class="component-title">轰炸机单位</div>
					<div class="component-controls">
						<select bind:value={airBomberType}>
							{#each Object.entries(BOMBER_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={airBomberQuality}>
							{#each Object.entries(BOMBER_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={airBomberCount} min="1" max="20" />
					</div>
					<button class="add-component-btn" onclick={addBomber}>
						<span class="icon">➕</span>
						<span>添加轰炸机单位</span>
					</button>
					<div class="component-list">
						{#each airBomberList as item, i (item.id)}
							<div class="component-item">
								<span>{BOMBER_TYPE_LABELS[item.type]} · {BOMBER_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (airBomberList = airBomberList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 支援飞机 -->
				<div class="component-group">
					<div class="component-title">支援飞机</div>
					<div class="component-controls">
						<select bind:value={airSupportType}>
							{#each Object.entries(AIR_SUPPORT_TYPE_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<select bind:value={airSupportQuality}>
							{#each Object.entries(AIR_SUPPORT_QUALITY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
						<input type="number" bind:value={airSupportCount} min="1" max="15" />
					</div>
					<button class="add-component-btn" onclick={addAirSupport}>
						<span class="icon">➕</span>
						<span>添加支援飞机</span>
					</button>
					<div class="component-list">
						{#each airSupportList as item, i (item.id)}
							<div class="component-item">
								<span>{AIR_SUPPORT_TYPE_LABELS[item.type]} · {AIR_SUPPORT_QUALITY_LABELS[item.quality]} × {item.count}</span>
								<button class="remove-btn" onclick={() => (airSupportList = airSupportList.filter((_, idx) => idx !== i))}>✕</button>
							</div>
						{/each}
					</div>
				</div>

				<button class="create-unit-btn" onclick={createAirForceUnit} disabled={!airName.trim()}>
					<span class="icon">🛠️</span>
					<span>创建空军单位</span>
				</button>
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
