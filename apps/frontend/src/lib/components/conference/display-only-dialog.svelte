<script lang="ts">
  import { Monitor, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'

  let { open = $bindable(false) }: { open: boolean } = $props()

  let label = $state('')

  function handleOpenChange(value: boolean): void {
    if (!value) {
      label = ''
    }
    open = value
  }

  async function handleOpenDisplay(): Promise<void> {
    try {
      const result = await window.veto.conference.openDisplay({
        label: label.trim() || undefined
      })
      if (result.success) {
        open = false
        label = ''
      }
    } catch (err) {
      console.error('[DisplayOnly] Failed to open display:', err)
    }
  }

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
          打开本机 Chair 的 Display 窗口。Display 只接收 Chair 的本地投影。
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-2">
        <!-- 标签 -->
        <div>
          <Label class="mb-2 block text-xs text-muted-foreground">窗口标签（可选）</Label>
          <Input bind:value={label} placeholder="例如：投影屏、第二屏幕" class="h-9 text-sm" />
        </div>
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        <Button onclick={handleOpenDisplay} class="min-w-[140px] gap-2">
          <Monitor size={14} />
          打开展示窗口
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
