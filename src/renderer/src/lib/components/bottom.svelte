<script lang="ts">
	import SettingsButton from '$lib/components/buttons/settings-button.svelte';
	import { Button } from '$lib/components/ui/button';
	import { coords } from '$lib/stores/battle/map-store';
	import { leftBarPinned, unitsCardOpen } from '$lib/stores/battle/battle-ui-store';
	import {
		flushRuntimePositions,
		interactionMode,
		saveBattlesNow,
		selectFaction
	} from '$lib/stores/battle/battle-store';
	import { Activity, Ruler, Save, Swords } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';

	function toggleLeftSidebar() {
		selectFaction('');
		leftBarPinned.update((prev: boolean) => !prev);
	}

	function save() {
		flushRuntimePositions();
		saveBattlesNow();
		toast.success('已保存', { description: '当前推演状态已保存到浏览器。' });
	}
</script>

<div
	class="absolute right-5 bottom-5 left-5 z-1000 flex items-center justify-center"
	in:fly={{ y: 8, duration: 320, opacity: 0, delay: 60 }}
>
	<div
		class="veto-card h-12 gap-2"
	>
		<Button
			variant="ghost"
			size="icon"
			title="打开左侧栏"
			class={$leftBarPinned ? 'text-foreground' : ''}
			onclick={toggleLeftSidebar}
		>
			<Swords />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			title="测量距离 (M)"
			class={$interactionMode === 'measure' ? 'text-amber-500' : ''}
			onclick={() => interactionMode.set($interactionMode === 'measure' ? 'select' : 'measure')}
		>
			<Ruler />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			title="推演单位态势"
			class={$unitsCardOpen ? 'text-foreground' : ''}
			onclick={() => ($unitsCardOpen = !$unitsCardOpen)}
		>
			<Activity />
		</Button>
		<Button variant="ghost" size="icon" title="保存 (Ctrl+S)" onclick={save}>
			<Save />
		</Button>
		<div class="settings-wrap">
			<SettingsButton />
		</div>
	</div>

	<div
		class="veto-card absolute right-0 h-12"
	>
		坐标: {$coords.lat.toFixed(5)}, {$coords.lng.toFixed(5)}
	</div>
</div>

