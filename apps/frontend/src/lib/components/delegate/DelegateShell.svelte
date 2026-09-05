<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Capability, UserClientIdentity } from '../../../../../shared'
  import type { ConnectionStatus } from '$lib/classes/clients/delegate-client'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Activity, FileArchive, LogOut, Wifi, WifiOff } from '@lucide/svelte'

  interface Props {
    identity: UserClientIdentity
    capabilities: Capability[]
    connectionStatus: ConnectionStatus
    commandError: string
    onDisconnect: () => void
    directives: Snippet
    news: Snippet
    timeline: Snippet
  }

  let {
    identity,
    capabilities,
    connectionStatus,
    commandError,
    onDisconnect,
    directives,
    news,
    timeline
  }: Props = $props()

  let activeTab = $state('status')
  const hasCapability = (capability: Capability): boolean => capabilities.includes(capability)
  const isConnected = $derived(connectionStatus === 'connected')
</script>

<div class="delegate-shell">
  <header class="shell-header">
    <div class="header-left">
      <div>
        <h2 class="text-lg font-semibold">{identity.seatName}</h2>
        <p class="text-xs text-muted-foreground">{identity.committeeName}</p>
      </div>
      {#if identity.role}
        <Badge variant="secondary">{identity.role}</Badge>
      {/if}
    </div>
    <div class="header-right">
      <div class="connection-status" class:connected={isConnected}>
        {#if isConnected}
          <Wifi class="size-4" />
          <span class="text-xs">已连接 Host</span>
        {:else}
          <WifiOff class="size-4" />
          <span class="text-xs">连接已断开</span>
        {/if}
      </div>
      <Button size="sm" variant="ghost" onclick={onDisconnect}>
        <LogOut class="size-4 mr-1" />
        断开
      </Button>
    </div>
  </header>

  <Tabs value={activeTab} onValueChange={(value) => { activeTab = value }} class="shell-tabs">
    <TabsList>
      <TabsTrigger value="status">会议状态</TabsTrigger>
      {#if hasCapability('submit_directive') || hasCapability('process_directive')}
        <TabsTrigger value="directives">指令</TabsTrigger>
      {/if}
      {#if hasCapability('view_news') || hasCapability('draft_news') || hasCapability('review_news')}
        <TabsTrigger value="news">新闻</TabsTrigger>
      {/if}
      {#if hasCapability('view_situation') || hasCapability('publish_situation')}
        <TabsTrigger value="timeline">局势</TabsTrigger>
      {/if}
    </TabsList>

    {#if commandError}
      <Alert variant="destructive" class="m-4 mb-0">
        <AlertDescription>{commandError}</AlertDescription>
      </Alert>
    {/if}

    <TabsContent value="status">
      <div class="tab-placeholder">
        <Activity class="size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">会议内容由 Host Service 按权限同步</p>
      </div>
      <div class="files-placeholder">
        <FileArchive class="size-4" />
        <span>文件功能尚未开放</span>
      </div>
    </TabsContent>

    <TabsContent value="directives">
      {@render directives()}
    </TabsContent>

    <TabsContent value="news">
      {@render news()}
    </TabsContent>

    <TabsContent value="timeline">
      {@render timeline()}
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
  .header-left,
  .header-right,
  .connection-status,
  .files-placeholder {
    display: flex;
    align-items: center;
  }
  .header-left { gap: 0.625rem; }
  .header-right { gap: 0.75rem; }
  .connection-status { gap: 0.375rem; color: var(--destructive); }
  .connection-status.connected { color: var(--green-500, #22c55e); }
  .tab-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem; }
  .files-placeholder { justify-content: center; gap: 0.5rem; color: var(--muted-foreground); font-size: 0.75rem; }
</style>
