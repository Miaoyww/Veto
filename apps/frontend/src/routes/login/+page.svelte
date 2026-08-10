<script lang="ts">
  import DescContent from '$lib/components/login/desc-content.svelte'
  import favicon from '$lib/assets/favicon.png'
  import WindowControls from '$lib/components/app-sidebar/window-controls.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Separator } from '$lib/components/ui/separator'
  import { LaptopMinimal } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import LoginForm from '$lib/components/login/login-form.svelte'
  import RegForm from '$lib/components/login/reg-form.svelte'
  import { onMount } from 'svelte'
  import { setOffline, authStore } from '$lib/stores/auth-store'
  import wechat from '$lib/assets/wechat.png'
  import feishu from '$lib/assets/feishu.png'

  type Card = 'login' | 'register'

  let card: Card = $state('login')

  import { scale } from 'svelte/transition'

  onMount(async () => {
    await authStore.ready
    if (authStore.isLoggedIn()) {
      goto(resolve('/'))
    }
  })

  const zoomTransition = { start: 0.7, opacity: 1 }
  const outDuration = { ...zoomTransition, duration: 180 }
  const inDuration = { ...zoomTransition, duration: 260 }

  function switchCard(to: Card) {
    card = to
  }
</script>

<div class="relative min-h-svh overflow-hidden bg-background">
  <!-- Background -->
  <div class="absolute inset-0 bg-linear-to-br from-primary/20 via-background to-background"></div>

  <!-- Decorative blur -->
  <div class="absolute left-1/4 top-1/4 size-96 rounded-full bg-primary/20 blur-3xl"></div>

  <div class="absolute bottom-1/4 right-1/3 size-72 rounded-full bg-blue-500/20 blur-3xl"></div>

  <!-- Brand -->
  <div class="absolute left-8 top-12 z-20 flex items-center gap-3 text-sm font-medium">
    <div class="flex size-9 items-center justify-center">
      <img src={favicon} alt="Veto" class="size-8" />
    </div>

    <span class="text-lg"> Veto </span>
  </div>

  <!-- Title bar: drag region + window controls -->
  <div class="absolute left-0 right-0 top-0 z-20 flex h-9 items-center">
    <div class="drag-region flex-1 h-full"></div>
    <WindowControls />
  </div>

  <div class="relative z-10 flex min-h-svh items-center justify-center">
    <!-- Centered wrapper -->
    <div class="flex w-full max-w-7xl items-center">
      <!-- Left content -->
      <DescContent />

      <!-- Right auth card -->
      <section class="flex w-full items-center justify-center px-6 py-12 lg:w-[520px]">
        <Card.Root class="w-full max-w-md rounded-3xl border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <Card.Header class="p-0">
            {#if card === 'login'}
              <Card.Title class="text-3xl font-bold">欢迎回来</Card.Title>
              <div class="text-sm text-muted-foreground">
                没有账号?
                <Button
                  type="button"
                  variant="link"
                  class="inline text-blue-400 underline"
                  onclick={() => switchCard('register')}
                >
                  立即注册
                </Button>
              </div>
            {:else}
              <Card.Title class="text-3xl font-bold tracking-tight">创建账号</Card.Title>
              <div class="text-sm text-muted-foreground">
                已有账号?
                <Button
                  type="button"
                  variant="ghost"
                  class="inline text-blue-400 underline underline-offset-4"
                  onclick={() => switchCard('login')}
                >
                  登录
                </Button>
              </div>
            {/if}
          </Card.Header>

          <Card.Content class="p-0">
            {#key card}
              {#if card === 'login'}
                <div in:scale={inDuration} out:scale={outDuration}>
                  <LoginForm id="auth" onSwitchToRegister={() => switchCard('register')} />
                </div>
              {:else}
                <div in:scale={inDuration} out:scale={outDuration}>
                  <RegForm id="auth" switchCard={() => switchCard('login')} />
                </div>
              {/if}
            {/key}
          </Card.Content>

          <!-- Separator with text -->
          <div class="relative h-5">
            <Separator class="absolute top-1/2" />
            <span
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground"
            >
              其他方式
            </span>
          </div>

          <Card.Footer class="flex-col gap-3 p-0">
            <div class="flex w-full gap-3">
              <!-- 离线登录 -->
              <Button
                variant="outline"
                type="button"
                class="h-12 flex-1 justify-center gap-2 rounded-lg shadow-sm"
                onclick={() => {
                  setOffline(true)
                  goto(resolve('/'))
                }}
              >
                <LaptopMinimal class="size-5" />
                离线登录
              </Button>

              <!-- 微信登录 -->
              <Button variant="outline" type="button" class="size-12 rounded-lg p-0 shadow-sm">
                <img src={wechat} class="size-5" alt="wechat" />
              </Button>

              <!-- 飞书登录 -->
              <Button variant="outline" type="button" class="size-12 rounded-lg p-0 shadow-sm">
                <img src={feishu} class="size-5" alt="feishu" />
              </Button>
            </div>

            <p class="text-center text-xs text-muted-foreground">
              点击 「登录」 即表示您同意我们的
              <a
                href="/terms"
                class="underline text-blue-400 underline-offset-4 hover:text-primary"
              >
                服务条款
              </a>
            </p>
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
