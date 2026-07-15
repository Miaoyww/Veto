<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import HeaderLeft from '$lib/components/map/header/header-left.svelte';
	import HeaderRight from '$lib/components/map/header/header-right.svelte';
	import { fly } from 'svelte/transition';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;
	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;
	let { class: className, ...restProps }: Props = $props();
</script>

<div
	class={cn('absolute top-5 right-5 left-5 z-10', className)}
	in:fly={{ y: -8, duration: 320, opacity: 0, delay: 60 }}
>
	<div class="absolute top-0 left-0">
		<HeaderLeft />
	</div>

	<div class="absolute top-0 right-0">
		<HeaderRight />
	</div>
</div>
