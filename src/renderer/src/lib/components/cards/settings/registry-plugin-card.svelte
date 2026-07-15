<script lang="ts">
	import { Download, CheckCircle2, Loader, Tag, User, Package, Star } from '@lucide/svelte';
	import type { PluginManifest } from '$lib/services/plugin-db';
	import { installPlugin } from '$lib/services/plugin-registry';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	let {
		manifest,
		installed = false,
		oninstalled
	}: {
		manifest: PluginManifest;
		installed?: boolean;
		oninstalled?: (id: string) => void;
	} = $props();

	let installing = $state(false);
	let error = $state<string | null>(null);
	let done = $state(installed);
	let localStars = $state<number | undefined>(undefined);

	onMount(() => {
		function onStarsLoaded(e: Event) {
			const map = (e as CustomEvent<Record<string, number>>).detail;
			localStars = map[`${manifest.repo}`];
		}
		window.addEventListener('veto:stars-loaded', onStarsLoaded);
		return () => window.removeEventListener('veto:stars-loaded', onStarsLoaded);
	});

	const TYPE_LABEL: Record<string, string> = {
		faction: '阵营包',
		scenario: '剧情包',
		ruleset: '规则包',
		campaign: '战役包',
		utility: '工具包',
		dependency: '依赖库'
	};

	async function handleInstall() {
		installing = true;
		error = null;
		try {
			await installPlugin(manifest);
			done = true;
			oninstalled?.(manifest.id);
		} catch (err) {
			error = err instanceof Error ? err.message : '安装失败';
		} finally {
			installing = false;
		}
	}
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
	<!-- 标题行 -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2.5">
			<div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<Package class="size-4" />
			</div>
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="text-sm font-semibold text-foreground">{manifest.name}</span>
					<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
						{TYPE_LABEL[manifest.type] ?? manifest.type}
					</span>
				</div>
				<div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
					<span class="flex items-center gap-0.5">
						<User class="size-3" />{manifest.author}
					</span>
					<span>v{manifest.version}</span>
					{#if manifest.license}
						<span>{manifest.license}</span>
					{/if}
					{#if localStars !== undefined && localStars > 0}
						<span class="flex items-center gap-0.5 text-amber-500 dark:text-amber-400">
							<Star class="size-3 fill-current" />{localStars}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- 安装按钮 -->
		{#if done}
			<div class="flex shrink-0 items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
				<CheckCircle2 class="size-4" />
				已安装
			</div>
		{:else}
			<Button
				size="sm"
				variant="outline"
				class="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
				disabled={installing}
				onclick={handleInstall}
			>
				{#if installing}
					<Loader class="size-3.5 animate-spin" />
					安装中…
				{:else}
					<Download class="size-3.5" />
					安装
				{/if}
			</Button>
		{/if}
	</div>

	<!-- 描述 -->
	{#if manifest.description}
		<p class="text-xs leading-relaxed text-muted-foreground">{manifest.description}</p>
	{/if}

	<!-- 标签 -->
	{#if manifest.tags && manifest.tags.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each manifest.tags as tag}
				<span class="flex items-center gap-0.5 rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
					<Tag class="size-2.5" />{tag}
				</span>
			{/each}
		</div>
	{/if}

	<!-- 安装错误 -->
	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</div>
