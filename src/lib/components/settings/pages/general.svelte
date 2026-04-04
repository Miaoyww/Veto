<script lang="ts">
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
</script>

<div>
	<div class="mb-1 text-xl font-bold text-stone-800">常规</div>
	<p class="mb-4 text-sm text-muted-foreground">全局界面偏好设置。</p>
	<div class="space-y-3">
		<SettingCard title="更多设置即将推出" description="语言、主题等选项将在后续版本中添加。">
			<span class="text-xs text-muted-foreground">敬请期待</span>
		</SettingCard>
	</div>
</div>
