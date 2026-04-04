<script lang="ts">
	import { Puzzle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<div>
	<div class="mb-1 text-xl font-bold text-stone-800">Mod 管理</div>
	<p class="mb-4 text-sm text-muted-foreground">管理已安装的扩展包，Mod 以 JSON 格式导入。</p>
	<div
		class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 py-16 text-stone-400"
	>
		<Puzzle size={36} class="opacity-40" />
		<span class="text-sm">暂无已安装的 Mod</span>
		<Button variant="outline" size="sm" disabled>从文件导入 Mod</Button>
	</div>
</div>
