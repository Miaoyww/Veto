<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import { getWizardSteps } from './steps'
  import { resolve } from '$app/paths'

  // 向导入口：直接跳转第一个未完成步骤（全部完成则落到确认页）
  onMount(() => {
    const steps = getWizardSteps(wizard.mode)
    const target = steps.find((step) => !wizard.isStepValidById(step.id)) ?? steps[steps.length - 1]
    void goto(resolve(target.path), { replaceState: true })
  })
</script>
