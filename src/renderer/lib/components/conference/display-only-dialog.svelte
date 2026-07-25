<script lang="ts">
  import { Monitor, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'

  let { open = $bindable(false) }: { open: boolean } = $props()

  let wsUrl = $state('ws://localhost:19527')
  let label = $state('')

  function handleOpenChange(value: boolean): void {
    if (!value) {
      wsUrl = 'ws://localhost:19527'
      label = ''
    }
    open = value
  }

  async function handleOpenDisplay(): Promise<void> {
    const url = wsUrl.trim()
    if (!url) return

    try {
      const result = await window.veto.conference.openDisplay({
        wsUrl: url,
        label: label.trim() || undefined
      })
      if (result.success) {
        open = false
        wsUrl = 'ws://localhost:19527'
        label = ''
      }
    } catch (err) {
      console.error('[DisplayOnly] Failed to open display:', err)
    }
  }

  const canSubmit = $derived(wsUrl.trim().length > 0)
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-md">
      <Dialog.Header class="pb-1">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold">
          <Monitor size={18} class="text-indigo-500" />
          仅展示模式
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          连接到外部 WebSocket 服务，仅作为展示窗口使用
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-2">
        <!-- WS 地址 -->
        <div>
          <Label class="mb-2 block text-xs text-muted-foreground">
            WebSocket 地址 <span class="text-red-400">*</span>
          </Label>
          <Input
            bind:value={wsUrl}
            placeholder="ws://192.168.1.100:19527"
            class="h-9 text-sm"
          />
        </div>

        <!-- 标签 -->
        <div>
          <Label class="mb-2 block text-xs text-muted-foreground">
            窗口标签（可选）
          </Label>
          <Input
            bind:value={label}
            placeholder="例如：投影屏、第二屏幕"
            class="h-9 text-sm"
          />
        </div>
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        <Button
          onclick={handleOpenDisplay}
          disabled={!canSubmit}
          class="min-w-[140px] gap-2"
        >
          <Monitor size={14} />
          打开展示窗口
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
