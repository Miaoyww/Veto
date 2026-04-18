<script lang="ts">
	import RightSidebarMenubutton from '$lib/components/buttons/right-sidebar-menubutton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Ruler, Save, Activity } from '@lucide/svelte';
	import SettingsButton from '$lib/components/buttons/right-bar/settings-button.svelte';
	import { rightBarPinned } from '$lib/stores/crisis/crisis-ui-store';
	import PinButton from '../buttons/right-bar/pin-button.svelte';
	import { flushRuntimePositions, saveBattlesNow, interactionMode } from '$lib/stores/crisis/battle-store';
	import { toast } from 'svelte-sonner';
	import UnitsCard from '$lib/components/map/cards/units-card.svelte';
	import { unitsCardOpen } from '$lib/stores/crisis/crisis-ui-store';

	// 是否鼠标悬停
	let hover = $state(false);

	function save() {
		flushRuntimePositions();
		saveBattlesNow();
		toast.success('已保存', { description: '当前推演状态已保存到浏览器。' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div
	class="sidebar absolute top-30 bottom-30 z-1000 flex w-15 flex-1 flex-col justify-between overflow-hidden rounded-lg bg-background/75 backdrop-blur-md"
	style:right={$rightBarPinned ? '20px' : hover ? '0px' : '-50px'}
	on:mouseenter={() => (hover = true)}
	on:mouseleave={() => (hover = false)}
>
	<div class="toggle-btn">
		<PinButton />
	</div>

	<div class="panel-section">
		<div class="controls">
			<RightSidebarMenubutton title="测量距离 (M)">
				<Button
					variant="ghost"
					size="icon"
					class={$interactionMode === 'measure' ? 'text-amber-500' : ''}
					onclick={() => interactionMode.set($interactionMode === 'measure' ? 'select' : 'measure')}
				>
					<Ruler />
				</Button>
			</RightSidebarMenubutton>
			<RightSidebarMenubutton title="推演单位态势">
				<Button
					variant="ghost"
					size="icon"
				class={$unitsCardOpen ? 'text-foreground' : ''}
				onclick={() => ($unitsCardOpen = !$unitsCardOpen)}
				>
					<Activity />
				</Button>
			</RightSidebarMenubutton>
		</div>
	</div>

	<div class="panel-section">
		<div class="controls">
			<RightSidebarMenubutton title="保存 (Ctrl+S)">
				<Button variant="ghost" size="icon" onclick={save}>
					<Save />
				</Button>
			</RightSidebarMenubutton>
			<RightSidebarMenubutton title="设置">
				<SettingsButton />
			</RightSidebarMenubutton>
		</div>
	</div>
</div>

<UnitsCard bind:open={$unitsCardOpen} />

<style>
	.sidebar {
		transition: right 0.3s;
	}

	.toggle-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		height: 50px;
	}

	.panel-section {
		padding: 10px;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
