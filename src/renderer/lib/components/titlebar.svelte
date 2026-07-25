<script lang="ts">
  import { Minus, X, Square, Settings, Maximize } from '@lucide/svelte'
  import { VETO_NAME } from '$lib/const'
  import { Button } from '$lib/components/ui/button'
  import { settingsDialogOpen } from '$lib/stores/app/global-ui-store'

  let {
    variant = 'main',
    onToggleFullscreen
  }: {
    variant?: 'main' | 'display'
    onToggleFullscreen?: () => void
  } = $props()

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
  class="titlebar fixed top-0 left-0 right-0 z-50 flex h-9 items-center border-b bg-background select-none {variant ===
  'display'
    ? 'border-white/5 bg-[#060a0f]'
    : 'border-border/30'}"
>
  <!-- 左：应用名（可拖动区域） -->
  <div class="drag-region flex w-28 shrink-0 items-center pl-4 h-full">
    <span class="text-base font-semibold text-foreground/70 text-center">
      {VETO_NAME}
    </span>
  </div>

  <!-- 中：拖拽区域占位 -->
  <div class="drag-region flex-1 h-full"></div>

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

    <button
      class="no-drag flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={minimize}
      title="最小化"
    >
      <Minus size={14} />
    </button>
    <button
      class="no-drag flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={maximize}
      title="最大化"
    >
      <Square size={11} />
    </button>
    <button
      class="no-drag close-btn flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white"
      onclick={close}
      title="关闭"
    >
      <X size={14} />
    </button>
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
