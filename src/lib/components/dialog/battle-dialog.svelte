<script lang="ts">
	import {
		battles,
		currentBattleId,
		createBattle,
		deleteBattle,
		loadBattle
	} from '$lib/stores/battle-store';
	import { fade } from 'svelte/transition';
	import { X, Plus, Trash2, Play } from '@lucide/svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let newBattleName = $state('');

	function handleCreate() {
		const name = newBattleName.trim();
		if (!name) return;
		createBattle(name);
		newBattleName = '';
		open = false;
	}

	function handleLoad(id: string) {
		loadBattle(id);
		open = false;
	}

	function handleDelete(id: string) {
		deleteBattle(id);
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleString('zh-CN');
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="overlay"
		transition:fade={{ duration: 150 }}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="backdrop" onclick={() => (open = false)}></div>
		<div class="dialog">
			<div class="dialog-header">
				<h2>战局管理</h2>
				<button class="close-btn" onclick={() => (open = false)}>
					<X size={18} />
				</button>
			</div>

			<!-- 创建新战局 -->
			<div class="create-section">
				<input
					type="text"
					bind:value={newBattleName}
					placeholder="输入新战局名称..."
					onkeydown={(e) => e.key === 'Enter' && handleCreate()}
				/>
				<button class="create-btn" onclick={handleCreate} disabled={!newBattleName.trim()}>
					<Plus size={16} />
					创建
				</button>
			</div>

			<!-- 战局列表 -->
			<div class="battle-list">
				{#if $battles.length === 0}
					<div class="empty">
						<p>暂无已保存的战局</p>
						<p class="hint">创建一个新战局开始推演</p>
					</div>
				{:else}
					{#each $battles as battle (battle.id)}
						<div class="battle-item" class:active={$currentBattleId === battle.id}>
							<div class="battle-info">
								<div class="battle-name">{battle.name}</div>
								<div class="battle-meta">
									<span>{battle.factions.length} 个阵营</span>
									<span>·</span>
									<span>{battle.placedUnits.length} 个单位</span>
									<span>·</span>
									<span>更新于 {formatDate(battle.updatedAt)}</span>
								</div>
							</div>
							<div class="battle-actions">
								<button
									class="action-btn load"
									title="加载战局"
									onclick={() => handleLoad(battle.id)}
								>
									<Play size={14} />
								</button>
								<button
									class="action-btn delete"
									title="删除战局"
									onclick={() => handleDelete(battle.id)}
								>
									<Trash2 size={14} />
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	.dialog {
		position: relative;
		width: 500px;
		max-width: 90vw;
		max-height: 70vh;
		background: var(--background, white);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border, #e5e7eb);
	}

	.dialog-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.5;
		padding: 4px;
		display: flex;
		color: inherit;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.create-section {
		display: flex;
		gap: 8px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border, #e5e7eb);
	}

	.create-section input {
		flex: 1;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid var(--border, #e5e7eb);
		background: var(--input, transparent);
		color: inherit;
		font-size: 0.9rem;
	}

	.create-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 16px;
		border-radius: 8px;
		border: none;
		background: var(--primary, #1a365d);
		color: var(--primary-foreground, white);
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: opacity 0.2s;
	}

	.create-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.create-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.battle-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.empty {
		text-align: center;
		padding: 40px 20px;
		opacity: 0.6;
	}

	.empty .hint {
		font-size: 0.85rem;
		margin-top: 4px;
		opacity: 0.7;
	}

	.battle-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-radius: 8px;
		transition: background 0.2s;
		margin-bottom: 4px;
	}

	.battle-item:hover {
		background: var(--muted, #f5f5f5);
	}

	.battle-item.active {
		background: var(--accent, #e8f0fe);
		border-left: 3px solid var(--primary, #1a365d);
	}

	.battle-info {
		flex: 1;
		min-width: 0;
	}

	.battle-name {
		font-weight: 600;
		font-size: 0.95rem;
		margin-bottom: 4px;
	}

	.battle-meta {
		font-size: 0.78rem;
		opacity: 0.6;
		display: flex;
		gap: 4px;
	}

	.battle-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.action-btn {
		background: none;
		border: 1px solid transparent;
		cursor: pointer;
		padding: 6px;
		border-radius: 6px;
		opacity: 0.5;
		display: flex;
		color: inherit;
		transition: all 0.2s;
	}

	.action-btn:hover {
		opacity: 1;
		border-color: var(--border, #e5e7eb);
	}

	.action-btn.delete:hover {
		color: #e53e3e;
	}

	.action-btn.load:hover {
		color: #38a169;
	}
</style>
