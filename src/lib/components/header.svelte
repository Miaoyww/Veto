<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import HeaderLeft from '$lib/components/header/header-left.svelte';
	import HeaderRight from '$lib/components/header/header-right.svelte';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;
	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;
	let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn('absolute top-5 right-5 left-5 z-1000 flex justify-between ', className)}>
	<HeaderLeft />
	<HeaderRight />
</div>
