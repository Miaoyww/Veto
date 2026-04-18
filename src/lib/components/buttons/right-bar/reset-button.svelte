<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw } from '@lucide/svelte';

	import { resetCurrentBattle } from '$lib/stores/crisis/battle-store';
	import { showAlert, showConfirm } from '$lib/stores/alert-dialog-store';
	import { tweened } from 'svelte/motion';
	import { cubicInOut, linear } from 'svelte/easing';

	// 旋转角度动画
	const rotate = tweened(0, { duration: 300, easing: cubicInOut });
	// 缩放动画
	const scale = tweened(1, { duration: 200, easing: cubicInOut });

	let hovering = false;

	// 鼠标悬浮放大
	function handleMouseEnter() {
		hovering = true;
		scale.set(1.15, { duration: 100, easing: cubicInOut });
	}

	// 离开时回到原始大小
	function handleMouseLeave() {
		hovering = false;
		scale.set(1, { duration: 100, easing: cubicInOut });
	}

	// 点击旋转 360°，弹出确认框后再执行重置
	async function handleClick() {
		showConfirm('确认重置', '此操作将清空当前战局所有阵营、单位和日志，且无法撤销。是否继续？', async () => {
			await rotate.set(360, { duration: 400, easing: cubicInOut });
			rotate.set(0, { duration: 0 });
			resetCurrentBattle();
			showAlert('已重置', '当前战局已清空所有阵营、单位和日志。');
		});
	}
</script>

<Button
	variant="ghost"
	onclick={handleClick}
	size="icon"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<RotateCcw class="select-none" style="transform: rotate({$rotate}deg) scale({$scale})" />
</Button>
