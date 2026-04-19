<script lang="ts">
	import { ExternalLink, FileText, ShieldCheck } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import { VETO_NAME } from '$lib/const';
	import { isTauri } from '@tauri-apps/api/core';
	import { fly } from 'svelte/transition';
	const version = __APP_VERSION__;

	const API_URL = 'https://api.github.com/repos/Miaoyww/Veto/releases/latest';
	import favicon from '$lib/assets/favicon.png';
	async function checkForUpdates() {}
</script>

<div class="grid h-full grid-rows-2" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
	<div>
		<div class="mb-1 flex justify-center">
			<img src={favicon} alt="App Logo" class="h-64 w-64 rounded-md" />
		</div>
		<div class="mb-6 flex flex-col items-center gap-2 text-center">
			<h2 class="text-3xl font-extrabold tracking-wide text-stone-800 dark:text-stone-100">
				{VETO_NAME}
			</h2>ge
			<p class="text-sm text-muted-foreground">模拟联合国会议系统</p>
		</div>
		<div class="space-y-3">
			<SettingCard title="版本号" description="当前应用版本。">
				<Label>v{version}</Label>
			</SettingCard>
			<SettingCard title="开源许可" description="本项目基于 GPL-3.0 协议开源。">
				<Button
					variant="outline"
					size="sm"
					href="https://github.com/Miaoyww/Veto/blob/master/LICENSE"
					target="_blank"
				>
					<FileText size={13} class="mr-1.5" />
					GPL-3.0
				</Button>
			</SettingCard>
			<SettingCard title="GitHub 仓库" description="查看源代码或提交 Issue。">
				<Button variant="outline" size="sm" href="https://github.com/Miaoyww/Veto" target="_blank">
					<ExternalLink size={13} class="mr-1.5" />
					Miaoyww/Veto
				</Button>
			</SettingCard>

			{#if isTauri()}
				<SettingCard title="检查更新" description="跟上新版本!">
					<Button variant="outline" size="sm" onclick={checkForUpdates}>检查更新</Button>
				</SettingCard>
			{/if}
		</div>
	</div>
</div>
