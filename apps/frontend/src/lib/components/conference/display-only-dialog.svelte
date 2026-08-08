<script lang="ts">
  import { Monitor, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { getWsUrl } from '$lib/services/conference-display-bridge'

  let { open = $bindable(false) }: { open: boolean } = $props()

  function parseDefaultUrl(): { ip: string; port: string } {
    const url = getWsUrl()
    try {
      const u = new URL(url)
      return { ip: u.hostname, port: u.port || '19527' }
    } catch {
      return { ip: '', port: '19527' }
    }
  }

  let defaultAddr = $state(parseDefaultUrl())
  let ip = $state(defaultAddr.ip)
  let port = $state(defaultAddr.port)
  let label = $state('')

  function handleOpenChange(value: boolean): void {
    if (!value) {
      defaultAddr = parseDefaultUrl()
      ip = defaultAddr.ip
      port = defaultAddr.port
      label = ''
    }
    open = value
  }

  async function handleOpenDisplay(): Promise<void> {
    const trimmedIp = ip.trim()
    const trimmedPort = port.trim()
    if (!trimmedIp) return

    const wsUrl = `ws://${trimmedIp}:${trimmedPort}`

    try {
      const result = await window.veto.conference.openDisplay({
        wsUrl,
        label: label.trim() || undefined
      })
      if (result.success) {
        open = false
        defaultAddr = parseDefaultUrl()
        ip = defaultAddr.ip
        port = defaultAddr.port
        label = ''
      }
    } catch (err) {
      console.error('[DisplayOnly] Failed to open display:', err)
    }
  }

  const canSubmit = $derived(ip.trim().length > 0)
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
          <div class="flex items-center gap-2">
            <Input bind:value={ip} placeholder="192.168.1.100" class="h-9 flex-1 text-sm" />
            <span class="text-sm font-mono text-muted-foreground">:</span>
            <Input bind:value={port} placeholder="19527" class="h-9 w-24 text-sm" />
          </div>
        </div>

        <!-- 标签 -->
        <div>
          <Label class="mb-2 block text-xs text-muted-foreground">窗口标签（可选）</Label>
          <Input bind:value={label} placeholder="例如：投影屏、第二屏幕" class="h-9 text-sm" />
        </div>
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        <Button onclick={handleOpenDisplay} disabled={!canSubmit} class="min-w-[140px] gap-2">
          <Monitor size={14} />
          打开展示窗口
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
