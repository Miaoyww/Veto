<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import SettingsNav from '$lib/components/settings/settings-nav.svelte';
	import VenuePage from '$lib/components/settings/pages/venue.svelte';
	import ModsPage from '$lib/components/settings/pages/mods.svelte';
	import GeneralPage from '$lib/components/settings/pages/general.svelte';
	import AboutPage from '$lib/components/settings/pages/about.svelte';
	import { fly } from 'svelte/transition';

	let activeSection = $state<'venue' | 'mods' | 'general' | 'about'>('venue');
</script>

<div
	class="flex h-screen w-screen items-center  justify-center bg-gradient-to-br from-slate-100 to-stone-200"
>
	<div
		class="flex h-screen w-screen max-w-5xl flex-col"
		in:fly={{ y: 16, duration: 300, opacity: 0 }}
	>
		<!-- 顶栏 -->
		<header class="flex shrink-0 items-center gap-3 py-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/')}>
				<ArrowLeft size={18} />
			</Button>
			<h1 class="text-lg font-semibold text-stone-700">设置</h1>
		</header>

		<!-- 主体 -->
		<div class="flex flex-1 gap-6 overflow-hidden pb-6 p-5  ">
			<!-- 左侧导航 -->
			<SettingsNav bind:activeSection class="blur-backdrop shrink-0 self-start" />

			<!-- 右侧内容 -->
			<div class="blur-backdrop flex-1 overflow-hidden rounded-lg ">
				<ScrollArea class="h-screen w-full">
					<div class="p-6">
						{#if activeSection === 'venue'}<VenuePage />{/if}
						{#if activeSection === 'mods'}<ModsPage />{/if}
						{#if activeSection === 'general'}<GeneralPage />{/if}
						{#if activeSection === 'about'}<AboutPage />{/if}
					</div>
				</ScrollArea>
			</div>

			<!-- 右侧占位，与左侧导航等宽，使内容区视觉居中 -->
			<div class="w-36 shrink-0"></div>
            
		</div>
        
	</div>
</div>

