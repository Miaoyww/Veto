<script lang="ts">
  import { ScrollText } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { ACTION_LABELS } from '$lib/types-conference'
  import type { ConferenceEntry } from '$lib/types-conference'

  interface Props {
    open: boolean
    minutes: ConferenceEntry[]
    onclose?: () => void
  }

  let { open = $bindable(), minutes, onclose }: Props = $props()

  const recentMinutes = $derived([...minutes].reverse().slice(0, 200))

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
</script>

<Dialog.Root bind:open {onclose}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-xl">
      <Dialog.Header class="pb-1">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold">
          <ScrollText size={18} class="text-indigo-500" />
          会议日志
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          共 {minutes.length} 条记录
        </Dialog.Description>
      </Dialog.Header>

      <div class="max-h-[65vh] overflow-y-auto rounded-md border bg-muted/30 p-3">
        {#if recentMinutes.length === 0}
          <p class="py-8 text-center text-xs text-muted-foreground">暂无会议记录</p>
        {:else}
          <pre
            class="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">{recentMinutes
              .map((entry) => {
                const label = ACTION_LABELS[entry.actionType] ?? entry.eventType
                return `[${formatTime(entry.timestamp)}] [${label}] ${entry.description}`
              })
              .join('\n')}</pre>
        {/if}
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>关闭</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
