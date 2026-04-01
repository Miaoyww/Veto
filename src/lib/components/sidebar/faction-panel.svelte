<script lang="ts">
	import {
		currentBattle,
		currentFactionId,
		addFaction,
		removeFaction,
		selectFaction,
		updateFaction
	} from '$lib/stores/battle-store';
	import type { Faction } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from '@lucide/svelte';

	let newFactionName = $state('');
	let newFactionColor = $state('#ff0000');

	function handleAddFaction() {
		const name = newFactionName.trim();
		if (!name) return;
		addFaction(name, newFactionColor);
		newFactionName = '';
		newFactionColor = '#ff0000';
	}
</script>

<div class="panel-section">
	<div class="panel-title">
		<span class="icon">⚔️</span>
		<span>阵营选择</span>
	</div>

	{#if $currentBattle}
		<div class="faction-list">
			{#each $currentBattle.factions as faction (faction.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="faction-item"
					class:active={$currentFactionId === faction.id}
					style:border-left-color={faction.color}
					onclick={() => selectFaction(faction.id)}
					onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') selectFaction(faction.id); }}
					role="button"
					tabindex="0"
				>
					<div class="faction-info">
						<span class="faction-color" style:background-color={faction.color}></span>
						<span class="faction-name">{faction.name}</span>
					</div>
					<button
						class="faction-delete"
						onclick={(e: MouseEvent) => { e.stopPropagation(); removeFaction(faction.id); }}
						title="删除阵营"
					>
						<Trash2 size={14} />
					</button>
				</div>
			{/each}
			{#if $currentBattle.factions.length === 0}
				<p class="empty-hint">暂无阵营，请添加</p>
			{/if}
		</div>

		<div class="custom-faction-panel">
			<div class="form-group">
				<label>阵营名称</label>
				<input type="text" bind:value={newFactionName} placeholder="输入阵营名称" />
			</div>
			<div class="form-group">
				<label>阵营颜色</label>
				<div class="color-input">
					<input type="color" bind:value={newFactionColor} />
					<div class="color-preview" style:background-color={newFactionColor}></div>
				</div>
			</div>
			<button class="add-btn" onclick={handleAddFaction}>
				<span class="icon">➕</span>
				<span>添加阵营</span>
			</button>
		</div>
	{:else}
		<p class="empty-hint">请先创建或加载战局</p>
	{/if}
</div>

<style>
	.faction-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 12px;
	}

	.faction-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px;
		border-radius: 6px;
		border-left: 3px solid transparent;
		cursor: pointer;
		transition: background 0.2s;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-left: 3px solid;
		width: 100%;
		text-align: left;
		color: inherit;
		font-size: inherit;
	}

	.faction-item:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.faction-item.active {
		background: rgba(255, 255, 255, 0.25);
		font-weight: 600;
	}

	.faction-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.faction-color {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.faction-delete {
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.5;
		padding: 2px;
		color: inherit;
		display: flex;
		align-items: center;
	}

	.faction-delete:hover {
		opacity: 1;
		color: var(--danger-color, #e53e3e);
	}

	.custom-faction-panel {
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

	.color-input {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.color-input input[type='color'] {
		flex: 1;
		height: 32px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: transparent;
	}

	.color-preview {
		width: 30px;
		height: 30px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
	}

	.add-btn {
		width: 100%;
		padding: 8px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(56, 161, 105, 0.3);
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 0.85rem;
		transition: background 0.2s;
	}

	.add-btn:hover {
		background: rgba(56, 161, 105, 0.5);
	}

	.empty-hint {
		font-size: 0.8rem;
		opacity: 0.5;
		text-align: center;
		padding: 10px;
	}

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
</style>
