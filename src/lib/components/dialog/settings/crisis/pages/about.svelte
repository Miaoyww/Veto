<script lang="ts">
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';

	import { version } from '$app/environment';
	import favicon from '$lib/assets/favicon.png';
</script>

<div>
	<div class="mt-6 pb-10 text-center lg:max-w-4xl ">
		<div class="mb-4 flex justify-center gap-6 text-gray-600">
			<img src="{favicon}" alt="App Logo" class="h-64 w-64 rounded-md shadow-md" />
		</div>
	</div>

	<div class="space-y-3 pb-10 lg:max-w-4xl ">
		<div class="font-weight-bold text-xl font-bold">关于</div>
		<SettingCard let:id title="版本号">
			<Label {id}>v{version}</Label>
		</SettingCard>

		<SettingCard let:id title="开源许可">
			<Button
				{id}
				class="w-24"
				variant="outline"
				href="https://github.com/Miaoyww/Veto/blob/master/LICENSE"
			>
				MIT
			</Button>
		</SettingCard>

		<SettingCard let:id title="Github 仓库">
			<Button
				{id}
				class="w-24"
				variant="outline"
				href="https://github.com/Miaoyww/Veto"
			>
				Github
			</Button>
		</SettingCard>
	</div>

	<div class="pb-6 text-center lg:max-w-4xl">
		<div class="text-base font-bold tracking-wide text-stone-700">MADE BY MIAOYWW</div>
		<div class="mt-2 text-sm text-stone-500">
			<div>Copyright Miaoyww 2025-2026.</div>
			<div>Distributed under the terms of the GPL-3.0 license.</div>
		</div>
		<div class="mt-3 flex items-center justify-center gap-3">
			<a
				href="https://github.com/Miaoyww/Veto"
				target="_blank"
				rel="noreferrer"
				class="rounded-md border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100"
			>
				GitHub
			</a>
			<a
				href="https://space.bilibili.com/435970102"
				target="_blank"
				rel="noreferrer"
				class="rounded-md border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100"
			>
				Bilibili
			</a>
		</div>
	</div>
</div>
