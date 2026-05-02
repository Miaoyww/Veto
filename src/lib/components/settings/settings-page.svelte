<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Map, Puzzle, Settings, Info, Sword } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import VenuePage from '$lib/components/settings/pages/common/venue.svelte';
	import ModsPage from '$lib/components/settings/pages/common/mods.svelte';
	import GeneralPage from '$lib/components/settings/pages/common/general.svelte';
	import AboutPage from '$lib/components/settings/pages/common/about.svelte';
	import BattlePage from '$lib/components/settings/pages/battle/battle.svelte';
	import { fly } from 'svelte/transition';
	import Footer from '$lib/components/footer.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let activeSection = $state<Section>('venue');
	const battleId = page.params.battle_id ?? null;
	type Section = 'venue' | 'mods' | 'general' | 'about' | 'battle';

	interface NavItem {
		key: Section;
		label: string;
		icon: typeof Map;
	}

	let NAV_ITEMS: NavItem[] = $state([
		{ key: 'mods', label: 'Mod 管理', icon: Puzzle },
		{ key: 'general', label: '常规', icon: Settings },
		{ key: 'about', label: '关于', icon: Info }
	]);

	onMount(() => {
		if (battleId) {
			NAV_ITEMS.unshift({ key: 'battle', label: '战役', icon: Sword });
			return;
		}
		NAV_ITEMS.unshift({ key: 'venue', label: '会场', icon: Map });
	});
</script>

<div
	class="min-h-screen w-screen bg-gradient-to-br from-slate-100 to-stone-200 dark:from-slate-900 dark:to-stone-900"
>
	<!-- 顶栏：在 fly 动画容器外，sticky 才能正常工作 -->
	<header class="sticky top-0 z-10 flex items-center gap-3 py-4 pl-5 backdrop-blur-sm">
		<Button variant="ghost" size="icon" onclick={() => goto('/')} class="cursor-pointer">
			<ArrowLeft size={18} />
		</Button>
		<h1 class="text-lg font-semibold text-stone-700 dark:text-stone-200">设置</h1>
	</header>

	<div class="flex w-screen flex-col" in:fly={{ y: 16, duration: 300, opacity: 0 }}>
		<!-- 主体 -->
		<div class="flex gap-6 p-5 pb-6">
			<!-- 左侧导航 -->
			<div class="blur-backdrop flex w-36 shrink-0 flex-col gap-1 self-start rounded-lg p-2">
				{#each NAV_ITEMS as item}
					<Button
						class="w-full cursor-pointer justify-start gap-2 px-3"
						variant={activeSection === item.key ? 'secondary' : 'ghost'}
						onclick={() => (activeSection = item.key)}
					>
						<item.icon size={15} />
						<span class="text-sm">{item.label}</span>
					</Button>
				{/each}
			</div>

			<!-- 右侧内容 -->
			<div class="blur-backdrop flex-1 rounded-lg">
				<div class="p-6">
					{#if activeSection === 'venue'}<VenuePage />{/if}
					{#if activeSection === 'battle'}<BattlePage />{/if}
					{#if activeSection === 'mods'}<ModsPage />{/if}
					{#if activeSection === 'general'}<GeneralPage />{/if}
					{#if activeSection === 'about'}<AboutPage />{/if}
				</div>
			</div>
		</div>

		<Footer />
	</div>
</div>
