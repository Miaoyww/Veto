<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js'
  import { cn, type WithElementRef } from '$lib/utils.js'
  import type { HTMLFormAttributes } from 'svelte/elements'
  import { login, getMe } from '$lib/classes/services/api-client'
  import { authStore } from '$lib/classes/stores/auth-store'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  let {
    ref = $bindable(null),
    class: className,
    onSwitchToRegister,
    id,
    ...restProps
  }: WithElementRef<HTMLFormAttributes> & {
    onSwitchToRegister?: () => void
    id: string
  } = $props()

  // ─── Tab ─────────────────────────────────────────────────────────
  let activeTab = $state('password')

  // ─── 登录 ────────────────────────────────────────────────────────
  let loginEmail = $state('')
  let loginPassword = $state('')
  let loginSubmitting = $state(false)
  let error = $state('')

  // ─── 邀请码 ──────────────────────────────────────────────────────
  let inviteCode = $state('')

  // ═══════════════════════════════════════════════════════════════════
  // 登录
  // ═══════════════════════════════════════════════════════════════════

  async function handleLogin(e: Event) {
    e.preventDefault()
    error = ''
    if (!loginEmail.trim()) {
      error = '请输入邮箱地址'
      return
    }
    if (!loginPassword) {
      error = '请输入密码'
      return
    }

    loginSubmitting = true
    try {
      const result = await login(loginEmail.trim(), loginPassword)
      const maybeUser = getMe().then(({ user }) => user).catch(() => null)
      authStore.login(result.token, {
        id: '',
        email: loginEmail.trim(),
        name: '',
        avatar: '',
        created_at: ''
      })
      const serverUser = await maybeUser
      if (serverUser) {
        authStore.updateUser(serverUser)
      }
      goto(resolve('/'))
    } catch (err: any) {
      error = err.message ?? '登录失败，请重试'
    } finally {
      loginSubmitting = false
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 邀请码
  // ═══════════════════════════════════════════════════════════════════

  async function handleInviteJoin(e: Event) {
    e.preventDefault()
    error = ''
    if (!inviteCode.trim()) {
      error = '请输入邀请码'
      return
    }
    error = '邀请码加入功能即将上线'
  }
</script>

<form class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
  {#if error}
    <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {error}
    </div>
  {/if}

  <Tabs bind:value={activeTab} class="flex-col">
    <TabsList class="mb-6 flex w-full flex-row">
      <TabsTrigger value="phone" disabled>手机号登录</TabsTrigger>
      <TabsTrigger value="password">账号密码登录</TabsTrigger>
      <TabsTrigger value="invite">邀请码入会</TabsTrigger>
    </TabsList>

    <!-- 手机号登录（禁用） -->
    <TabsContent value="phone">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="phone-{id}">手机号</Label>
          <Input id="phone-{id}" type="tel" placeholder="暂未开放" disabled required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="sms-code-{id}">验证码</Label>
          <div class="flex gap-3">
            <Input id="sms-code-{id}" type="text" placeholder="暂未开放" disabled class="flex-1" />
            <Button type="button" variant="outline" class="shrink-0" disabled>获取验证码</Button>
          </div>
        </div>
        <Button type="button" class="w-full" disabled>登录</Button>
      </div>
    </TabsContent>

    <!-- 账号密码登录 -->
    <TabsContent value="password">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="login-email-{id}">邮箱</Label>
          <Input
            id="login-email-{id}"
            type="email"
            placeholder="m@example.com"
            bind:value={loginEmail}
            required
            autocomplete="email"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label for="login-password-{id}">密码</Label>
            <a href="##" class="text-sm text-gray-400 underline-offset-4 hover:underline">
              忘记密码?
            </a>
          </div>
          <Input
            id="login-password-{id}"
            type="password"
            bind:value={loginPassword}
            required
            autocomplete="current-password"
          />
        </div>
        <Button type="submit" class="w-full" disabled={loginSubmitting} onclick={handleLogin}>
          {loginSubmitting ? '登录中...' : '登录'}
        </Button>
      </div>
    </TabsContent>

    <!-- 邀请码入会 -->
    <TabsContent value="invite">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col items-center gap-1 text-center">
          <h1 class="text-xl font-bold">加入大会</h1>
          <p class="text-sm text-muted-foreground">输入大会邀请码加入已有会议</p>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="invite-code-{id}">邀请码</Label>
          <Input
            id="invite-code-{id}"
            type="text"
            placeholder="请输入邀请码"
            bind:value={inviteCode}
            required
          />
        </div>
        <Button type="submit" class="w-full" onclick={handleInviteJoin}>加入</Button>
      </div>
    </TabsContent>
  </Tabs>
</form>
