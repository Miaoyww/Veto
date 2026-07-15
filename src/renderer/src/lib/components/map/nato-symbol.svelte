<script lang="ts">
	import { getMilSymbolSVG } from '$lib/utils/milsymbol-utils';

	let {
		natoCode,
		side,
		size = 64,
		color
	}: {
		/** 北约功能代码（7 字符），如 "GUCI---" */
		natoCode: string;
		/** 阵营立场，如 "blue" | "red" | "neutral" */
		side: string;
		size?: number;
		/** 阵营自定义颜色，传入时覆盖北约默认配色 */
		color?: string;
	} = $props();

	const svgString = $derived(getMilSymbolSVG(natoCode, side, size, color));
</script>

<span class="milsymbol-icon" style="display:inline-flex;align-items:center;justify-content:center;">
	{@html svgString}
</span>
