<script>
	import { Button } from '../ui/button';

	let { title, children } = $props();
</script>

<Button
	variant="ghost"
	class="cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white"
	{title}
>
	{@render children?.()}
</Button>
