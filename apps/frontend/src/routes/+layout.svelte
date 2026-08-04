<script lang="ts">
  import '../app.css'
  import '../css/components.css'
  import '$units' // 初始化 ModRegistry 基础数据
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  import TitleBar from '$lib/components/titlebar.svelte'
  import SettingsDialog from '$lib/components/settings/settings-dialog.svelte'
  import { ModeWatcher } from 'mode-watcher'
  import { isLoggedIn } from '$lib/stores/auth-store'

  let { children } = $props()

  onMount(() => {
    if (!isLoggedIn()) {
      goto(resolve('/login'))
    }
  })
</script>

<TitleBar />

<SettingsDialog />
<ModeWatcher />

<div>
  {@render children?.()}
</div>
