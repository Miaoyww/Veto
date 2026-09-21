<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Wrench } from '@lucide/svelte'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import TimelineControl from '$lib/components/tools/timeline-control.svelte'
  import {
    getTimelineEngine,
    disposeTimelineEngine,
    currentTimelineId,
    timelines
  } from '$lib/classes/stores/timeline-store'
  import { get } from 'svelte/store'
  import { TimelineEngine } from '$lib/classes/services/engine/timeline-engine.svelte'
  import PageTopBar from '$lib/components/conference/common/page-top-bar.svelte'

  const toolId = $derived(page.params.tool_id ?? null)
  const conferenceId = $derived(page.params.conference_id ?? null)
  const committeeId = $derived(page.params.committee_id ?? null)

  let engine = $state<TimelineEngine | null>(null)
  let timelineName = $state('')

  onMount(() => {
    if (toolId) {
      currentTimelineId.set(toolId)
      engine = getTimelineEngine(toolId) ?? null
      if (engine) {
        const tl = get(timelines).find((t) => t.id === toolId)
        timelineName = tl?.name ?? ''
      }
    }
  })

  onDestroy(() => {
    if (toolId) {
      disposeTimelineEngine(toolId)
    }
  })
</script>

<div class="flex flex-col h-[calc(100vh-2.25rem)] w-screen overflow-hidden">
  <PageTopBar
    icon={Wrench}
    title={timelineName || '时间线'}
    subtitle="时间线模拟器"
    iconClass="text-muted-foreground"
    backHref={resolve(`/client/${conferenceId}/committee/${committeeId}/chair/tools`)}
  />

  <!-- 内容区域 -->
  <div class="flex-1 overflow-auto p-4">
    {#if engine}
      <TimelineControl {engine} />
    {:else}
      <div class="flex items-center justify-center h-full text-muted-foreground">
        <p>时间线不存在或加载失败</p>
      </div>
    {/if}
  </div>
</div>
