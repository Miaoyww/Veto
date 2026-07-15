<script>
	import { Button } from '../ui/button';

	let { children } = $props();
</script>

<Button
	variant="ghost"
	class="cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white dark:text-stone-300"
>
		{@render children?.()}
</Button>
