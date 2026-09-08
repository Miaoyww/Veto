<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { cn } from '$lib/classes/utils'
  import { Badge } from '$lib/components/ui/badge'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { Spinner } from '$lib/components/ui/spinner'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import * as Card from '$lib/components/ui/card'
  import * as Alert from '$lib/components/ui/alert'
  import {
    ArrowRightLeft,
    ChevronDown,
    CircleAlert,
    KeyRound,
    LayoutDashboard,
    LoaderCircle,
    LockKeyhole,
    Newspaper,
    Play,
    Power,
    Radio,
    RefreshCw,
    Server,
    ShieldCheck,
    Square
  } from '@lucide/svelte'
  import {
    runHostPreflight,
    type HostStatus,
    type HostCheckId,
    type HostCheckState
  } from '$lib/classes/services/host-preflight'
  import { waitForHostCooldown } from '$lib/classes/services/host-cooldown'
  import { conferences, openConference } from '$lib/classes/stores/conference/conference-store'
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { PHASE_LABELS } from '$lib/classes/services/engine/conference-engine'
  import { resolve } from '$app/paths'
  import { goto } from '$app/navigation'

  let ready = $state(false)
  let copied = $state('')
  let conferencesOpen = $state(true)
  let hostAvailable = $state(false)
  let hostStatus = $state<HostStatus | null>(null)
  let hostStatusError = $state('')
  let hostOperation = $state<'idle' | 'refreshing' | 'checking' | 'starting' | 'stopping'>('idle')
  const hostBusy = $derived(hostOperation !== 'idle')
  const hostStarting = $derived(hostOperation === 'checking' || hostOperation === 'starting')
  const checkLabels: Record<HostCheckId, string> = {
    console: 'Host 控制台',
    conference: '大会配置',
    network: '局域网服务'
  }
  let hostChecks = $state<Array<{ id: HostCheckId; state: HostCheckState }>>([])
  const failedHostCheck = $derived(hostChecks.find((check) => check.state === 'failed'))
  let preflightController: AbortController | null = null

  // 大会总览直接由 conference_id 定位 Conference 根实体。
  const conferenceId = $derived($page.params.conference_id ?? '')
  const event = $derived.by(() => {
    return $conferences.find((conference) => conference.id === conferenceId) ?? null
  })
  const committees = $derived(event?.committees ?? [])
  const seatCount = $derived(
    event?.committees.reduce((sum, committee) => sum + committee.seats.length, 0) ?? 0
  )
  const isHostActive = $derived(hostStatus?.activeConferenceId === conferenceId)
  const activeHostConferenceName = $derived(
    hostStatus?.conferences.find((item) => item.id === hostStatus?.activeConferenceId)?.name ??
      hostStatus?.activeConferenceId
  )

  const hostStateLabel = $derived(
    hostStarting ? '启动中' : isHostActive ? '运行中' : hostStatus ? '关闭' : '状态未知'
  )

  async function readHostStatus(): Promise<HostStatus> {
    const result = await window.veto.hostConsole.status()
    if (!result.ok) throw new Error(result.error ?? '无法读取 Host 状态')
    return {
      activeConferenceId: result.activeConferenceId ?? null,
      conferences: result.conferences ?? []
    }
  }

  async function refreshHostStatus(): Promise<void> {
    if (!hostAvailable || hostBusy) return
    hostOperation = 'refreshing'
    hostStatusError = ''
    const animation = new Promise<void>((resolve) => setTimeout(resolve, 600))
    try {
      hostStatus = await readHostStatus()
    } catch (error) {
      hostStatusError = error instanceof Error ? error.message : '无法读取 Host 状态'
    } finally {
      await animation
      hostOperation = 'idle'
    }
  }

  async function setHostConference(action: 'start' | 'stop'): Promise<void> {
    if (!hostAvailable || hostBusy || !hostStatus || !event) return
    if (action === 'stop' && !isHostActive) return
    const targetId = conferenceId
    hostOperation = action === 'start' ? 'checking' : 'stopping'
    hostStatusError = ''
    const fallback = action === 'start' ? '启动大会失败' : '停止大会失败'
    const controller = new AbortController()
    preflightController = controller
    try {
      if (action === 'start') {
        hostChecks = (Object.keys(checkLabels) as HostCheckId[]).map((id) => ({
          id,
          state: 'pending'
        }))
        hostStatus = await runHostPreflight({
          conferenceId: targetId,
          readStatus: readHostStatus,
          getPort: () => window.veto.ws.getPort(),
          fetchHealth: async (url, signal) => {
            const response = await fetch(url, { signal, cache: 'no-store' })
            if (!response.ok) throw new Error('局域网服务不可用，请检查 Host 后重试。')
            return response.json()
          },
          signal: controller.signal,
          onCheck: (id, state) => {
            hostChecks = hostChecks.map((check) => (check.id === id ? { ...check, state } : check))
          }
        })
        controller.signal.throwIfAborted()
        if (conferenceId !== targetId) return
        hostOperation = 'starting'
      }
      const result = (await (action === 'start'
        ? window.veto.hostConsole.startConference(targetId)
        : window.veto.hostConsole.stopConference())) as {
        ok?: boolean
        error?: string | { message?: string }
      }
      if (result.ok === false) {
        hostStatusError =
          (typeof result.error === 'string' ? result.error : result.error?.message) ?? fallback
      } else {
        controller.signal.throwIfAborted()
        await waitForHostCooldown(controller.signal)
      }
      controller.signal.throwIfAborted()
      if (conferenceId !== targetId) return
      hostStatus = await readHostStatus()
      if (action === 'stop' && result.ok !== false) hostChecks = []
    } catch (error) {
      if (!controller.signal.aborted) {
        hostStatusError = error instanceof Error ? error.message : fallback
      }
    } finally {
      preflightController = null
      hostOperation = 'idle'
    }
  }

  $effect(() => {
    conferenceId
    hostChecks = []
    hostStatusError = ''
    return () => preflightController?.abort()
  })

  async function copyText(text: string, marker: string): Promise<void> {
    await navigator.clipboard.writeText(text)
    copied = marker
    setTimeout(() => {
      if (copied === marker) copied = ''
    }, 1600)
  }

  function allKeys(): string {
    return (
      event?.committees
        .flatMap((committee) =>
          committee.seats.map((seat) => {
            const inviteCode =
              event?.seatAccesses.find((access) => access.seatId === seat.id)?.inviteCode ?? ''
            return `${committee.name},${seat.name},${seat.role ?? ''},${inviteCode}`
          })
        )
        .join('\n') ?? ''
    )
  }

  onMount(() => {
    openConference(conferenceId)
    ready = true
    hostAvailable = Boolean(window.veto?.hostConsole)
    void refreshHostStatus()
    return () => preflightController?.abort()
  })
</script>

<div class="flex h-screen min-h-0 flex-col bg-background">
  {#if !ready}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>
  {:else if !event}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      未找到大会
    </div>
  {:else}
    <header class="shrink-0 border-b px-8 py-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="truncate text-xl font-semibold">{event.name}</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {event.organizer ?? '未指定主办方'} · {new Date(event.createdAt).toLocaleDateString(
              'zh-CN'
            )}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="outline">{committees.length} 场会场</Badge>
          <Badge variant="outline">{seatCount} 个席位</Badge>
          <Button
            variant="outline"
            size="sm"
            class="gap-2"
            disabled={seatCount === 0}
            onclick={() => void copyText(allKeys(), 'all')}
          >
            <KeyRound class="size-4" />
            {copied === 'all' ? '已复制' : '复制全部 key'}
          </Button>
        </div>
      </div>
    </header>

    <ScrollArea class="min-h-0 flex-1">
      <div class="flex flex-col gap-6 px-8 py-6">
        {#if hostAvailable}
          <Card.Root class="host-card overflow-hidden" aria-label="Host 大会服务">
            <Card.Header>
              <Card.Title>
                <span class="flex items-center gap-2"
                  ><Server class="size-4" aria-hidden="true" />Host 大会服务</span
                >
              </Card.Title>
              <Card.Description>在本机托管当前大会，供局域网内的客户端连接。</Card.Description>
              <Card.Action>
                <Button
                  size="icon"
                  variant="outline"
                  class="size-11 rounded-full"
                  title="刷新 Host 状态"
                  aria-label="刷新 Host 状态"
                  aria-busy={hostOperation === 'refreshing'}
                  disabled={hostBusy}
                  onclick={() => void refreshHostStatus()}
                >
                  <RefreshCw
                    class={cn(hostOperation === 'refreshing' && 'host-refresh-spin')}
                    aria-hidden="true"
                  />
                </Button>
              </Card.Action>
            </Card.Header>
            <Card.Content class="flex flex-col gap-3" aria-live="polite">
              <div class="flex items-center gap-4 py-2">
                <div
                  class={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground',
                    isHostActive && 'host-running'
                  )}
                >
                  {#if hostStarting}
                    <LoaderCircle class="size-6 motion-safe:animate-spin" aria-hidden="true" />
                  {:else if isHostActive}
                    <Radio class="size-6" aria-hidden="true" />
                  {:else}
                    <Power class="size-6" aria-hidden="true" />
                  {/if}
                </div>
                <div class="flex min-w-0 flex-col gap-1">
                  <p class={cn('text-lg font-semibold', isHostActive && 'host-running-text')}>
                    {hostStateLabel}
                  </p>
                  <p class="break-words text-sm text-muted-foreground">{event.name}</p>
                </div>
              </div>
              {#if hostStatus?.activeConferenceId && !isHostActive && !hostStarting}
                <Alert.Root>
                  <ArrowRightLeft aria-hidden="true" />
                  <Alert.Title>另一场大会正在运行</Alert.Title>
                  <Alert.Description
                    >启动后将从「{activeHostConferenceName}」切换到当前大会。</Alert.Description
                  >
                </Alert.Root>
              {/if}
              {#if hostStatusError}
                <Alert.Root variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <Alert.Title
                    >{failedHostCheck
                      ? `启动自检未通过：${checkLabels[failedHostCheck.id]}`
                      : 'Host 操作未完成'}</Alert.Title
                  >
                  <Alert.Description>{hostStatusError}</Alert.Description>
                </Alert.Root>
              {/if}
            </Card.Content>
            <Card.Footer
              class="flex flex-col items-stretch gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="flex items-center gap-2 text-xs text-muted-foreground">
                {#if hostStarting}
                  <LockKeyhole class="size-4 shrink-0" aria-hidden="true" />
                  {hostOperation === 'checking'
                    ? '自检期间已锁定启停操作'
                    : '自检通过，正在启动大会'}
                {:else if isHostActive}
                  <Radio class="size-4 shrink-0" aria-hidden="true" />
                  大会服务已对局域网开放
                {:else}
                  <ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
                  自检通过后自动启动
                {/if}
              </p>
              {#if isHostActive && !hostStarting}
                <Button
                  variant="outline"
                  class="h-11 shrink-0"
                  disabled={hostBusy}
                  onclick={() => void setHostConference('stop')}
                >
                  {#if hostOperation === 'stopping'}<Spinner
                      data-icon="inline-start"
                      aria-label="正在终止大会"
                    />{:else}<Square data-icon="inline-start" aria-hidden="true" />{/if}
                  {hostOperation === 'stopping' ? '正在停止' : '停止大会'}
                </Button>
              {:else}
                <Button
                  class="h-11 shrink-0"
                  disabled={hostBusy || !hostStatus}
                  onclick={() => void setHostConference('start')}
                >
                  {#if hostStarting}<Spinner
                      data-icon="inline-start"
                      aria-label="正在启动大会"
                    />{:else}<Play data-icon="inline-start" aria-hidden="true" />{/if}
                  {hostOperation === 'checking'
                    ? '正在自检'
                    : hostOperation === 'starting'
                      ? '正在启动'
                      : '自检并启动'}
                </Button>
              {/if}
            </Card.Footer>
          </Card.Root>
        {/if}

        <Collapsible.Root bind:open={conferencesOpen}>
          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold">会场</h2>
              <Collapsible.Trigger
                aria-label={conferencesOpen ? '收起会场列表' : '展开会场列表'}
                title={conferencesOpen ? '收起会场列表' : '展开会场列表'}
                class={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'transition-transform',
                  conferencesOpen && 'rotate-180'
                )}
              >
                <ChevronDown />
                <span class="sr-only">{conferencesOpen ? '收起会场列表' : '展开会场列表'}</span>
              </Collapsible.Trigger>
            </div>
            <Collapsible.Content>
              <div class="grid gap-4 xl:grid-cols-2">
                {#each committees as committee (committee.id)}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div
                    class="flex flex-wrap items-center justify-between gap-3 border rounded-2xl bg-card p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onclick={() =>
                      goto(resolve(`/conference/${event.id}/committee/${committee.id}`))}
                  >
                    <div class="min-w-0 flex-1">
                      <h3 class="truncate text-base font-semibold">{committee.name}</h3>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {PHASE_LABELS[committee.phase] ?? committee.phase}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="gap-2"
                      href={resolve(`/conference/${event.id}/committee/${committee.id}`)}
                    >
                      <LayoutDashboard class="size-4" />
                    </Button>
                  </div>
                {:else}
                  <p
                    class="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    暂无会场
                  </p>
                {/each}
              </div>
            </Collapsible.Content>
          </section>
        </Collapsible.Root>

        <section class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-lg border p-4">
            <div class="flex items-center gap-2">
              <ShieldCheck class="size-4 text-primary" />
              <h2 class="text-sm font-semibold">角色模板</h2>
            </div>
            <div class="mt-3 flex flex-col gap-2">
              {#each event.roleTemplates as role (role.id)}
                <div class="rounded-md border px-3 py-2">
                  <div class="text-sm font-medium">{role.name}</div>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {role.capabilities.length} 项权限
                  </p>
                </div>
              {/each}
            </div>
          </article>

          <article class="rounded-lg border p-4">
            <div class="flex items-center gap-2">
              <Newspaper class="size-4 text-primary" />
              <h2 class="text-sm font-semibold">全局内容</h2>
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-md border px-3 py-2">
                <dt class="text-xs text-muted-foreground">新闻</dt>
                <dd class="mt-1 font-medium">{event.news.length}</dd>
              </div>
              <div class="rounded-md border px-3 py-2">
                <dt class="text-xs text-muted-foreground">局势</dt>
                <dd class="mt-1 font-medium">{event.situationUpdates.length}</dd>
              </div>
            </dl>
          </article>
        </section>
      </div>
    </ScrollArea>
  {/if}
</div>

<style>
  /* Hallmark · component: Host card · modern-minimal · existing Veto tokens
   * pre-emit critique: P4 H4 E4 S5 R4 V4 */
  :global(.host-card) {
    --host-running-foreground: var(--color-green-700);
    --host-running-background: var(--color-green-50);
  }

  :global(.dark .host-card) {
    --host-running-foreground: var(--color-green-400);
    --host-running-background: color-mix(in srgb, var(--color-green-400) 12%, var(--card));
  }

  .host-running {
    color: var(--host-running-foreground);
    background: var(--host-running-background);
  }

  .host-running-text {
    color: var(--host-running-foreground);
  }

  :global(.host-refresh-spin) {
    animation: host-refresh 600ms linear infinite;
  }

  @keyframes host-refresh {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.host-refresh-spin) {
      animation: none;
    }
  }
</style>
