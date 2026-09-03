<script lang="ts">
  /**
   * speaker-controls.svelte
   * ────────────────────────
   * 可复用的发言控制按钮组：暂停/继续、结束发言、让渡选项。
   * 用于主发言名单和有主持磋商。
   */
  import { MicOff, Pause, Play, Users, ArrowRight, HelpCircle, MessageCircle } from '@lucide/svelte'
  import ShortcutButton from '$lib/components/ui/shortcut-button.svelte'
  import type { YieldType } from '$lib/classes/types/conference'

  interface Props {
    isPaused?: boolean
    canYield?: boolean
    onpause?: () => void
    onresume?: () => void
    onend?: () => void
    onyield?: (type: YieldType) => void
  }

  let { isPaused = false, canYield = true, onpause, onresume, onend, onyield }: Props = $props()
</script>

<div class="flex flex-wrap items-center justify-center gap-2">
  {#if isPaused}
    <ShortcutButton
      shortcut="Space"
      size="sm"
      class="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
      onclick={() => onresume?.()}
    >
      <Play size={12} />
      继续计时
    </ShortcutButton>
  {:else}
    <ShortcutButton shortcut="Space" size="sm" variant="outline" class="h-8 gap-1.5 text-xs" onclick={() => onpause?.()}>
      <Pause size={12} />
      暂停
    </ShortcutButton>
  {/if}
  <ShortcutButton shortcut="Esc" size="sm" variant="outline" class="h-8 text-xs" onclick={() => onend?.()}>
    <MicOff size={12} class="mr-1" />
    结束发言
  </ShortcutButton>
  {#if canYield}
    <ShortcutButton shortcut="Y 1" size="sm" variant="outline" class="h-8 text-xs" onclick={() => onyield?.('chair')}>
      <Users size={12} class="mr-1" />
      让渡给主席
    </ShortcutButton>
    <ShortcutButton shortcut="Y 2" size="sm" variant="outline" class="h-8 text-xs" onclick={() => onyield?.('delegate')}>
      <ArrowRight size={12} class="mr-1" />
      让渡给代表
    </ShortcutButton>
    <ShortcutButton shortcut="Y 3" size="sm" variant="outline" class="h-8 text-xs" onclick={() => onyield?.('question')}>
      <HelpCircle size={12} class="mr-1" />
      让渡给提问
    </ShortcutButton>
    <ShortcutButton shortcut="Y 4" size="sm" variant="outline" class="h-8 text-xs" onclick={() => onyield?.('comment')}>
      <MessageCircle size={12} class="mr-1" />
      让渡给评论
    </ShortcutButton>
  {/if}
</div>
