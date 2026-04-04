<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Check, X, Navigation, AlertTriangle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		pendingCrisisCommand,
		applyCrisisCommand,
		cancelCrisisCommand
	} from '$lib/stores/unit-command.store';
</script>

{#if $pendingCrisisCommand}
	{@const cmd = $pendingCrisisCommand}
	<div
		class="pointer-events-auto absolute bottom-6 left-1/2 z-[1500] -translate-x-1/2"
		in:fly={{ y: 16, duration: 220, opacity: 0 }}
		out:fly={{ y: 16, duration: 160, opacity: 0 }}
	>
		<div
			class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 shadow-xl shadow-amber-100/60 backdrop-blur-md"
		>
			<!-- 警示图标 -->
			<div
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50"
			>
				<AlertTriangle class="h-4 w-4 text-amber-500" />
			</div>

			<!-- 指令信息 -->
			<div class="flex flex-col gap-0.5">
				<p class="text-sm font-semibold text-stone-800">
					<span class="mr-1 text-amber-600">收到新指令</span>
					<span class="text-stone-500 font-normal">— {cmd.unitName}</span>
				</p>
				<div class="flex items-center gap-1.5 text-xs text-stone-500">
					<Navigation class="h-3 w-3 text-stone-400" />
					<span class="font-mono">
						{cmd.lat.toFixed(4)}°N, {cmd.lng.toFixed(4)}°E
					</span>
					<span class="text-stone-300">·</span>
					<span class="text-stone-400">是否执行？</span>
				</div>
			</div>

			<Separator orientation="vertical" class="mx-1 h-8" />

			<!-- 操作按钮 -->
			<div class="flex items-center gap-2">
				<Button
					size="sm"
					class="h-8 gap-1.5 bg-stone-800 px-3 text-xs text-white hover:bg-stone-900"
					onclick={applyCrisisCommand}
				>
					<Check class="h-3.5 w-3.5" />
					执行
				</Button>
				<Button
					variant="outline"
					size="sm"
					class="h-8 gap-1.5 border-stone-200 px-3 text-xs text-stone-600 hover:border-stone-400"
					onclick={cancelCrisisCommand}
				>
					<X class="h-3.5 w-3.5" />
					取消
				</Button>
			</div>
		</div>
	</div>
{/if}
