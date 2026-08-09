<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import { VETO_NAME } from '$lib/const'
  import {
    currentConference,
    loadConference,
    currentConferenceId,
    pointDraft,
    saveConferencesNow
  } from '$lib/stores/conference/conference-store'
  import { destroyAllTimers } from '$lib/engine/conference-engine'
  import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
  import ConferenceWorkspace from '$lib/components/conference/layout/conference-workspace.svelte'

  const conferenceId = $derived($page.params.conference_id ?? null)

  onMount(() => {
    if (conferenceId) {
      const alreadyLoaded = $currentConferenceId === conferenceId
      if (!alreadyLoaded) {
        loadConference(conferenceId)
      }
    }
  })

  // 自动同步当前状态到 Display 窗口（含动议草稿）
  $effect(() => {
    const conf = $currentConference
    if (conf) {
      getDisplayBridge().sendUpdate(
        buildDisplayData(conf, {
          pointDraft: $pointDraft ?? undefined
        })
      )
    }
  })

  onDestroy(async () => {
    // 离开页面前立即保存，确保 activeSpeaker 计时器状态不丢失
    await saveConferencesNow()
    destroyAllTimers()
  })
</script>

<svelte:head>
  <title>{VETO_NAME} - 模拟大会</title>
</svelte:head>

<ConferenceWorkspace />
