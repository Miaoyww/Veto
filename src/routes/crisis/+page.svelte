<script>
    import Map from '$lib/components/map/map.svelte';
</script>

<div class="app-container flex flex-col h-screen overflow-hidden">
    
    <div class="relative flex-1 min-h-0 bg-[var(--bg-primary)]">
        <div id="battle-map" class="w-full h-full">
            <Map />
        </div>
    </div>

    <footer class="shrink-0 p-4 bg-gray-800 text-white text-center">
        这是你的 Footer，固定在窗口底部
    </footer>

</div>

<style>
    /* 确保全局没有多余的边距导致 100vh 溢出 */
    :global(html, body) {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden; /* 双重保险，防止 body 层级出现滚动 */
    }

    /* 因为我们用了 Tailwind 的 flex、flex-col、h-screen 等，
       这里的自定义样式可以大幅精简 */
    * {
        box-sizing: border-box;
    }
</style>