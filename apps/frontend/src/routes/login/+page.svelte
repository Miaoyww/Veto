<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { fly } from 'svelte/transition'
  import {
    Loader2,
    LogIn,
    MonitorPlay,
    Network,
    Plus,
    RefreshCw,
    Server
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Badge } from '$lib/components/ui/badge'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { Separator } from '$lib/components/ui/separator'
  import DescContent from '$lib/components/login/desc-content.svelte'
  import WindowControls from '$lib/components/app-sidebar/window-controls.svelte'
  import favicon from '$lib/assets/favicon.png'
  import { PHASE_LABELS } from '$lib/engine/conference-engine'
  import { setOffline } from '$lib/stores/auth-store'
  import { setExternalWsUrl } from '$lib/services/conference-display-bridge'

  interface LanMeeting {
    conferenceId: string
    name: string
    phase: string
    host: string
    port: number
    wsUrl: string
  }

  let meetings = $state<LanMeeting[]>([])
  let scanning = $state(false)
  let scanError = $state('')
  let manualAddress = $state('')
  let manualBusy = $state(false)
  let manualError = $state('')

  async function scan(): Promise<void> {
    scanning = true
    scanError = ''

    try {
      if (!window.veto?.lan) {
        scanError = '请通过 Veto Electron 客户端加入会议'
        meetings = []
        return
      }
      meetings = await window.veto.lan.scan()
    } catch {
      scanError = '扫描失败，请检查网络或使用手动连接'
    } finally {
      scanning = false
    }
  }

  function join(meeting: LanMeeting): void {
    if (!window.veto?.lan) {
      scanError = '请通过 Veto Electron 客户端加入会议'
      return
    }

    scanError = ''
    setExternalWsUrl(meeting.wsUrl)
    goto(resolve('/conference-display/[conference_id]', {
      conference_id: meeting.conferenceId
    }))
  }

  async function joinManual(event: Event): Promise<void> {
    event.preventDefault()
    const value = manualAddress.trim()
    if (!value) return

    manualBusy = true
    manualError = ''

    try {
      if (!window.veto?.lan) {
        manualError = '请通过 Veto Electron 客户端加入会议'
        return
      }

      const meeting = await window.veto.lan.queryConference(value)
      if (!meeting) {
        manualError = '该地址上没有正在开放的会议'
        return
      }
      join(meeting)
    } catch {
      manualError = '无法连接到该会议地址'
    } finally {
      manualBusy = false
    }
  }

  function enterOrganizerMode(): void {
    setOffline(true)
    goto(resolve('/'))
  }

  onMount(scan)
</script>

<div class="relative min-h-svh overflow-hidden bg-background">
  <div class="absolute inset-0 bg-linear-to-br from-primary/15 via-background to-background"></div>

  <div class="absolute left-8 top-12 z-20 flex items-center gap-3 text-sm font-medium">
    <div class="flex size-9 items-center justify-center">
      <img src={favicon} alt="Veto" class="size-8" />
    </div>
    <span class="text-lg">Veto</span>
  </div>

  <div class="absolute left-0 right-0 top-0 z-20 flex h-9 items-center">
    <div class="drag-region h-full flex-1"></div>
    <WindowControls />
  </div>

  <div class="relative z-10 flex min-h-svh items-center justify-center">
    <div class="flex w-full max-w-7xl items-center">
      <DescContent />

      <section class="flex w-full items-center justify-center px-6 py-12 lg:w-[560px]">
        <Card.Root class="w-full max-w-md rounded-2xl border bg-card/90 p-0 shadow-2xl backdrop-blur-xl">
          <Card.Header class="p-6 pb-4">
            <Card.Title class="text-2xl font-bold">加入会议</Card.Title>
            <Card.Description class="text-sm text-muted-foreground">
              局域网会议会自动出现在下方
            </Card.Description>
          </Card.Header>

          <Card.Content class="px-6 pb-5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-sm font-medium">
                <Network class="size-4 text-primary" />
                附近的会议
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={scanning}
                onclick={() => void scan()}
                title="重新扫描"
              >
                {#if scanning}
                  <Loader2 class="size-4 animate-spin" />
                {:else}
                  <RefreshCw class="size-4" />
                {/if}
              </Button>
            </div>

            <ScrollArea class="-mr-3 mt-3 h-44 pr-3">
              {#if meetings.length > 0}
                <div class="flex flex-col gap-2">
                  {#each meetings as meeting (meeting.conferenceId)}
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-lg border bg-background/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      onclick={() => join(meeting)}
                    >
                      <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Server class="size-4" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{meeting.name}</span>
                        <span class="block truncate text-xs text-muted-foreground">
                          {meeting.host}:{meeting.port}
                        </span>
                      </span>
                      <Badge variant="outline" class="max-w-24 shrink-0 truncate text-[10px]">
                        {PHASE_LABELS[meeting.phase as keyof typeof PHASE_LABELS] ?? meeting.phase}
                      </Badge>
                      <LogIn class="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  {/each}
                </div>
              {:else if scanning}
                <div class="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 class="mr-2 size-4 animate-spin" />
                  正在扫描
                </div>
              {:else}
                <div
                  class="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                  in:fly={{ y: 4, duration: 180 }}
                >
                  <Network class="size-5 opacity-50" />
                  {scanError || '暂无会议'}
                </div>
              {/if}
            </ScrollArea>

            <div class="relative mt-5 h-5">
              <Separator class="absolute top-1/2" />
              <span
                class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground"
              >
                手动连接
              </span>
            </div>

            <form class="mt-4 flex gap-2" onsubmit={joinManual}>
              <Input
                placeholder="192.168.1.10:19527"
                bind:value={manualAddress}
                disabled={manualBusy}
              />
              <Button type="submit" disabled={manualBusy || !manualAddress.trim()}>
                {#if manualBusy}
                  <Loader2 class="size-4 animate-spin" />
                {:else}
                  <LogIn class="size-4" />
                {/if}
                加入
              </Button>
            </form>
            {#if manualError}
              <p class="mt-2 text-xs text-destructive">{manualError}</p>
            {/if}
          </Card.Content>

          <Card.Footer class="flex-col gap-3 border-t p-6">
            <Button class="w-full gap-2" size="lg" onclick={enterOrganizerMode}>
              <Plus class="size-4" />
              组织者入口
            </Button>
            <Button
              variant="outline"
              class="w-full gap-2"
              size="lg"
              onclick={() => {
                if (meetings[0]) join(meetings[0])
              }}
              disabled={meetings.length === 0}
            >
              <MonitorPlay class="size-4" />
              投屏端加入
            </Button>
          </Card.Footer>
        </Card.Root>
      </section>
    </div>
  </div>
</div>

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
</style>
