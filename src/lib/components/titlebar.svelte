<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { Minus, X, Settings, Square, SquaresUnite } from '@lucide/svelte';
	import { currentBattle } from '$lib/stores/battle/battle-store';
	import { VETO_NAME } from '$lib/const';
	import { Button } from '$lib/components/ui/button';
	import { isTauri } from '@tauri-apps/api/core';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let appWindow = $state<any>(null);
	let isMaximized = $state(false);

	$effect(() => {
		if (!isTauri()) return;
		import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
			const win = getCurrentWindow();
			appWindow = win;
			win.isMaximized().then((v: boolean) => (isMaximized = v));
			win.onResized(async () => {
				isMaximized = await win.isMaximized();
			});
		});
	});

	function onDragMouseDown(e: MouseEvent) {
		if (e.buttons === 1 && appWindow) {
			appWindow.startDragging();
		}
	}
</script>

{#if isTauri()}
	<div
		class="fixed top-0 right-0 left-0 z-[9999] flex h-9 items-stretch border-b border-border/30 bg-background select-none"
	>
		<!-- 左：应用名 -->
		<div class="flex w-28 shrink-0 items-center pl-4" onmousedown={onDragMouseDown}>
			<span class="text-sm font-semibold tracking-[0.2em] text-foreground/50 uppercase">
				{VETO_NAME}
			</span>
		</div>

		<!-- 中：当前战役名（可拖动） -->
		<div class="flex flex-1 items-center justify-center" onmousedown={onDragMouseDown}>
			{#if $currentBattle}
				<span class="ml-16 max-w-xs truncate text-sm text-foreground/70">{$currentBattle.name}</span>
			{/if}
		</div>

		<!-- 右：设置入口 + 分割线 + 窗口控制 -->
		<div class="flex shrink-0 items-stretch">
			<Button
				class="flex items-center justify-center px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				variant="ghost"
				onclick={() => goto('/settings')}
				title="前往设置"
			>
				<Settings size={14} />
			</Button>

			<div class="mx-0.5 my-2 w-px bg-border/40"></div>

			<Button
				class="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				onclick={() => appWindow?.minimize()}
				variant="ghost"
				title="最小化"
			>
				<Minus size={14} />
			</Button>

			<Button
				class="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				onclick={() => appWindow?.toggleMaximize()}
				variant="ghost"
				title={isMaximized ? '向下还原' : '最大化'}
			>
				{#if isMaximized}
					<SquaresUnite size={11} />
				{:else}
					<Square size={11} />
				{/if}
			</Button>

			<Button
				class="close-btn flex w-11 items-center justify-center text-muted-foreground transition-colors"
				onclick={() => appWindow?.close()}
				variant="ghost"
				title="关闭"
			>
				<X size={14} />
			</Button>
		</div>
	</div>
{/if}

<style>
	.close-btn:hover {
		background-color: rgb(239 68 68);
		color: white;
	}
</style>
