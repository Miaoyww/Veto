<script lang="ts">
	import { fly } from 'svelte/transition';
	import { AlertTriangle, Check, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pendingRoute, applyPendingRoute, cancelPendingRoute } from '$lib/stores/crisis/pending-route.store';
	import { addLog } from '$lib/stores/crisis/battle-store';

	let {
		open = $bindable(false)
	}: {
		open: boolean;
	} = $props();
</script>

{#if open && $pendingRoute}
	{@const pr = $pendingRoute}
	<div
		class="pointer-events-none fixed inset-0 z-[2000] flex items-end justify-center pb-8"
		in:fly={{ y: 16, duration: 220, opacity: 0 }}
		out:fly={{ y: 16, duration: 160, opacity: 0 }}
	>
		<div class="pointer-events-auto flex w-[440px] flex-col gap-3 rounded-2xl border border-amber-200 bg-white/95 p-5 shadow-xl backdrop-blur-sm dark:border-amber-800 dark:bg-stone-900/95">
			<div class="flex items-start gap-3">
			<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
				<AlertTriangle class="h-4 w-4 text-amber-500 dark:text-amber-400" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">路线指令已录入</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						单位 <span class="font-medium text-foreground">{pr.unitName}</span> &middot;
						{pr.type === 'reset' ? '重置路线' : '追加路线'} &middot;
						共 <span class="font-medium text-foreground">{pr.points.length}</span> 个新节点
					</p>
					<p class="mt-1.5 text-xs text-muted-foreground/70">是否更新该单位的行动路线？</p>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => { open = false; cancelPendingRoute(); }}
				>
					<X class="h-3.5 w-3.5" />
					放弃
				</Button>
				<Button
					size="sm"
					onclick={() => {
						const unitName = pr.unitName;
						const type = pr.type;
						const count = pr.points.length;
						applyPendingRoute();
						addLog(`路线更新: ${unitName}，${type === 'reset' ? '重置' : '追加'} ${count} 个节点`);
						open = false;
					}}
				>
					<Check class="h-3.5 w-3.5" />
					确认更新
				</Button>
			</div>
		</div>
	</div>
{/if}
