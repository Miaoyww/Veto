<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ArrowLeft, Wrench } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import TimelineControl from '$lib/components/tools/timeline-control.svelte'
  import {
    getTimelineEngine,
    disposeTimelineEngine,
    currentTimelineId,
    timelines,
  } from '$lib/classes/stores/timeline-store'
  import { get } from 'svelte/store'
  import { TimelineEngine } from '$lib/classes/engine/timeline-engine.svelte'

  const toolId = $derived($page.params.tool_id ?? null)

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
  <!-- 顶部栏 -->
  <div class="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/60 backdrop-blur-md">
    <Button variant="ghost" size="icon" onclick={() => goto('/tools')}>
      <ArrowLeft size={18} />
    </Button>
    <Wrench size={20} class="text-muted-foreground" />
    <h1 class="text-base font-semibold text-foreground">{timelineName || '时间线'}</h1>
    <span class="text-sm text-muted-foreground">· 时间线模拟器</span>
  </div>

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
