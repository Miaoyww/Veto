<script lang="ts">
  import { cn } from '$lib/classes/utils.js'
  import type { InstalledPlugin } from '$lib/classes/services/plugin/plugin-db'

  interface Props {
    plugin: InstalledPlugin
    selected: boolean
    onclick: () => void
  }

  let { plugin, selected, onclick }: Props = $props()
</script>

<button
  type="button"
  class={cn(
    'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
    selected
      ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800'
      : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
  )}
  {onclick}
>
  <span class="text-sm font-medium">{plugin.manifest.name}</span>
  <span class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
    v{plugin.manifest.version ?? '?.?.?'} · {plugin.manifest.author}
  </span>
</button>
