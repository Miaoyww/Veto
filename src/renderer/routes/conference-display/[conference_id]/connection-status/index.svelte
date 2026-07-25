<script lang="ts">
  import type { ConnectionStatus } from '$lib/services/conference-display-bridge'

  let { status }: { status: ConnectionStatus } = $props()
</script>

<div class="flex h-full w-full items-center justify-center">
  <div class="flex flex-col items-center gap-6 text-white/10">
    <div class="text-9xl font-light tracking-[0.06em]">
      {status === 'connecting'
        ? '正在连接...'
        : status === 'disconnected'
          ? '连接断开，重连中...'
          : '等待主机连接'}
    </div>
    {#if status === 'disconnected'}
      <div class="text-lg tracking-wider text-white/5">自动重连中，请稍候</div>
    {/if}
  </div>
</div>
