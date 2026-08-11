<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { UsersIcon } from '@lucide/svelte'
  let token = $state('')
  let { open = $bindable(false) }: { open: boolean } = $props()
  async function join() {
    // if (!token) return
    // try {
    //   await joinConferenceByToken(token)
    //   open = false
    // } catch (err) {
    //   console.error('加入大会失败:', err)
    //   alert('加入大会失败: ' + err.message)
    // }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay />
  <Dialog.Content>
    <Dialog.Title class="flex items-center gap-2 text-base font-semibold tracking-wide">
      <UsersIcon size={18} class="text-indigo-500" />
      加入大会
    </Dialog.Title>
    <Dialog.Description class="text-xs text-muted-foreground">
      粘贴邀请码, 加入大会
    </Dialog.Description>
    <Input
      class="mt-1"
      placeholder="邀请码..."
      bind:value={token}
      onkeydown={async (e) => {
        if (e.key === 'Enter') {
          await join()
        }
      }}
    />
    <Dialog.Footer>
      <Button variant="outline" onclick={join}>加入</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
