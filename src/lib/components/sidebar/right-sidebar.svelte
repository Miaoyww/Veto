<script lang="ts">
	import RightSidebarMenubutton from '$lib/components/buttons/right-sidebar-menubutton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Grid3x3, Ruler, Save, Activity } from '@lucide/svelte';
	import SettingsButton from '$lib/components/buttons/right-bar/settings-button.svelte';
	import ResetButton from '$lib/components/buttons/right-bar/reset-button.svelte';
	import { rightBarPinned } from '$lib/stores/sidebar-store';
	import PinButton from '../buttons/right-bar/pin-button.svelte';
	import { showAlert } from '$lib/stores/alert-dialog-store';
	import SimUnitsCard from '$lib/components/cards/simulation/sim-units-card.svelte';

	// 是否鼠标悬停
	let hover = $state(false);

	// 计算最终展开状态
	let expanded = $derived($rightBarPinned || hover);

	function togglePin() {
		rightBarPinned.update((prev) => !prev);
	}

	let simUnitsOpen = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div
	class="sidebar blur-backdrop absolute top-30 bottom-30 z-1000 flex w-15 flex-1 flex-col justify-between overflow-hidden rounded-lg"
	style:right={$rightBarPinned ? '20px' : hover ? '0px' : '-50px'}
	on:mouseenter={() => (hover = true)}
	on:mouseleave={() => (hover = false)}
>
	<div class="toggle-btn">
		<PinButton />
	</div>

	<div class="panel-section">
		<div class="controls">
			<RightSidebarMenubutton title="测量距离">
				<Button variant="ghost" size="icon">
					<Ruler />
				</Button>
			</RightSidebarMenubutton>
			<RightSidebarMenubutton title="推演单位态势">
				<Button
					variant="ghost"
					size="icon"
					class={simUnitsOpen ? 'text-foreground' : ''}
					onclick={() => (simUnitsOpen = !simUnitsOpen)}
				>
					<Activity />
				</Button>
			</RightSidebarMenubutton>
		</div>
	</div>

	<div class="panel-section">
		<div class="controls">
			<RightSidebarMenubutton title="保存">
				<Button variant="ghost" size="icon" onclick={() => showAlert('已保存', '当前推演状态已自动保存到浏览器。')}>
					<Save />
				</Button>
			</RightSidebarMenubutton>
			<RightSidebarMenubutton title="设置">
				<SettingsButton />
			</RightSidebarMenubutton>
		</div>
	</div>
</div>

<SimUnitsCard bind:open={simUnitsOpen} />

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
