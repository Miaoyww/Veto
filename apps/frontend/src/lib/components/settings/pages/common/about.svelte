<script lang="ts">
  import {
    ExternalLink,
    FileText,
    MessageCircle,
    RefreshCw,
    Download,
    Loader,
    CheckCircle2,
    AlertCircle,
    Terminal
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import SettingCard from '../../settings-card.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { VETO_NAME } from '$lib/classes/const'
  import { fly } from 'svelte/transition'
  import { onMount, onDestroy } from 'svelte'

  const version = __APP_VERSION__
  import favicon from '$lib/assets/favicon.png'

  // ── 更新状态 ──────────────────────────────────────────────────────
  type UpdateStatus =
    | 'idle' // 初始状态
    | 'checking' // 正在检查更新
    | 'not-available' // 已是最新版本
    | 'available' // 发现新版本，等待用户下载
    | 'downloading' // 正在下载
    | 'downloaded' // 下载完成，等待安装
    | 'error' // 出错

  let updateStatus = $state<UpdateStatus>('idle')
  let updateVersion = $state<string | null>(null)
  let downloadPercent = $state(0)
  let errorMessage = $state<string | null>(null)
  let updateInfo = $state<unknown>(null)

  let unsubscribers: Array<() => void> = []

  onMount(() => {
    // 监听主进程的更新事件
    if (window.veto?.events) {
      unsubscribers.push(
        window.veto.events.on('updater:checking-for-update', () => {
          updateStatus = 'checking'
          errorMessage = null
        })
      )

      unsubscribers.push(
        window.veto.events.on('updater:update-available', (data: any) => {
          updateStatus = 'available'
          updateInfo = data
          updateVersion = data?.version ?? null
        })
      )

      unsubscribers.push(
        window.veto.events.on('updater:update-not-available', () => {
          updateStatus = 'not-available'
        })
      )

      unsubscribers.push(
        window.veto.events.on('updater:download-progress', (data: any) => {
          updateStatus = 'downloading'
          downloadPercent = data?.percent ?? 0
        })
      )

      unsubscribers.push(
        window.veto.events.on('updater:update-downloaded', (data: any) => {
          updateStatus = 'downloaded'
          updateInfo = data
          updateVersion = data?.version ?? updateVersion
          downloadPercent = 100
        })
      )

      unsubscribers.push(
        window.veto.events.on('updater:error', (data: any) => {
          updateStatus = 'error'
          errorMessage = data?.message ?? '未知错误'
        })
      )
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((fn) => fn())
  })

  // ── 操作 ──────────────────────────────────────────────────────────

  async function checkForUpdates(): Promise<void> {
    if (updateStatus === 'checking' || updateStatus === 'downloading') return

    updateStatus = 'checking'
    errorMessage = null
    updateVersion = null
    downloadPercent = 0

    try {
      const result = await window.veto.updater.check()
      if (!result.success) {
        updateStatus = 'error'
        errorMessage = result.error ?? '检查更新失败'
      }
      // 如果 checkForUpdates 返回了 null（updater 被禁用），且没有事件被触发
      if (result.result === null) {
        setTimeout(() => {
          if (updateStatus === 'checking') {
            updateStatus = 'error'
            errorMessage = '更新服务未启用'
          }
        }, 3000)
      }
    } catch (err: any) {
      updateStatus = 'error'
      errorMessage = err?.message ?? '检查更新失败'
    }
  }

  async function downloadUpdate(): Promise<void> {
    if (updateStatus === 'downloading') return

    try {
      const result = await window.veto.updater.download()
      if (!result.success) {
        updateStatus = 'error'
        errorMessage = result.error ?? '下载更新失败'
      }
    } catch (err: any) {
      updateStatus = 'error'
      errorMessage = err?.message ?? '下载更新失败'
    }
  }

  async function quitAndInstall(): Promise<void> {
    await window.veto.updater.quitAndInstall()
  }

  async function openDevTools(): Promise<void> {
    await window.veto.app.openDevTools()
  }
</script>

<div class="space-y-8" in:fly={{ y: 8, duration: 320, opacity: 0 }}>
  <div class="mb-1 flex justify-center">
    <img src={favicon} alt="App Logo" class="h-64 w-64 rounded-md" />
  </div>
  <div class="mb-6 flex flex-col items-center gap-2 text-center">
    <h2 class="text-3xl font-extrabold tracking-wide text-stone-800 dark:text-stone-100">
      {VETO_NAME}
    </h2>
    <p class="text-sm text-muted-foreground">否决权</p>
    <p class="text-sm text-muted-foreground">模拟联合国会议系统</p>
  </div>
  <div class="space-y-3">
    <SettingCard title="版本号" description="当前应用版本。">
      <Label>v{version}</Label>
    </SettingCard>

    <!-- 开发者工具 -->
    <SettingCard title="开发者工具" description="打开 Chromium DevTools 进行调试。">
      <Button variant="outline" size="sm" onclick={openDevTools}>
        <Terminal size={13} class="mr-1.5" />
        打开开发者工具
      </Button>
    </SettingCard>

    <!-- 检查更新 -->
    <SettingCard
      title="版本更新"
      description={updateStatus === 'not-available'
        ? '当前已是最新版本。'
        : updateStatus === 'available'
          ? `发现新版本 v${updateVersion ?? ''}，点击下载更新。`
          : updateStatus === 'downloading'
            ? '正在下载更新...'
            : updateStatus === 'downloaded'
              ? '更新已就绪，重启应用以完成安装。'
              : updateStatus === 'error'
                ? (errorMessage ?? '检查更新时发生错误。')
                : '检查是否有新版本可用。'}
    >
      <div class="flex items-center gap-2">
        {#if updateStatus === 'checking'}
          <Button variant="outline" size="sm" disabled>
            <Loader size={13} class="mr-1.5 animate-spin" />
            检查中...
          </Button>
        {:else if updateStatus === 'downloading'}
          <Button variant="outline" size="sm" disabled>
            <Loader size={13} class="mr-1.5 animate-spin" />
            下载中 {downloadPercent}%
          </Button>
        {:else if updateStatus === 'available'}
          <Button variant="default" size="sm" onclick={downloadUpdate}>
            <Download size={13} class="mr-1.5" />
            下载更新
          </Button>
          <Button variant="ghost" size="sm" onclick={checkForUpdates}>
            <RefreshCw size={13} class="mr-1.5" />
            重新检查
          </Button>
        {:else if updateStatus === 'downloaded'}
          <div class="flex items-center gap-2">
            <CheckCircle2 size={14} class="text-green-500" />
            <span class="text-xs text-green-600 dark:text-green-400">
              v{updateVersion ?? ''} 已就绪
            </span>
          </div>
          <Button variant="default" size="sm" onclick={quitAndInstall}>立即重启安装</Button>
        {:else if updateStatus === 'not-available'}
          <div class="flex items-center gap-2">
            <CheckCircle2 size={14} class="text-muted-foreground" />
            <span class="text-xs text-muted-foreground">已是最新</span>
          </div>
          <Button variant="outline" size="sm" onclick={checkForUpdates}>
            <RefreshCw size={13} class="mr-1.5" />
            重新检查
          </Button>
        {:else if updateStatus === 'error'}
          <Button variant="outline" size="sm" onclick={checkForUpdates}>
            <RefreshCw size={13} class="mr-1.5" />
            重试
          </Button>
        {:else}
          <Button variant="outline" size="sm" onclick={checkForUpdates}>
            <RefreshCw size={13} class="mr-1.5" />
            检查更新
          </Button>
        {/if}
      </div>
    </SettingCard>

    <!-- 下载进度条 (在 downloading 状态下显示) -->
    {#if updateStatus === 'downloading'}
      <div class="px-0.5">
        <div class="h-2 w-full rounded-full bg-muted">
          <div
            class="h-2 rounded-full bg-primary transition-all duration-300"
            style="width: {downloadPercent}%"
          ></div>
        </div>
      </div>
    {/if}

    <!-- 联系我们 -->
    <SettingCard title="联系我们" description="加入我们的社区交流或反馈问题。">
      <Dialog.Root>
        <Dialog.Trigger>
          <Button variant="outline" size="sm">
            <MessageCircle size={13} class="mr-1.5" />
            联系我们
          </Button>
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>联系我们</Dialog.Title>
            <Dialog.Description>请选择你要加入的平台进行交流或反馈问题。</Dialog.Description>
          </Dialog.Header>
          <div class="grid gap-3 py-4">
            <Button
              variant="outline"
              href="https://qm.qq.com/q/pTvxDLoiVq"
              target="_blank"
              class="w-full justify-start"
            >
              <MessageCircle size={16} class="mr-2" />
              加入 QQ 群
            </Button>

            <Button
              variant="outline"
              href="https://discord.gg/"
              target="_blank"
              class="w-full justify-start"
              disabled
            >
              <ExternalLink size={16} class="mr-2" />
              加入 Discord 服务器
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </SettingCard>

    <SettingCard title="开源许可" description="本项目基于 GPL-3.0 协议开源。">
      <Button
        variant="outline"
        size="sm"
        href="https://github.com/Miaoyww/Veto/blob/master/LICENSE"
        target="_blank"
      >
        <FileText size={13} class="mr-1.5" />
        GPL-3.0
      </Button>
    </SettingCard>

    <SettingCard title="GitHub 仓库" description="查看源代码或提交 Issue。">
      <Button variant="outline" size="sm" href="https://github.com/Miaoyww/Veto" target="_blank">
        <ExternalLink size={13} class="mr-1.5" />
        Miaoyww/Veto
      </Button>
    </SettingCard>
  </div>
</div>
