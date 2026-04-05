<script lang="ts">
	import { version } from '$app/environment';
	import { ExternalLink, FileText, ShieldCheck } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import { VETO_NAME } from '$lib/const';
</script>

<div class="grid h-full grid-rows-2">
	<div>
		<div class="mb-6 flex flex-col items-center gap-2 text-center">
			<h2 class="text-3xl font-extrabold tracking-wide text-stone-800 dark:text-stone-100">{VETO_NAME}</h2>
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
		</div>
	</div>


	<footer class="w-full py-6 text-center text-xs text-stone-400 dark:text-stone-500">
		<p>Copyright © <a href="https://github.com/Miaoyww" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Miaoyww</a> 2025–2026</p>
		<p class="mt-1">
			Powered by
			<a
				href="https://svelte.dev"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Svelte</a
			>
			·
			<a
				href="https://vercel.com"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Vercel</a
			>
		</p>
	</footer>
</div>
