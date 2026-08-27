<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type {
    Seat,
    Capability,
    CabinetMode,
    Directive,
    News,
    SituationUpdate,
    Classification
  } from '$lib/types-delegate'
  import {
    initWsPort,
    getDelegateBridge,
    onDelegateConnectionStatus
  } from '$lib/classes/services/delegate-bridge'
  import type { ConnectionStatus, ConferenceSyncData } from '$lib/classes/services/delegate-bridge'
  import type { TimerTickData } from '$lib/types-conference'
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
  let seat = $state<Seat | null>(null)
  let capabilities = $state<Capability[]>([])
  let cabinetMode = $state<CabinetMode>('standing')
  let directives = $state<Directive[]>([])
  let newsList = $state<News[]>([])
  let situationUpdates = $state<SituationUpdate[]>([])
  let connecting = $state(false)

  const conferenceId = $derived($page.params.conference_id ?? '')

  // ── 认证 ──
  function handleAuthenticate(inviteCode: string, password: string): void {
    authError = ''
    connecting = true
    const bridge = getDelegateBridge()

    bridge.setCallbacks({
      onAuthResult: (result) => {
        connecting = false
        if (result.success && result.seat) {
          authenticated = true
          seat = result.seat
          capabilities = result.capabilities ?? []
        } else {
          authError = result.error ?? '认证失败'
        }
      },
      onConferenceSync: (data: ConferenceSyncData) => {
        directives = data.directives ?? []
        newsList = data.news ?? []
        situationUpdates = data.situationUpdates ?? []
        capabilities = data.myCapabilities ?? []
      },
      onDirectiveUpdated: (directive: Directive) => {
        directives = directives.map((d) => (d.id === directive.id ? directive : d))
        if (!directives.some((d) => d.id === directive.id)) {
          directives = [...directives, directive]
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
        if (seat && seat.seatGroupId === seatGroupId) {
          cabinetMode = mode
        }
      }
    })

    bridge.authenticate(inviteCode, password)
  }

  function handleDisconnect(): void {
    const bridge = getDelegateBridge()
    bridge.disconnect()
    authenticated = false
    seat = null
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
      cabinetId: seat?.seatGroupId,
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
      seatGroupId: seat?.seatGroupId,
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
        {directives}
        seatId={seat.id}
        seatRole={seat.role ?? ''}
        cabinetId={seat.seatGroupId}
        onCreateDirective={handleCreateDirective}
        onResubmit={handleResubmitDirective}
      />
    {/snippet}
    {#snippet news()}
      <NewsPanel
        {newsList}
        seatId={seat.id}
        seatGroupId={seat.seatGroupId}
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
