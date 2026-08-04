<script lang="ts">
  import LoginForm from '$lib/components/login/login-form.svelte'
  import DescContent from '$lib/components/login/desc-content.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { FieldSeparator } from '$lib/components/ui/field/index.js'

  import favicon from '$lib/assets/favicon.png'
  import feishu from '$lib/assets/feishu.png'
  import wechat from '$lib/assets/wechat.png'
  import { LaptopMinimal } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { setOffline } from '$lib/stores/auth-store'
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

  <div class="relative z-10 flex min-h-svh items-center justify-center">
    <!-- Centered wrapper -->
    <div class="flex w-full max-w-7xl items-center">
      <!-- Left content -->
      <DescContent />

      <!-- Right login -->
      <section class="flex w-full items-center justify-center px-6 py-12 lg:w-[520px]">
        <div
          class="
          w-full max-w-md
          rounded-3xl
          border
          bg-card/80
          p-8
          shadow-2xl
          backdrop-blur-xl
        "
        >
          <div class="mb-8">
            <h2 class="text-3xl font-bold tracking-tight">欢迎回来</h2>

            <div>
              <p class="text-gray-400">
                没有账号? <a href="##" class="text-blue-400 underline underline-offset-4"
                  >立即注册</a
                >
              </p>
            </div>
          </div>

          <LoginForm />

          <FieldSeparator class="my-6">其他方式</FieldSeparator>

          <div class="flex gap-3">
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

          <p class="mt-8 text-center text-xs text-muted-foreground">
            点击 「登录」 即表示您同意我们的
            <a href="/terms" class="underline text-blue-400 underline-offset-4 hover:text-primary">
              服务条款
            </a>
          </p>
        </div>
      </section>
    </div>
  </div>
</div>
