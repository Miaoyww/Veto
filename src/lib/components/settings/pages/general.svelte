<script lang="ts">
	import SettingCard from '$lib/components/cards/settings/settings-card.svelte';
	import { Kbd, KbdGroup } from '$lib/components/ui/kbd';
	import { Button } from '$lib/components/ui/button';
	import { SHORTCUT_DEFS } from '$lib/hooks/use-keyboard-shortcuts.svelte';
	import { clearAllBattles, importBattles } from '$lib/stores/crisis/battle-store';
	import { globalSettings } from '$lib/stores/global-settings.store';
	import { showConfirm } from '$lib/stores/global-ui-store';
	import { toast } from 'svelte-sonner';
	import { Upload, Trash2, Sun, Moon } from '@lucide/svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';

	const GROUPS = ['危机推演', '模拟大会'] as const;

	const shortcutsByGroup = Object.fromEntries(
		GROUPS.map((g) => [g, SHORTCUT_DEFS.filter((d) => d.group === g)])
	) as Record<(typeof GROUPS)[number], typeof SHORTCUT_DEFS>;

	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = () => {
			const file = input.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const data = JSON.parse(reader.result as string);
					const [imported, skipped] = importBattles(data);
					if (imported > 0) {
						toast.success(
							`成功导入 ${imported} 个战局${skipped > 0 ? `，跳过 ${skipped} 个重复` : ''}`
						);
					} else {
						toast.warning(
							`未导入任何战局${skipped > 0 ? `（${skipped} 个已存在或格式无效）` : ''}`
						);
					}
				} catch {
					toast.error('JSON 解析失败，请检查文件格式');
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function handleClearAll() {
		showConfirm('清除所有战局数据', '此操作不可撤销，所有战局将被永久删除。', () => {
			clearAllBattles();
			toast.success('已清除所有战局数据');
		});
	}
</script>

<div class="space-y-8">
	<!-- 界面 -->
	<div>
		<div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">界面</div>
		<div class="space-y-3">
			<!-- 主题 -->
			<SettingCard title="界面主题" description="选择浅色或暗色界面主题。">
				<div class="flex gap-1.5">
					<Button
					variant={userPrefersMode.current === 'light' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => setMode('light')}
					>
						<Sun size={13} class="mr-1.5" />
						浅色
					</Button>
					<Button
					variant={userPrefersMode.current === 'dark' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => setMode('dark')}
					>
						<Moon size={13} class="mr-1.5" />
						暗色
					</Button>
				</div>
			</SettingCard>

			<!-- 语言 -->
			<SettingCard title="界面语言" description="切换界面显示语言。部分界面可能需要刷新后生效。">
				<div class="flex gap-1.5">
					<Button
						variant={$globalSettings.language === 'zh-cn' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => globalSettings.patch({ language: 'zh-cn' })}
					>
						中文
					</Button>
					<Button
						variant={$globalSettings.language === 'en' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => globalSettings.patch({ language: 'en' })}
					>
						English
					</Button>
				</div>
			</SettingCard>
		</div>
	</div>

	<!-- 快捷键 -->
	<div>
		<div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">快捷键</div>
		<p class="mb-5 text-sm text-muted-foreground">当前版本快捷键为只读，后续版本支持自定义。</p>

		<div class="space-y-6">
			{#each GROUPS as group}
				<div>
					<div class="mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">{group}</div>
					{#if shortcutsByGroup[group].length === 0}
						<p class="text-xs text-muted-foreground">暂无快捷键</p>
					{:else}
						<div class="space-y-2">
							{#each shortcutsByGroup[group] as def}
								<SettingCard title={def.description}>
									<KbdGroup>
										{#if def.ctrl}<Kbd>Ctrl</Kbd>{/if}
										{#if def.shift}<Kbd>Shift</Kbd>{/if}
										{#if def.alt}<Kbd>Alt</Kbd>{/if}
										<Kbd>{def.key}</Kbd>
									</KbdGroup>
								</SettingCard>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- 数据管理 -->
	<div>
		<div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">数据管理</div>
		<div class="space-y-3">
			<SettingCard title="导入战局" description="从 JSON 文件导入战局，重复 ID 自动跳过。">
				<Button variant="outline" size="sm" onclick={handleImport}>
					<Upload size={13} class="mr-1.5" />
					从文件导入
				</Button>
			</SettingCard>
			<SettingCard title="清除所有战局" description="永久删除本地所有战局数据，无法恢复。">
				<Button
					variant="outline"
					size="sm"
					class="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
					onclick={handleClearAll}
				>
					<Trash2 size={13} class="mr-1.5" />
					清除所有数据
				</Button>
			</SettingCard>
		</div>
	</div>
</div>
