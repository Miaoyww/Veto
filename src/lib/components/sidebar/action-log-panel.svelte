<script lang="ts">
	import { currentBattle } from '$lib/stores/crisis/battle-store';
</script>

<div class="panel-section">
	<div class="panel-title">
		<span class="icon">📝</span>
		<span>行动记录</span>
	</div>
	<div class="action-log">
		{#if $currentBattle && $currentBattle.actionLog.length > 0}
			{#each $currentBattle.actionLog as entry (entry.id)}
				<p>
					<span class="log-time">{new Date(entry.timestamp).toLocaleTimeString('zh-CN')}</span>
					{entry.message}
				</p>
			{/each}
		{:else}
			<p>系统已启动，等待操作...</p>
		{/if}
	</div>
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

	.action-log {
		height: 200px;
		overflow-y: auto;
		font-size: 0.8rem;
		border-radius: 6px;
		padding: 10px;
		background: rgba(255, 255, 255, 0.05);
	}

	.action-log p {
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.action-log p:last-child {
		border-bottom: none;
	}

	.log-time {
		opacity: 0.5;
		margin-right: 6px;
		font-size: 0.75rem;
	}
</style>
