<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import type {
    AuthenticatedSeatSession,
    Directive,
    News,
    SituationUpdate,
    UserClientSessionProjection,
    WorkflowAudienceProjection
  } from '../../../../../shared'
  import {
    getUserClient,
    initWsPort,
    type ConnectionStatus
  } from '$lib/classes/clients/delegate-client'
  import LoginScreen from '$lib/components/delegate/LoginScreen.svelte'
  import DelegateShell from '$lib/components/delegate/DelegateShell.svelte'
  import DirectivePanel from '$lib/components/delegate/DirectivePanel.svelte'
  import NewsPanel from '$lib/components/delegate/NewsPanel.svelte'
  import SituationTimeline from '$lib/components/delegate/SituationTimeline.svelte'

  let connectionStatus = $state<ConnectionStatus>('disconnected')
  let session = $state<AuthenticatedSeatSession | null>(null)
  let projection = $state<UserClientSessionProjection | null>(null)
  let workflowQueue = $state<WorkflowAudienceProjection>({ directives: [], news: [] })
  let authError = $state('')
  let commandError = $state('')
  let connecting = $state(false)

  const conferenceId = $derived($page.params.conference_id ?? '')
  const capabilities = $derived(session?.identity.capabilities ?? [])
  const authorizedDirectives = $derived(projection?.directives ?? [])
  const authorizedNews = $derived(projection?.news ?? [])
  const situations = $derived(projection?.situations ?? [])

  function resetSession(): void {
    session = null
    projection = null
    workflowQueue = { directives: [], news: [] }
    connecting = false
  }

  function returnToHome(): void {
    resetSession()
    void goto('/')
  }

  function applyProjection(nextProjection: UserClientSessionProjection): void {
    if (nextProjection.conferenceId !== conferenceId) {
      returnToHome()
      return
    }
    projection = nextProjection
  }

  function refreshQueues(): void {
    const client = getUserClient()
    client.querySessionProjection()
    if (capabilities.includes('process_directive') || capabilities.includes('review_news')) {
      client.queryWorkflowQueue()
    }
  }

  function handleAuthenticate(inviteCode: string, password?: string): void {
    authError = ''
    commandError = ''
    connecting = true
    getUserClient().authenticate(inviteCode, password)
  }

  function execute(command: Parameters<ReturnType<typeof getUserClient>['execute']>[0]): void {
    commandError = ''
    getUserClient().execute(command)
  }

  function handleDisconnect(): void {
    getUserClient().disconnect()
    returnToHome()
  }

  function refreshContent(_content: Directive | News | SituationUpdate): void {
    // Events are only an invalidation signal. Re-querying prevents a withdrawn
    // record from surviving locally after the Host removes it from a projection.
    refreshQueues()
  }

  onMount(() => {
    let hadSession = false
    const client = getUserClient()
    client.setCallbacks({
      onConnectionStatus: (status) => {
        connectionStatus = status
      },
      onAuthenticated: (nextSession) => {
        connecting = false
        hadSession = true
        if (nextSession.conferenceId !== conferenceId) {
          returnToHome()
          return
        }
        session = nextSession
        applyProjection(nextSession.projection)
        refreshQueues()
      },
      onAuthError: (error) => {
        connecting = false
        authError = error.message
      },
      onProjection: applyProjection,
      onWorkflowQueue: (nextQueue) => {
        workflowQueue = nextQueue
      },
      onContentChanged: refreshContent,
      onCommandResult: (result) => {
        if (!result.ok) commandError = result.error.message
        refreshQueues()
      },
      onError: (error) => {
        if (session) commandError = error.message
        else {
          connecting = false
          authError = error.message
        }
      },
      onSessionRevoked: () => {
        if (hadSession) returnToHome()
      }
    })

    void initWsPort()
    return () => client.disconnect()
  })
</script>

{#if !session}
  <LoginScreen onAuthenticate={handleAuthenticate} error={authError} {connecting} />
{:else if projection}
  <DelegateShell
    identity={session.identity}
    {capabilities}
    {connectionStatus}
    onDisconnect={handleDisconnect}
    {commandError}
  >
    {#snippet directives()}
      <DirectivePanel
        directives={authorizedDirectives}
        workflowDirectives={workflowQueue.directives}
        seatId={session?.identity.seatId ?? ''}
        targets={projection?.directiveTargets ?? []}
        canSubmit={capabilities.includes('submit_directive')}
        canProcess={capabilities.includes('process_directive')}
        onSubmit={(data) => execute({ type: 'submit_directive', ...data })}
        onClaim={(directiveId) => execute({ type: 'claim_directive', directiveId })}
        onApprove={(directiveId, processingNote) =>
          execute({ type: 'approve_directive', directiveId, processingNote })}
        onReject={(directiveId, processingNote) =>
          execute({ type: 'reject_directive', directiveId, processingNote })}
        onCancel={(directiveId, reason) => execute({ type: 'cancel_directive', directiveId, reason })}
      />
    {/snippet}
    {#snippet news()}
      <NewsPanel
        news={authorizedNews}
        workflowNews={workflowQueue.news}
        canDraft={capabilities.includes('draft_news')}
        canReview={capabilities.includes('review_news')}
        canWithdraw={capabilities.includes('withdraw_news')}
        onSubmit={(data) => execute({ type: 'submit_news', ...data })}
        onReview={(newsId, decision, note) => execute({ type: 'review_news', newsId, decision, note })}
        onWithdraw={(newsId, reason) => execute({ type: 'withdraw_news', newsId, reason })}
      />
    {/snippet}
    {#snippet timeline()}
      <SituationTimeline
        updates={situations}
        timelines={projection?.timelines ?? []}
        canPublish={capabilities.includes('publish_situation')}
        canWithdraw={capabilities.includes('withdraw_situation')}
        onPublish={(data) => execute({ type: 'publish_situation', ...data })}
        onWithdraw={(situationId, reason) => execute({ type: 'withdraw_situation', situationId, reason })}
      />
    {/snippet}
  </DelegateShell>
{/if}
