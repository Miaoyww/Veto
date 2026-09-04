<script lang="ts">
  import type { SeatView, Capability, CabinetMode } from '$lib/classes/types/delegate'
  import type { Snippet } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs'
  import { LogOut, Wifi, WifiOff, Activity } from '@lucide/svelte'
  import type { ConnectionStatus } from '$lib/classes/clients/delegate-client'

  interface Props {
    seat: SeatView
    capabilities: Capability[]
    connectionStatus: ConnectionStatus
    cabinetMode?: CabinetMode
    onDisconnect: () => void
    directives: Snippet
    news: Snippet
    timeline: Snippet
  }

  let {
    seat,
    capabilities,
    connectionStatus,
    cabinetMode,
    onDisconnect,
    directives,
    news,
    timeline
  }: Props = $props()

  let activeTab = $state('status')

  const hasCapability = (cap: Capability): boolean => capabilities.includes(cap)
  const isConnected = $derived(connectionStatus === 'connected')
</script>

<div class="delegate-shell">
  <!-- 顶栏 -->
  <header class="shell-header">
    <div class="header-left">
      <h2 class="text-lg font-semibold">{seat.name}</h2>
      {#if seat.role}
        <Badge variant="secondary">{seat.role}</Badge>
      {/if}
      {#if cabinetMode}
        <Badge variant={cabinetMode === 'crisis' ? 'destructive' : 'outline'}>
          {cabinetMode === 'crisis' ? '危机模式' : '常委模式'}
        </Badge>
      {/if}
    </div>
    <div class="header-right">
      <div class="connection-status" class:connected={isConnected}>
        {#if isConnected}
          <Wifi class="size-4" />
          <span class="text-xs">已连接</span>
        {:else}
          <WifiOff class="size-4" />
          <span class="text-xs">未连接</span>
        {/if}
      </div>
      <Button size="sm" variant="ghost" onclick={onDisconnect}>
        <LogOut class="size-4 mr-1" />
        断开
      </Button>
    </div>
  </header>

  <!-- 标签导航 -->
  <Tabs value={activeTab} onValueChange={(v) => { activeTab = v }} class="shell-tabs">
    <TabsList>
      <TabsTrigger value="status">会议状态</TabsTrigger>
      {#if cabinetMode === 'crisis' && hasCapability('submit_directive')}
        <TabsTrigger value="directives">指令面板</TabsTrigger>
      {/if}
      {#if hasCapability('draft_news') || hasCapability('view_conference')}
        <TabsTrigger value="news">新闻面板</TabsTrigger>
      {/if}
      <TabsTrigger value="timeline">局势更新</TabsTrigger>
    </TabsList>

    <TabsContent value="status">
      <div class="tab-placeholder">
        <Activity class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">会议状态将在此显示</p>
        <p class="text-xs text-muted-foreground">实时同步主席端的状态</p>
      </div>
    </TabsContent>

    <TabsContent value="directives">
      {#if directives}
        {@render directives()}
      {/if}
    </TabsContent>

    <TabsContent value="news">
      {#if news}
        {@render news()}
      {/if}
    </TabsContent>

    <TabsContent value="timeline">
      {#if timeline}
        {@render timeline()}
      {/if}
    </TabsContent>
  </Tabs>
</div>

<style>
  .delegate-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--background);
  }
  .shell-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    -webkit-app-region: drag;
  }
  .shell-header :global(button) {
    -webkit-app-region: no-drag;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--destructive);
  }
  .connection-status.connected {
    color: var(--green-500, #22c55e);
  }
  .shell-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .tab-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 3rem;
  }
</style>
