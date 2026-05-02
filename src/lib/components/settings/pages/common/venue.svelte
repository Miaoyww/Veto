<script lang="ts">
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { globalSettings } from '$lib/stores/global-settings.store';
	import { fly } from 'svelte/transition';

	function saveIconStyle(style: 'nato' | 'simple') {
		globalSettings.patch({ defaultIconStyle: style });
	}
</script>

<div in:fly={{ y: 8, duration: 320, opacity: 0 }}>
	<div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">会场</div>
	<p class="mb-4 text-sm text-muted-foreground">配置新建战局时的默认值。</p>
	<div class="space-y-3">
		<SettingCard title="默认图标风格" description="新建战局时使用的单位图标样式。">
			<div class="flex gap-2">
				<Button
					variant={$globalSettings.defaultIconStyle === 'nato' ? 'default' : 'outline'}
					size="sm"
					onclick={() => saveIconStyle('nato')}>北约标准</Button
				>
				<Button
					variant={$globalSettings.defaultIconStyle === 'simple' ? 'default' : 'outline'}
					size="sm"
					onclick={() => saveIconStyle('simple')}>简单图标</Button
				>
			</div>
		</SettingCard>
	</div>
</div>
