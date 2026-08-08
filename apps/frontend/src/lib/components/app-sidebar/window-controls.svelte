<script lang="ts">
  import { Minus, Settings, Square, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { settingsDialogOpen } from '$lib/stores/app/global-ui-store'

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

<div class="flex shrink-0 items-center h-full">
  <Button
    variant="ghost"
    class="flex h-full items-center justify-center px-3 text-muted-foreground hover:bg-accent hover:text-foreground no-drag"
    onclick={() => settingsDialogOpen.set(true)}
    title="设置"
  >
    <Settings size={14} />
  </Button>

  <div class="mx-0.5 h-5 w-px bg-border/40"></div>

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
