<script lang="ts">
	import { settingOpen } from '$lib/stores/crisis/crisis-ui-store';
	import { Button } from '../../ui/button';
	import { Settings } from '@lucide/svelte';
	import { tweened } from 'svelte/motion';
	import { cubicInOut, linear } from 'svelte/easing';

	const rotate = tweened(0, { duration: 300, easing: cubicInOut });
	const scale = tweened(1, { duration: 200, easing: cubicInOut });
	let hovering = false;

	async function handleMouseEnter() {
		hovering = true;
		scale.set(1.15, { duration: 100, easing: cubicInOut });
		while (hovering) {
			// 从 0° → 360° 平滑旋转一圈
			await rotate.set(360, { duration: 4000, easing: linear });
			if (!hovering) break;

			// 立即重置为 0°，不影响视觉连续性
			rotate.set(0, { duration: 0 });
		}
	}

	function handleMouseLeave() {
		hovering = false;
		scale.set(1, { duration: 100, easing: cubicInOut });
		rotate.set(0, { duration: 300, easing: cubicInOut });
	}

	async function openSetting() {
		settingOpen.update((prev) => !prev);
		console.log($settingOpen);

		await rotate.set(180, { duration: 400, easing: cubicInOut });
		rotate.set(0, { duration: 0 });
		hovering = true;
	}
</script>

<Button
	variant="ghost"
	onclick={openSetting}
	size="icon"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<Settings class="select-none" style="transform: rotate({$rotate}deg) scale({$scale})" />
</Button>
