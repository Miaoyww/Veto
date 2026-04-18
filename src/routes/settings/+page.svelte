<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import SettingsNav from '$lib/components/settings/settings-nav.svelte';
	import VenuePage from '$lib/components/settings/pages/venue.svelte';
	import ModsPage from '$lib/components/settings/pages/mods.svelte';
	import GeneralPage from '$lib/components/settings/pages/general.svelte';
	import AboutPage from '$lib/components/settings/pages/about.svelte';
	import { fly } from 'svelte/transition';
	import Footer from '$lib/components/footer.svelte';

	let activeSection = $state<'venue' | 'mods' | 'general' | 'about'>('venue');
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

	<div
		class="flex w-screen flex-col"
		in:fly={{ y: 16, duration: 300, opacity: 0 }}
	>
		<!-- 主体 -->
		<div class="flex gap-6 pb-6 p-5">
			<!-- 左侧导航 -->
			<SettingsNav bind:activeSection class="blur-backdrop shrink-0 self-start" />

			<!-- 右侧内容 -->
			<div class="blur-backdrop flex-1 rounded-lg">
				<div class="p-6">
					{#if activeSection === 'venue'}<VenuePage />{/if}
					{#if activeSection === 'mods'}<ModsPage />{/if}
					{#if activeSection === 'general'}<GeneralPage />{/if}
					{#if activeSection === 'about'}<AboutPage />{/if}
				</div>
			</div>
		</div>

		<Footer />
	</div>
</div>

