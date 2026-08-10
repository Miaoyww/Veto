<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as ImageCropper from '$lib/components/ui/image-cropper/index.js'
  import { sendVerificationCode, verifyCode, register, getMe } from '$lib/services/api-client'
  import { authStore } from '$lib/stores/auth-store'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { Camera, UserRound } from '@lucide/svelte'

  let {
    switchCard,
    id
  }: {
    switchCard: (to: 'login') => void
    id: string
  } = $props()

  // ─── 注册步骤 ────────────────────────────────────────────────────
  let regStep = $state<'email' | 'code' | 'info'>('email')
  let regEmail = $state('')
  let regCode = $state('')
  let regToken = $state('')
  let regName = $state('')
  let regPassword = $state('')
  let regPasswordConfirm = $state('')

  // ─── 头像（ImageCropper） ────────────────────────────────────────
  let avatarSrc = $state('')
  const MAX_AVATAR_KB = 512

  function handleCropped(dataUrl: string) {
    // 裁切后的 Data URL 大约为原图 4/3，这里近似校验
    const sizeKB = (dataUrl.length * 0.75) / 1024
    if (sizeKB > MAX_AVATAR_KB) {
      error = `头像文件过大（约 ${Math.round(sizeKB)} KB），请缩小裁切区域或换一张更小的图片`
      avatarSrc = ''
      return
    }
    avatarSrc = dataUrl
  }

  // ─── UI 状态 ────────────────────────────────────────────────────
  let sendingCode = $state(false)
  let verifyingCode = $state(false)
  let submitting = $state(false)
  let countdown = $state(0)
  let error = $state('')

  // ─── 倒计时 ──────────────────────────────────────────────────────
  let timer: ReturnType<typeof setInterval> | null = null

  function startCountdown() {
    countdown = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        if (timer) clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  $effect(() => {
    return () => {
      if (timer) clearInterval(timer)
    }
  })

  // ═══════════════════════════════════════════════════════════════════
  // 步骤 1: 发送验证码
  // ═══════════════════════════════════════════════════════════════════

  async function handleSendCode(e: Event) {
    e.preventDefault()
    error = ''
    if (!regEmail.trim()) {
      error = '请输入邮箱地址'
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      error = '邮箱格式不正确'
      return
    }

    sendingCode = true
    try {
      await sendVerificationCode(regEmail.trim())
      startCountdown()
      regStep = 'code'
    } catch (err: any) {
      error = err.message ?? '发送失败，请稍后重试'
    } finally {
      sendingCode = false
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 步骤 2: 校验验证码
  // ═══════════════════════════════════════════════════════════════════

  async function handleVerifyCode(e: Event) {
    e.preventDefault()
    error = ''
    if (!regCode.trim() || regCode.trim().length !== 6) {
      error = '请输入 6 位验证码'
      return
    }

    verifyingCode = true
    try {
      const result = await verifyCode(regEmail.trim(), regCode.trim())
      regToken = result.regToken
      regStep = 'info'
    } catch (err: any) {
      error = err.message ?? '验证失败，请重试'
    } finally {
      verifyingCode = false
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 步骤 3: 设置密码完成注册
  // ═══════════════════════════════════════════════════════════════════

  async function handleComplete(e: Event) {
    e.preventDefault()
    error = ''
    if (!regPassword || regPassword.length < 6) {
      error = '密码至少 6 位'
      return
    }
    if (regPassword !== regPasswordConfirm) {
      error = '两次密码不一致'
      return
    }

    submitting = true
    try {
      const result = await register(
        regToken,
        regPassword,
        regName.trim() || undefined,
        avatarSrc || undefined
      )
      // 从服务器拉取用户信息（含服务端处理后的 avatar URL）
      let userFromServer = getMe()
        .then(({ user }) => user)
        .catch(() => null)
      // 先用本地数据登录（不阻塞跳转）
      authStore.login(result.token, {
        id: '',
        email: regEmail.trim(),
        name: regName.trim() || regEmail.trim().split('@')[0],
        avatar: avatarSrc,
        created_at: new Date().toISOString()
      })
      // 后台静默更新服务端返回的用户信息
      const serverUser = await userFromServer
      if (serverUser) {
        authStore.updateUser(serverUser)
      }
      goto(resolve('/'))
    } catch (err: any) {
      error = err.message ?? '注册失败，请重试'
    } finally {
      submitting = false
    }
  }
</script>

<!-- ─── 注册卡片 ──────────────────────────────────── -->
<div>
  {#if error}
    <div
      class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >
      {error}
    </div>
  {/if}

  {#if regStep === 'email'}
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <Label for="reg-email-{id}">邮箱地址</Label>
        <Input
          id="reg-email-{id}"
          type="email"
          placeholder="m@example.com"
          bind:value={regEmail}
          required
          autocomplete="email"
        />
      </div>
      <Button type="submit" class="w-full" disabled={sendingCode} onclick={handleSendCode}>
        {sendingCode ? '发送中...' : '创建账号'}
      </Button>
    </div>
  {:else if regStep === 'code'}
    <div class="flex flex-col gap-4">
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-xl font-bold">验证邮箱</h1>
        <p class="text-sm text-balance text-muted-foreground">
          验证码已发送至 <span class="font-medium text-foreground">{regEmail}</span>
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="reg-code-{id}">验证码</Label>
        <Input
          id="reg-code-{id}"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="输入 6 位验证码"
          bind:value={regCode}
          required
          autocomplete="one-time-code"
        />
      </div>

      <div class="flex items-center justify-between text-sm">
        <button
          type="button"
          class="text-muted-foreground hover:underline"
          onclick={() => {
            regStep = 'email'
            error = ''
          }}
        >
          更换邮箱
        </button>
        <button
          type="button"
          class="text-blue-400 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
          disabled={countdown > 0 || sendingCode}
          onclick={handleSendCode}
        >
          {countdown > 0 ? `${countdown} 秒后重发` : sendingCode ? '发送中...' : '重新发送'}
        </button>
      </div>

      <Button type="submit" class="w-full" disabled={verifyingCode} onclick={handleVerifyCode}>
        {verifyingCode ? '验证中...' : '下一步'}
      </Button>
    </div>
  {:else if regStep === 'info'}
    <div class="flex flex-col gap-5">
      <!-- 标题 -->
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">完善信息</h1>
        <p class="text-sm text-muted-foreground">设置头像、名称和密码</p>
      </div>

      <!-- 头像 -->
      <div class="flex justify-center">
        <ImageCropper.Root bind:src={avatarSrc} onCropped={handleCropped}>
          <ImageCropper.UploadTrigger>
            <ImageCropper.Preview>
              {#snippet child({ src })}
                <div class="relative">
                  <div
                    class="group relative flex size-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:border-muted-foreground/50"
                  >
                    {#if src}
                      <img {src} alt="头像预览" class="size-full rounded-full object-cover" />
                      <div
                        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Camera class="size-5 text-white" />
                      </div>
                    {:else}
                      <UserRound class="size-10 text-muted-foreground" />
                    {/if}
                  </div>
                  {#if src}
                    <div
                      class="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110"
                    >
                      <Camera class="size-3.5" />
                    </div>
                  {/if}
                </div>
              {/snippet}
            </ImageCropper.Preview>
          </ImageCropper.UploadTrigger>

          <ImageCropper.Dialog>
            <ImageCropper.Cropper cropShape="round" aspect={1} />
            <ImageCropper.Controls>
              <ImageCropper.Cancel />
              <ImageCropper.Crop />
            </ImageCropper.Controls>
          </ImageCropper.Dialog>
        </ImageCropper.Root>
      </div>

      <!-- 表单字段 -->
      <div class="flex flex-col gap-2">
        <Label for="reg-name-{id}">显示名称</Label>
        <Input
          id="reg-name-{id}"
          type="text"
          placeholder={regEmail.trim().split('@')[0]}
          bind:value={regName}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="reg-pw-{id}">密码</Label>
        <Input
          id="reg-pw-{id}"
          type="password"
          placeholder="至少 6 位"
          bind:value={regPassword}
          required
          autocomplete="new-password"
        />
        <p class="text-sm text-muted-foreground">至少 6 位字符</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="reg-pw2-{id}">确认密码</Label>
        <Input
          id="reg-pw2-{id}"
          type="password"
          placeholder="再次输入密码"
          bind:value={regPasswordConfirm}
          required
          autocomplete="new-password"
        />
      </div>
      <Button type="submit" class="w-full" disabled={submitting} onclick={handleComplete}>
        {submitting ? '注册中...' : '完成注册'}
      </Button>
    </div>
  {/if}
</div>
