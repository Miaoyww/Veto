<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type {
    AuthenticatedSeatSession,
    Capability,
    CabinetMode,
    Directive,
    News,
    SituationUpdate,
    Classification
  } from '$lib/classes/types/delegate'
  import {
    initWsPort,
    getDelegateBridge,
    onDelegateConnectionStatus
  } from '$lib/classes/clients/delegate-client'
  import type { ConnectionStatus, ConferenceSyncData } from '$lib/classes/clients/delegate-client'
  import type { TimerTickData } from '$lib/classes/types/conference'
  import LoginScreen from '$lib/components/delegate/LoginScreen.svelte'
  import DelegateShell from '$lib/components/delegate/DelegateShell.svelte'
  import DirectivePanel from '$lib/components/delegate/DirectivePanel.svelte'
  import NewsPanel from '$lib/components/delegate/NewsPanel.svelte'
  import SituationTimeline from '$lib/components/delegate/SituationTimeline.svelte'
  import { page } from '$app/stores'

  // ── 状态 ──
  let connectionStatus = $state<ConnectionStatus>('disconnected')
  let authenticated = $state(false)
  let authError = $state('')
  let session = $state<AuthenticatedSeatSession | null>(null)
  const seat = $derived(session?.seat ?? null)
  let capabilities = $state<Capability[]>([])
  let cabinetMode = $state<CabinetMode>('standing')
  let directiveItems = $state<Directive[]>([])
  let newsList = $state<News[]>([])
  let situationUpdates = $state<SituationUpdate[]>([])
  let connecting = $state(false)

  const conferenceId = $derived($page.params.conference_id ?? '')

  // ── 认证 ──
  function handleAuthenticate(inviteCode: string, name: string, password?: string): void {
    authError = ''
    connecting = true
    const bridge = getDelegateBridge()

    bridge.setCallbacks({
      onAuthResult: (result) => {
        connecting = false
        if (result.success && result.session) {
          authenticated = true
          session = result.session
          capabilities = result.session.capabilities
        } else {
          authError = result.error ?? '认证失败'
        }
      },
      onConferenceSync: (data: ConferenceSyncData) => {
        directiveItems = data.directives ?? []
        newsList = data.news ?? []
        situationUpdates = data.situationUpdates ?? []
        capabilities = data.myCapabilities ?? []
      },
      onDirectiveUpdated: (directive: Directive) => {
        directiveItems = directiveItems.map((d) => (d.id === directive.id ? directive : d))
        if (!directiveItems.some((d) => d.id === directive.id)) {
          directiveItems = [...directiveItems, directive]
        }
      },
      onNewsUpdated: (news: News) => {
        newsList = newsList.map((n) => (n.id === news.id ? news : n))
        if (!newsList.some((n) => n.id === news.id)) {
          newsList = [...newsList, news]
        }
      },
      onSituationCreated: (update: SituationUpdate) => {
        if (!situationUpdates.some((s) => s.id === update.id)) {
          situationUpdates = [...situationUpdates, update]
        }
      },
      onModeChange: (seatGroupId: string, mode: CabinetMode) => {
        if (session?.seatGroupId === seatGroupId) {
          cabinetMode = mode
        }
      }
    })

    bridge.authenticate(inviteCode, name, password)
  }

  function handleDisconnect(): void {
    const bridge = getDelegateBridge()
    bridge.disconnect()
    authenticated = false
    session = null
    capabilities = []
    authError = ''
  }

  // ── 指令操作 ──
  function handleCreateDirective(data: {
    title: string
    content: string
    target: string
    classification: Classification
  }): void {
    const bridge = getDelegateBridge()
    bridge.createDirective({
      ...data,
      initiatorId: seat?.id,
      initiatorRole: seat?.role,
      cabinetId: session?.seatGroupId,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  function handleResubmitDirective(directiveId: string): void {
    const bridge = getDelegateBridge()
    bridge.updateDirective({
      id: directiveId,
      status: 'submitted',
      updatedAt: Date.now()
    })
  }

  // ── 新闻操作 ──
  function handleCreateNews(data: { title: string; content: string; source: string }): void {
    const bridge = getDelegateBridge()
    bridge.createNews({
      ...data,
      authorId: seat?.id,
      seatGroupId: session?.seatGroupId,
      status: 'draft',
      createdAt: Date.now()
    })
  }

  function handleSubmitNews(newsId: string): void {
    const bridge = getDelegateBridge()
    bridge.submitNews(newsId)
  }

  // ── 生命周期 ──
  onMount(async () => {
    await initWsPort()
    const unsubConn = onDelegateConnectionStatus((status) => {
      connectionStatus = status
    })
    onDestroy(() => {
      unsubConn()
    })
  })
</script>

{#if !authenticated}
  <LoginScreen onAuthenticate={handleAuthenticate} error={authError} {connecting} />
{:else if seat}
  <DelegateShell
    {seat}
    {capabilities}
    {connectionStatus}
    {cabinetMode}
    onDisconnect={handleDisconnect}
  >
    {#snippet directives()}
      <DirectivePanel
        directives={directiveItems}
        seatId={seat.id}
        seatRole={seat.role ?? ''}
        cabinetId={session?.seatGroupId ?? ''}
        onCreateDirective={handleCreateDirective}
        onResubmit={handleResubmitDirective}
      />
    {/snippet}
    {#snippet news()}
      <NewsPanel
        {newsList}
        seatId={seat.id}
        seatGroupId={session?.seatGroupId ?? ''}
        canDraftNews={capabilities.includes('draft_news')}
        onCreateNews={handleCreateNews}
        onSubmitNews={handleSubmitNews}
      />
    {/snippet}
    {#snippet timeline()}
      <SituationTimeline updates={situationUpdates} />
    {/snippet}
  </DelegateShell>
{/if}
