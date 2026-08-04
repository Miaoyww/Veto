<script lang="ts">
  import { Minus, X, Square, Settings, Maximize, Timer } from '@lucide/svelte'
  import { VETO_NAME } from '$lib/const'
  import { Button } from '$lib/components/ui/button'
  import { settingsDialogOpen } from '$lib/stores/app/global-ui-store'
  import { standaloneTimer, timerDialogOpen } from '$lib/stores/conference/timer-store'
  import { formatTime } from '$lib/utils'
  import { page } from '$app/stores'

  let {
    variant = 'main',
    onToggleFullscreen
  }: {
    variant?: 'main' | 'display'
    onToggleFullscreen?: () => void
  } = $props()

  const isLoginPage = $derived($page.url.pathname === '/login')

  function minimize() {
    window.electron.ipcRenderer.send('window:minimize')
  }
  function maximize() {
    window.electron.ipcRenderer.send('window:maximize')
  }
  function close() {
    window.electron.ipcRenderer.send('window:close')
  }
</script>

<header
  class="titlebar fixed top-0 left-0 right-0 z-50 flex h-9 items-center border-b select-none {variant ===
  'display'
    ? 'border-white/5 bg-[#060a0f]'
    : 'border-transparent bg-transparent'}"
>
  <!-- 左：应用名（可拖动区域），登录页隐藏 -->
  <div class="drag-region flex w-28 shrink-0 items-center pl-4 h-full">
    {#if !isLoginPage}
      <span class="text-base font-semibold text-foreground/70 text-center">
        {VETO_NAME}
      </span>
    {/if}
  </div>

  <!-- 中：计时器显示 / 拖拽区域 -->
  <div class="drag-region flex-1 h-full flex items-center justify-center">
    {#if $standaloneTimer}
      {@const st = $standaloneTimer}
      {@const expired = !st.isRunning && st.remainingSec <= 0}
      <button
        class="no-drag flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono tabular-nums transition-colors hover:bg-accent/50 {expired
          ? 'text-red-500'
          : st.isRunning
            ? 'text-indigo-500'
            : 'text-amber-500'}"
        onclick={() => timerDialogOpen.set(true)}
        title={expired
          ? '计时器已到期（点击打开）'
          : st.isRunning
            ? '计时器运行中（点击打开）'
            : '计时器已暂停（点击打开）'}
      >
        <Timer size={12} class={expired ? 'animate-pulse' : st.isRunning ? '' : ''} />
        <span>{formatTime(st.remainingSec)}</span>
      </button>
    {/if}
  </div>

  <!-- 右：设置（主窗口）/ 全屏（Display）+ 窗口控制按钮 -->
  <div class="flex shrink-0 items-center h-full">
    {#if variant === 'main'}
      <Button
        variant="ghost"
        class="flex h-full items-center justify-center px-3 text-muted-foreground hover:bg-accent hover:text-foreground no-drag"
        onclick={() => settingsDialogOpen.set(true)}
        title="设置"
      >
        <Settings size={14} />
      </Button>

      <div class="mx-0.5 h-5 w-px bg-border/40"></div>
    {:else}
      <button
        class="no-drag flex h-full w-11 items-center justify-center text-white/25 hover:bg-white/5 hover:text-white/60"
        onclick={() => onToggleFullscreen?.()}
        title="全屏"
      >
        <Maximize size={13} />
      </button>
    {/if}

    <Button
      class="no-drag flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={minimize}
      variant="ghost"
      title="最小化"
    >
      <Minus size={14} />
    </Button>
    <Button
      class="no-drag flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={maximize}
      variant="ghost"
      title="最大化"
    >
      <Square size={11} />
    </Button>
    <Button
      class="no-drag close-btn flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white"
      onclick={close}
      variant="ghost"
      title="关闭"
    >
      <X size={14} />
    </Button>
  </div>
</header>

<style>
  .drag-region {
    -webkit-app-region: drag;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
</style>
