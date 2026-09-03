<script lang="ts">
  import SettingCard from '../../settings-card.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import * as ImageCropper from '$lib/components/ui/image-cropper/index.js'
  import { authStore } from '$lib/classes/stores/auth-store'
  import { patchMe } from '$lib/classes/clients/api-client'
  import { toast } from 'svelte-sonner'
  import { User, Camera } from '@lucide/svelte'
  import { fly } from 'svelte/transition'

  const user = $derived($authStore.user)
  const MAX_AVATAR_KB = 512

  // ─── 用户名 ────────────────────────────────────────────────────────
  let editName = $state('')

  $effect(() => {
    if (user) editName = user.name
  })

  // ─── 头像（ImageCropper） ────────────────────────────────────────
  let avatarSrc = $state('')

  $effect(() => {
    if (user) avatarSrc = user.avatar
  })

  function handleCropped(dataUrl: string) {
    avatarSrc = dataUrl
  }

  // ─── 保存个人信息 ────────────────────────────────────────────────
  let savingProfile = $state(false)

  async function saveProfile() {
    if (!user) return
    const body: Record<string, string> = {}

    if (editName !== user.name) {
      body.name = editName
    }

    if (avatarSrc && avatarSrc !== user.avatar) {
      // 去掉 data:image/...;base64, 前缀，发送纯 Base64
      const base64 = avatarSrc.startsWith('data:')
        ? avatarSrc.split(',')[1]
        : avatarSrc
      body.avatar = base64
    }

    if (Object.keys(body).length === 0) {
      toast.info('没有需要保存的更改')
      return
    }

    savingProfile = true
    try {
      const result = await patchMe(body)
      authStore.updateUser(result.user)
      toast.success('个人信息已更新')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      savingProfile = false
    }
  }

  // ─── 修改密码 ────────────────────────────────────────────────────
  let newPassword = $state('')
  let confirmPassword = $state('')
  let savingPassword = $state(false)

  async function changePassword() {
    if (!newPassword) {
      toast.error('请输入新密码')
      return
    }
    if (newPassword.length < 6) {
      toast.error('密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    savingPassword = true
    try {
      await patchMe({ password: newPassword })
      newPassword = ''
      confirmPassword = ''
      toast.success('密码已修改')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '修改密码失败')
    } finally {
      savingPassword = false
    }
  }
</script>

<div class="space-y-8" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
  <!-- 头像 -->
  <div>
    <div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">头像</div>
    <p class="mb-4 text-sm text-muted-foreground">点击头像更换，支持裁剪。最大 {MAX_AVATAR_KB} KB。</p>
    <div class="flex justify-center">
      <ImageCropper.Root bind:src={avatarSrc} onCropped={handleCropped}>
        <ImageCropper.UploadTrigger>
          <ImageCropper.Preview>
            {#snippet child({ src })}
              <div class="relative cursor-pointer group">
                <Avatar.Root class="size-24 rounded-full">
                  {#if src}
                    <Avatar.Image src={src} alt={user?.name ?? ''} />
                  {/if}
                  <Avatar.Fallback class="rounded-full bg-muted">
                    <User size={32} />
                  </Avatar.Fallback>
                </Avatar.Root>
                <div
                  class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Camera size={24} class="text-white" />
                </div>
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
  </div>

  <!-- 个人信息 -->
  <div>
    <div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">个人信息</div>
    <div class="space-y-3">
      <SettingCard title="用户名" description="修改你的显示名称。">
        <Input
          class="max-w-[220px]"
          bind:value={editName}
          placeholder="输入用户名"
        />
      </SettingCard>
      <SettingCard title="邮箱" description="注册邮箱，暂不支持修改。">
        <div class="flex h-9 items-center rounded-md border border-input bg-transparent px-3 max-w-[280px]">
          <span class="text-sm text-muted-foreground truncate">{user?.email ?? '—'}</span>
        </div>
      </SettingCard>
      {#if user?.created_at}
        <SettingCard title="注册时间" description="你的账号注册时间。">
          <span class="text-sm text-muted-foreground">
            {new Date(user.created_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </SettingCard>
      {/if}
    </div>
    <div class="mt-4">
      <Button onclick={saveProfile} disabled={savingProfile}>
        {savingProfile ? '保存中...' : '保存修改'}
      </Button>
    </div>
  </div>

  <!-- 安全设置 -->
  <div>
    <div class="mb-1 text-xl font-bold text-stone-800 dark:text-stone-100">安全设置</div>
    <div class="space-y-3">
      <SettingCard title="修改密码" description="设置新密码，至少 6 位。">
        <div class="flex flex-col gap-2 max-w-[220px]">
          <Input
            type="password"
            bind:value={newPassword}
            placeholder="新密码"
          />
          <Input
            type="password"
            bind:value={confirmPassword}
            placeholder="确认新密码"
          />
        </div>
      </SettingCard>
    </div>
    <div class="mt-4">
      <Button
        variant="outline"
        onclick={changePassword}
        disabled={savingPassword || !newPassword || !confirmPassword}
      >
        {savingPassword ? '修改中...' : '修改密码'}
      </Button>
    </div>
  </div>
</div>
