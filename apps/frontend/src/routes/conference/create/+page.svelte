<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import { wizardSteps } from './steps'
  import { resolve } from '$app/paths'

  // 向导入口：直接跳转第一个未完成步骤（全部完成则落到确认页）
  onMount(() => {
    const target = wizardSteps[wizard.firstIncompleteStep()]
    void goto(resolve(target.path), { replaceState: true })
  })
</script>
