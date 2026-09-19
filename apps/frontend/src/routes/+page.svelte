<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { fly } from 'svelte/transition'
  import { ArrowLeft, Loader2, LogIn, Monitor } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import * as InputOTP from '$lib/components/ui/input-otp'
  import DescContent from '$lib/components/connect/desc-content.svelte'
  import WindowControls from '$lib/components/app-sidebar/window-controls.svelte'
  import favicon from '$lib/assets/favicon.png'
  import feishu from '$lib/assets/feishu.png'
  import wechat from '$lib/assets/wechat.png'
  import {
    consumePendingUserClientAuthentication,
    setPendingUserClientAuthentication,
    setUserClientWsUrl
  } from '$lib/classes/clients/delegate-client'
  import {
    CloudJoinError,
    claimCloudSeat,
    normalizeInviteCode,
    validateCloudInvite,
    type CloudJoinTarget
  } from '$lib/classes/clients/cloud-join-client'

  type JoinStage = 'invite' | 'claim' | 'password'

  let stage = $state<JoinStage>('invite')
  let inviteCode = $state('')
  let joinTarget = $state<CloudJoinTarget | null>(null)
  let displayName = $state('')
  let password = $state('')
  let busy = $state(false)
  let error = $state('')

  function enterOffline(): void {
    setUserClientWsUrl(null)
    goto(resolve('/conference'))
  }

  function resetJoin(): void {
    stage = 'invite'
    joinTarget = null
    displayName = ''
    password = ''
    error = ''
  }

  function enterCloud(target: CloudJoinTarget): void {
    setUserClientWsUrl(target.wsUrl)
    setPendingUserClientAuthentication({
      inviteCode: target.inviteCode,
      password: password.trim() || undefined
    })
    goto(
      resolve('/client/[conference_id]', {
        conference_id: target.conferenceId
      })
    )
  }

  function errorMessage(exception: unknown): string {
    return exception instanceof Error ? exception.message : '加入大会失败'
  }

  async function submitInvite(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    busy = true
    error = ''

    try {
      const normalizedCode = normalizeInviteCode(inviteCode)
      inviteCode = normalizedCode
      const target = await validateCloudInvite(normalizedCode)
      joinTarget = { ...target, inviteCode: normalizedCode }
      password = ''

      if (target.seatState === 'unclaimed') {
        stage = 'claim'
      } else if (target.hasPassword) {
        stage = 'password'
      } else {
        enterCloud(joinTarget)
      }
    } catch (exception) {
      error = errorMessage(exception)
    } finally {
      busy = false
    }
  }

  async function submitClaim(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!joinTarget || !displayName.trim()) return

    busy = true
    error = ''

    try {
      const target = await claimCloudSeat({
        inviteCode: joinTarget.inviteCode,
        displayName: displayName.trim(),
        password: password.trim() || undefined
      })
      enterCloud(target)
    } catch (exception) {
      error =
        exception instanceof CloudJoinError && exception.status === 409
          ? '该席位已被认领，请返回后使用密码进入'
          : errorMessage(exception)
    } finally {
      busy = false
    }
  }

  async function submitClaimed(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!joinTarget) return

    busy = true
    error = ''

    try {
      enterCloud(joinTarget)
    } catch (exception) {
      error = errorMessage(exception)
    } finally {
      busy = false
    }
  }
</script>

<div class="relative min-h-svh overflow-clip bg-background">
  <div class="flowing-background" aria-hidden="true">
    <span class="flowing-background__veil flowing-background__veil--strong"></span>
    <span class="flowing-background__veil flowing-background__veil--soft"></span>
  </div>

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
        <Card.Root
          class="w-full max-w-md rounded-2xl border bg-card/90 p-0 shadow-2xl backdrop-blur-xl"
        >
          <Card.Header class="p-6 pb-4">
            <Card.Title class="text-2xl font-bold">加入大会</Card.Title>
            <Card.Description class="text-sm text-muted-foreground">
              使用席位邀请码进入云端大会
            </Card.Description>
          </Card.Header>

          <Card.Content class="px-6 pb-5">
            {#key stage}
              <div in:fly={{ y: 8, duration: 180 }} out:fly={{ y: -8, duration: 120 }}>
                {#if stage === 'invite'}
                  <form class="flex flex-col gap-4" onsubmit={submitInvite}>
                    <InputOTP.Root
                      bind:value={inviteCode}
                      class="justify-center"
                      maxlength={8}
                      inputmode="text"
                      pattern="[A-HJ-NP-Za-hj-np-z2-9]"
                      autocomplete="off"
                      aria-label="席位邀请码"
                      pasteTransformer={(value) =>
                        value.toUpperCase().replace(/[^A-HJ-NP-Za-hj-np-z2-9]/g, '')}
                    >
                      {#snippet children({ cells })}
                        <InputOTP.Group class="gap-2">
                          {#each cells.slice(0, 4) as cell, index (index)}
                            <InputOTP.Slot
                              {cell}
                              class="h-12 w-10 rounded-lg border text-base font-mono uppercase"
                            />
                          {/each}
                        </InputOTP.Group>
                        <InputOTP.Separator class="mx-1 text-muted-foreground" />
                        <InputOTP.Group class="gap-2">
                          {#each cells.slice(4, 8) as cell, index (index)}
                            <InputOTP.Slot
                              {cell}
                              class="h-12 w-10 rounded-lg border text-base font-mono uppercase"
                            />
                          {/each}
                        </InputOTP.Group>
                      {/snippet}
                    </InputOTP.Root>
                    <Button type="submit" size="lg" disabled={busy || !inviteCode.trim()}>
                      {#if busy}
                        <Loader2 class="size-4 animate-spin" />
                      {:else}
                        <LogIn class="size-4" />
                      {/if}
                      加入
                    </Button>
                  </form>
                {:else if stage === 'claim' && joinTarget}
                  <div class="rounded-xl border bg-background/60 p-4">
                    <p class="truncate text-sm font-medium">{joinTarget.conferenceName}</p>
                    <p class="mt-1 truncate text-xs text-muted-foreground">
                      {joinTarget.committeeName} · {joinTarget.seatName}
                    </p>
                  </div>

                  <form class="mt-4 flex flex-col gap-4" onsubmit={submitClaim}>
                    <Input
                      bind:value={displayName}
                      class="h-12"
                      aria-label="代表姓名"
                      placeholder="代表姓名"
                      autocomplete="name"
                    />
                    <Input
                      bind:value={password}
                      class="h-12"
                      type="password"
                      aria-label="访问密码（可选）"
                      placeholder="访问密码（可选）"
                      autocomplete="new-password"
                    />
                    <div class="flex gap-3">
                      <Button
                        type="submit"
                        size="lg"
                        class="flex-1"
                        disabled={busy || !displayName.trim()}
                      >
                        {#if busy}
                          <Loader2 class="size-4 animate-spin" />
                        {:else}
                          <LogIn class="size-4" />
                        {/if}
                        确认加入
                      </Button>
                      <Button type="button" variant="ghost" size="lg" onclick={resetJoin}>
                        <ArrowLeft class="size-4" />
                        返回
                      </Button>
                    </div>
                  </form>
                {:else if stage === 'password' && joinTarget}
                  <div class="rounded-xl border bg-background/60 p-4">
                    <p class="truncate text-sm font-medium">{joinTarget.conferenceName}</p>
                    <p class="mt-1 truncate text-xs text-muted-foreground">
                      {joinTarget.committeeName} · {joinTarget.seatName}
                    </p>
                  </div>

                  <form class="mt-4 flex flex-col gap-4" onsubmit={submitClaimed}>
                    <Input
                      bind:value={password}
                      class="h-12"
                      type="password"
                      aria-label="访问密码"
                      placeholder="访问密码"
                      autocomplete="current-password"
                    />
                    <div class="flex gap-3">
                      <Button type="submit" size="lg" class="flex-1" disabled={busy}>
                        {#if busy}
                          <Loader2 class="size-4 animate-spin" />
                        {:else}
                          <LogIn class="size-4" />
                        {/if}
                        进入席位
                      </Button>
                      <Button type="button" variant="ghost" size="lg" onclick={resetJoin}>
                        <ArrowLeft class="size-4" />
                        返回
                      </Button>
                    </div>
                  </form>
                {/if}

                {#if error}
                  <p class="mt-3 text-sm text-destructive">{error}</p>
                {/if}
              </div>
            {/key}
          </Card.Content>

          <Card.Footer class="flex-col gap-3 border-t p-6">
            <div class="flex w-full gap-3">
              <Button
                variant="outline"
                type="button"
                class="h-12 flex-1 justify-center gap-2 rounded-lg shadow-sm"
                onclick={enterOffline}
              >
                <Monitor class="size-5" />
                离线模式
              </Button>

              <button
                type="button"
                class="size-12 rounded-lg border bg-card p-0 shadow-sm"
                aria-label="微信登录"
              >
                <img src={wechat} class="mx-auto size-5" alt="" />
              </button>

              <button
                type="button"
                class="size-12 rounded-lg border bg-card p-0 shadow-sm"
                aria-label="飞书登录"
              >
                <img src={feishu} class="mx-auto size-5" alt="" />
              </button>
            </div>
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

  .flowing-background {
    --flow-color-strong: oklch(0.73 0.14 68);
    --flow-color-soft: oklch(0.88 0.08 78);
    --flow-opacity-strong: 0.2;
    --flow-opacity-soft: 0.32;
    --flow-blur: 4rem;
    --flow-ease: cubic-bezier(0.65, 0, 0.35, 1);

    position: absolute;
    inset: -16%;
    overflow: hidden;
    pointer-events: none;
    contain: paint;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--flow-color-soft) 12%, var(--background)),
      var(--background)
    );
  }

  :global(.dark) .flowing-background {
    --flow-color-strong: oklch(0.62 0.14 68);
    --flow-color-soft: oklch(0.48 0.09 78);
    --flow-opacity-strong: 0.24;
    --flow-opacity-soft: 0.2;
  }

  .flowing-background__veil {
    position: absolute;
    display: block;
    border-radius: 50%;
    filter: blur(var(--flow-blur));
    will-change: transform;
  }

  .flowing-background__veil--strong {
    inset-block-start: -8%;
    inset-inline-start: -12%;
    width: clamp(24rem, 62vw, 62rem);
    aspect-ratio: 1.55;
    background: var(--flow-color-strong);
    opacity: var(--flow-opacity-strong);
    animation: flow-strong 22s var(--flow-ease) -6s infinite alternate;
  }

  .flowing-background__veil--soft {
    inset-block-end: -12%;
    inset-inline-end: -10%;
    width: clamp(24rem, 62vw, 62rem);
    aspect-ratio: 1.35;
    background: var(--flow-color-soft);
    opacity: var(--flow-opacity-soft);
    animation: flow-soft 28s var(--flow-ease) -14s infinite alternate;
  }

  @keyframes flow-strong {
    from {
      transform: translate3d(-6%, -4%, 0) rotate(-7deg) scale(1);
    }

    to {
      transform: translate3d(24%, 16%, 0) rotate(8deg) scale(1.08);
    }
  }

  @keyframes flow-soft {
    from {
      transform: translate3d(8%, 10%, 0) rotate(6deg) scale(1.04);
    }

    to {
      transform: translate3d(-22%, -14%, 0) rotate(-8deg) scale(0.96);
    }
  }

  @media (min-width: 40rem) {
    .flowing-background {
      --flow-opacity-strong: 0.28;
      --flow-opacity-soft: 0.38;
      --flow-blur: clamp(5rem, 8vw, 8rem);
    }

    :global(.dark) .flowing-background {
      --flow-opacity-strong: 0.28;
      --flow-opacity-soft: 0.24;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flowing-background__veil {
      animation: none;
      will-change: auto;
    }
  }
</style>
