<script lang="ts">
  import { Search, Plus, Users, Monitor } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js'
  import * as InputGroup from '$lib/components/ui/input-group/index.js'
  import * as Card from '$lib/components/ui/card/index.js'
  import { conferences } from '$lib/stores/conference/conference-store'
  import ConferenceCard from '$lib/components/home/conference-card.svelte'
  import CreateConferenceDialog from '$lib/components/home/create-conference-dialog.svelte'
  import DisplayOnlyDialog from '$lib/components/conference/display-only-dialog.svelte'
  import { cn } from '$lib/utils.js'
  import { fly } from 'svelte/transition'

  interface Props {
    class?: string
  }

  let { class: className }: Props = $props()

  let query = $state('')
  let dialogOpen = $state(false)
  let displayOnlyDialogOpen = $state(false)

  const filteredConferences = $derived(
    query.trim()
      ? $conferences.filter(
          (c) =>
            c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            c.venue.toLowerCase().includes(query.trim().toLowerCase())
        )
      : $conferences
  )
</script>

<div
  class={cn('flex h-full min-w-0 flex-1 flex-col bg-background', className)}
  in:fly={{ y: 8, duration: 320, opacity: 0 }}
>
  <!-- Header -->
  <div class="grid grid-cols-3 items-center gap-6 border-b px-8 py-5">
    <!-- 左侧：标题 -->
    <div>
      <h2 class="text-xl font-semibold text-foreground">大会管理</h2>
      <p class="mt-0.5 text-sm text-muted-foreground">
        {$conferences.length} 场大会
      </p>
    </div>

    <!-- 中间：搜索 -->
    <InputGroup.Root>
      <InputGroup.Input bind:value={query} placeholder="搜索大会..." />
      <InputGroup.Addon>
        <Search class="h-4 w-4" />
      </InputGroup.Addon>
    </InputGroup.Root>

    <!-- 右侧：操作 -->
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => (displayOnlyDialogOpen = true)} class="gap-2">
        <Monitor size={16} />
        仅展示
      </Button>
      <Button onclick={() => (dialogOpen = true)} class="gap-2">
        <Plus size={16} />
        新建大会
      </Button>
    </div>
  </div>

  <!-- Conference List -->
  <ScrollArea class="flex-1">
    <div class="px-8 py-6">
      {#if filteredConferences.length === 0}
        <Card.Root class="border-dashed bg-card/30 py-16 text-center shadow-none">
          <Card.Content class="p-0">
            {#if query.trim() && $conferences.length > 0}
              <p class="text-muted-foreground">未找到匹配的大会</p>
              <p class="mt-1 text-sm text-muted-foreground/70">试试其他关键词？</p>
            {:else}
              <div class="flex flex-col items-center gap-3">
                <Users size={40} class="opacity-30" />
                <p class="text-muted-foreground">暂无已保存的大会</p>
                <p class="text-sm text-muted-foreground/70">创建一场新大会开始模拟</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="flex flex-col gap-3">
          {#each filteredConferences as conf (conf.id)}
            <ConferenceCard conference={conf} />
          {/each}
        </div>
      {/if}
    </div>
  </ScrollArea>
</div>

<!-- Create Conference Dialog -->
<CreateConferenceDialog bind:open={dialogOpen} />

<!-- Display Only Dialog -->
<DisplayOnlyDialog bind:open={displayOnlyDialogOpen} />
