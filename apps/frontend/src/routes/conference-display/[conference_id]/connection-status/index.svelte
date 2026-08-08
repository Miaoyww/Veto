<script lang="ts">
  import { Wifi, WifiOff, LoaderCircle } from '@lucide/svelte'
  import type { ConnectionStatus } from '$lib/services/conference-display-bridge'

  let { status }: { status: ConnectionStatus } = $props()
</script>

<div class="flex h-full w-full items-center justify-center">
  <div class="flex flex-col items-center gap-6 text-white/10">
    {#if status === 'connecting'}
      <LoaderCircle size={64} class="animate-spin text-white/10" />
      <div class="text-7xl font-light tracking-[0.06em]">正在连接...</div>
      <div class="text-lg tracking-wider text-white/5">CONNECTING</div>
    {:else if status === 'disconnected'}
      <WifiOff size={64} />
      <div class="text-7xl font-light tracking-[0.06em]">连接断开</div>
      <div class="text-lg tracking-wider text-white/5">RECONNECTING</div>
      <div class="text-base tracking-wider text-white/5">自动重连中，请稍候</div>
    {:else}
      <!-- connected but no data yet -->
      <Wifi size={64} />
      <div class="text-7xl font-light tracking-[0.06em]">等待数据</div>
      <div class="text-lg tracking-wider text-white/5">AWAITING DATA</div>
    {/if}
  </div>
</div>
