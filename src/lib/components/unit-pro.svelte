<script lang="ts">
	import {
		currentBattle,
		selectedPlacedUnit,
		selectedPlacedUnitId
	} from '$lib/stores/battle-store';
	import { BRANCH_LABELS, UNIT_STATUS_LABELS } from '$lib/types';
	import type { MilitaryUnit, Faction, ArmyUnit, NavyUnit, AirForceUnit } from '$lib/types';
	import {
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
	import { X, GripHorizontal } from '@lucide/svelte';

	let pos = $state({ x: 40, y: 100 });
	let isDragging = $state(false);
	let dragOffset = $state({ x: 0, y: 0 });

	function onHeaderMouseDown(e: MouseEvent) {
		isDragging = true;
		dragOffset = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		e.preventDefault();
	}

	$effect(() => {
		function onMouseMove(e: MouseEvent) {
			if (!isDragging) return;
			const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
			const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
			pos = { x, y };
		}
		function onMouseUp() {
			isDragging = false;
		}
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};
	});

	let unitInfo = $derived.by(() => {
		const placed = $selectedPlacedUnit;
		const battle = $currentBattle;
		if (!placed || !battle) return null;
		for (const faction of battle.factions) {
			const unit = faction.units.find((u) => u.id === placed.unitId);
			if (unit) return { unit, faction, placed };
		}
		return null;
	});
</script>

{#if unitInfo}
	<div
		class="blur-backdrop fixed z-1000 rounded-lg"
		style:left="{pos.x}px"
		style:top="{pos.y}px"
		style:user-select={isDragging ? 'none' : 'auto'}
	>
		<div class="prop-panel">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="prop-header"
				onmousedown={onHeaderMouseDown}
				style:cursor={isDragging ? 'grabbing' : 'grab'}
			>
				<div class="prop-title">
					<span class="faction-dot" style:background-color={unitInfo.faction.color}></span>
					<strong>{unitInfo.unit.name}</strong>
				</div>
				<button class="close-btn" onclick={() => selectedPlacedUnitId.set(null)}>
					<X size={14} />
				</button>
			</div>
			<div class="prop-row">
				<span class="prop-label">阵营</span>
				<span>{unitInfo.faction.name}</span>
			</div>
			<div class="prop-row">
				<span class="prop-label">军种</span>
				<span>{BRANCH_LABELS[unitInfo.unit.branch]}</span>
			</div>
			<div class="prop-row">
				<span class="prop-label">状态</span>
				<span>{UNIT_STATUS_LABELS[unitInfo.placed.status]}</span>
			</div>
			<div class="prop-row">
				<span class="prop-label">坐标</span>
				<span>{unitInfo.placed.lat.toFixed(4)}, {unitInfo.placed.lng.toFixed(4)}</span>
			</div>
			{#if unitInfo.placed.strikeRadius > 0}
				<div class="prop-row">
					<span class="prop-label">打击范围</span>
					<span>{(unitInfo.placed.strikeRadius / 1000).toFixed(1)} km</span>
				</div>
			{/if}

			<!-- 单位详情 -->
			<div class="prop-details">
				{#if unitInfo.unit.branch === 'army'}
					{@const army = unitInfo.unit as ArmyUnit}
					{#each army.infantry as inf}
						<div class="detail-item">🪖 {INFANTRY_TYPE_LABELS[inf.type]} · {INFANTRY_QUALITY_LABELS[inf.quality]} × {inf.count}</div>
					{/each}
					{#each army.armor as arm}
						<div class="detail-item">🛡️ {ARMOR_TYPE_LABELS[arm.type]} · {ARMOR_QUALITY_LABELS[arm.quality]} × {arm.count}</div>
					{/each}
					{#each army.missiles as mis}
						<div class="detail-item">🚀 {MISSILE_TYPE_LABELS[mis.type]} · {MISSILE_QUALITY_LABELS[mis.quality]} × {mis.count}</div>
					{/each}
				{:else if unitInfo.unit.branch === 'navy'}
					{@const navy = unitInfo.unit as NavyUnit}
					{#each navy.surface as s}
						<div class="detail-item">🚢 {SURFACE_TYPE_LABELS[s.type]} · {NAVAL_QUALITY_LABELS[s.quality]} × {s.count}</div>
					{/each}
					{#each navy.submarines as sub}
						<div class="detail-item">🔱 {SUBMARINE_TYPE_LABELS[sub.type]} · {SUBMARINE_QUALITY_LABELS[sub.quality]} × {sub.count}</div>
					{/each}
					{#each navy.support as sup}
						<div class="detail-item">⚓ {NAVAL_SUPPORT_TYPE_LABELS[sup.type]} · {NAVAL_SUPPORT_QUALITY_LABELS[sup.quality]} × {sup.count}</div>
					{/each}
				{:else if unitInfo.unit.branch === 'air_force'}
					{@const air = unitInfo.unit as AirForceUnit}
					{#each air.fighters as f}
						<div class="detail-item">✈️ {FIGHTER_TYPE_LABELS[f.type]} · {FIGHTER_QUALITY_LABELS[f.quality]} × {f.count}</div>
					{/each}
					{#each air.bombers as b}
						<div class="detail-item">💣 {BOMBER_TYPE_LABELS[b.type]} · {BOMBER_QUALITY_LABELS[b.quality]} × {b.count}</div>
					{/each}
					{#each air.support as s}
						<div class="detail-item">📡 {AIR_SUPPORT_TYPE_LABELS[s.type]} · {AIR_SUPPORT_QUALITY_LABELS[s.quality]} × {s.count}</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.prop-panel {
		width: 280px;
		padding: 12px;
		font-size: 0.85rem;
	}

	.prop-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.prop-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.faction-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.5;
		padding: 2px;
		display: flex;
		color: inherit;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.prop-row {
		display: flex;
		justify-content: space-between;
		padding: 3px 0;
	}

	.prop-label {
		opacity: 0.6;
	}

	.prop-details {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	.detail-item {
		padding: 2px 0;
		font-size: 0.8rem;
	}
</style>
