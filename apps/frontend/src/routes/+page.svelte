<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  import { Button } from '$lib/components/ui/button'
  import { Spinner } from '$lib/components/ui/spinner'

  onMount(() => {
    goto(resolve('/conference'))
  })
</script>

<div class="flex min-h-screen flex-col bg-background px-6 py-8">
  <main
    class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    aria-live="polite"
  >
    <Spinner class="size-8 text-foreground" aria-label="正在加载" />
    <p class="text-sm text-muted-foreground">正在加载，请稍候…</p>
  </main>

  <footer class="flex justify-center">
    <Button variant="outline" href={resolve('/conference')}>前往大会页面</Button>
  </footer>
</div>
