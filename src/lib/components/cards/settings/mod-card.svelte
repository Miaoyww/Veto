<script lang="ts">
	import { Package, ShieldCheck, User } from '@lucide/svelte';
	import type { LoadedMod } from '$lib/registry/mod-registry';
	import { registry } from '$lib/registry/mod-registry';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import { Badge } from '$lib/components/ui/badge';

	let {
		entry,
		ontoggle
	}: {
		entry: LoadedMod;
		/** 切换完成后通知父组件刷新列表 */
		ontoggle?: () => void;
	} = $props();

	const { mod, source } = entry;
	let enabled = $state(entry.enabled);

	const branchCount = mod.branches?.length ?? 0;
	const categoryCount = mod.categories?.length ?? 0;
	const templateCount = mod.unitTemplates?.length ?? 0;

	const isSystem = source === 'system';

	function handleToggle(val: boolean) {
		enabled = val;
		registry.setModEnabled(mod.id!, val);
		ontoggle?.();
	}

	console.log('ModCard: entry updated', entry);
</script>

<div
	class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-opacity {!enabled
		? 'opacity-50'
		: ''}"
>
	<!-- 标题行 -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2.5">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-md {isSystem
					? 'bg-primary/10 text-primary'
					: 'bg-muted text-muted-foreground'}"
			>
				{#if isSystem}
					<ShieldCheck class="size-4" />
				{:else}
					<Package class="size-4" />
				{/if}
			</div>
			<div class="min-w-0">
				<div class="flex items-center gap-1.5">
					<span class="truncate text-sm font-semibold text-foreground"
						>{mod.name ?? mod.id ?? '未知 Mod'}</span
					>
					{#if isSystem}
						<Badge variant="secondary" class="shrink-0 text-[10px]">系统</Badge>
					{/if}
				</div>
				<div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
					{#if mod.version}
						<span>v{mod.version}</span>
					{/if}
					{#if mod.author}
						<span class="flex items-center gap-0.5">
							<User class="size-3" />{mod.author}
						</span>
					{/if}
					{#if !mod.version && !mod.author}
						<span class="italic">无版本信息</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- 开关（系统 Mod 不可禁用） -->
		<Switch
			checked={enabled}
			disabled={isSystem}
			onCheckedChange={handleToggle}
			class="mt-0.5 shrink-0"
		/>
	</div>

	<!-- 描述 -->
	{#if mod.description}
		<p class="text-xs leading-relaxed text-muted-foreground">{mod.description}</p>
	{/if}

	<!-- 统计标签 -->
	{#if branchCount + categoryCount + templateCount > 0}
		<div class="flex flex-wrap gap-1.5">
			{#if branchCount > 0}
				<span
					class="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
					>{branchCount} 个军种</span
				>
			{/if}
			{#if categoryCount > 0}
				<span
					class="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
					>{categoryCount} 个大类</span
				>
			{/if}
			{#if templateCount > 0}
				<span
					class="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
					>{templateCount} 个单位模板</span
				>
			{/if}
		</div>
	{/if}
</div>
