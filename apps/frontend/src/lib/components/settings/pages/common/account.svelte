<script lang="ts">
  import SettingCard from '../../settings-card.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import * as ImageCropper from '$lib/components/ui/image-cropper/index.js'
  import { authStore } from '$lib/classes/stores/auth-store'
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

  // ─── 保存个人信息（本地持久化） ──────────────────────────────────────
  let savingProfile = $state(false)

  async function saveProfile() {
    if (!user) return
    const partial: { name?: string; avatar?: string } = {}

    if (editName !== user.name) {
      partial.name = editName
    }

    if (avatarSrc && avatarSrc !== user.avatar) {
      partial.avatar = avatarSrc
    }

    if (Object.keys(partial).length === 0) {
      toast.info('没有需要保存的更改')
      return
    }

    savingProfile = true
    try {
      authStore.updateUser(partial)
      toast.success('个人信息已更新')
    } finally {
      savingProfile = false
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
</div>
