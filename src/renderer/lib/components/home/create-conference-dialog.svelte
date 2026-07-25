<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import XIcon from '@lucide/svelte/icons/x'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import UsersIcon from '@lucide/svelte/icons/users'
  import { navigate } from '$lib/router.svelte'
  import { createConference } from '$lib/stores/conference/conference-store'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'

  let { open = $bindable(false) }: { open: boolean } = $props()

  // ---- Form state ----
  let name = $state('')
  let venue = $state('')
  let defaultSpeakingTimeSec = $state(120)

  // 议题列表
  let agendaItems = $state<{ key: number; title: string; description: string }[]>([
    { key: 1, title: '', description: '' }
  ])
  let agendaKeyCounter = $state(1)

  // 代表团文本
  let delegationsText = $state('')

  // 常用五常模板
  const P5_TEMPLATE = `中华人民共和国,中国
美利坚合众国,美国
法兰西共和国,法国
大不列颠及北爱尔兰联合王国,英国
俄罗斯联邦,俄罗斯`

  function addAgendaItem(): void {
    agendaKeyCounter++
    agendaItems = [...agendaItems, { key: agendaKeyCounter, title: '', description: '' }]
  }

  function removeAgendaItem(key: number): void {
    if (agendaItems.length <= 1) return
    agendaItems = agendaItems.filter((a) => a.key !== key)
  }

  function updateAgendaTitle(key: number, title: string): void {
    agendaItems = agendaItems.map((a) => (a.key === key ? { ...a, title } : a))
  }

  function updateAgendaDesc(key: number, description: string): void {
    agendaItems = agendaItems.map((a) => (a.key === key ? { ...a, description } : a))
  }

  function insertP5(): void {
    if (delegationsText.trim()) {
      delegationsText = delegationsText.trim() + '\n' + P5_TEMPLATE
    } else {
      delegationsText = P5_TEMPLATE
    }
  }

  function parseDelegations(): {
    name: string
    shortName?: string
  }[] {
    return delegationsText
      .split('\n')
      .map((line) => {
        const parts = line.split(',').map((s) => s.trim())
        if (parts.length < 1 || !parts[0]) return null
        return {
          name: parts[0],
          shortName: parts[1] || undefined
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }

  function handleCreate(): void {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const parsedDelegations = parseDelegations()
    if (parsedDelegations.length === 0) return

    const validAgenda = agendaItems.filter((a) => a.title.trim())

    const id = createConference(
      trimmedName,
      venue.trim() || '未指定会场',
      validAgenda.map((a) => ({ title: a.title.trim(), description: a.description.trim() || undefined })),
      parsedDelegations,
      { defaultSpeakingTimeSec }
    )

    open = false
    resetForm()
    navigate(`/conference/${id}`)
  }

  function resetForm(): void {
    name = ''
    venue = ''
    defaultSpeakingTimeSec = 120
    agendaKeyCounter = 1
    agendaItems = [{ key: 1, title: '', description: '' }]
    delegationsText = ''
  }

  function handleOpenChange(value: boolean): void {
    if (value) {
      resetForm()
    }
    open = value
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleCreate()
    }
  }

  const parsedDelegationsCount = $derived(parseDelegations().length)
  const canCreate = $derived(name.trim().length > 0 && parsedDelegationsCount > 0)
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-2xl" onkeydown={handleKeydown}>
      <Dialog.Header class="pb-1">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold tracking-wide">
          <UsersIcon size={18} class="text-indigo-500" />
          新建大会
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          设定会场、议题以及参与代表团，创建后进入模拟流程。
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-0 py-2">
        <!-- 大会名称 -->
        <section class="px-1 py-3">
          <Label for="conf-name" class="mb-2 block text-xs text-muted-foreground">大会名称</Label>
          <Input
            id="conf-name"
            bind:value={name}
            placeholder="如：安理会2026年第3次紧急会议"
            class="h-9"
          />
        </section>

        <Separator />

        <!-- 会场 -->
        <section class="px-1 py-3">
          <Label for="conf-venue" class="mb-2 block text-xs text-muted-foreground">会场 / 委员会</Label>
          <Input
            id="conf-venue"
            bind:value={venue}
            placeholder="如：联合国安全理事会"
            class="h-9"
          />
        </section>

        <Separator />

        <!-- 议题列表 -->
        <section class="px-1 py-3">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">议题列表</span>
            <Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={addAgendaItem}>
              <PlusIcon size={12} />
              添加议题
            </Button>
          </div>

          <div class="flex flex-col gap-3">
            {#each agendaItems as item (item.key)}
              <div class="flex items-start gap-2">
                <div class="flex flex-1 flex-col gap-1.5">
                  <Input
                    value={item.title}
                    placeholder="议题标题（如：核裁军、气候变化）"
                    class="h-8 text-sm"
                    oninput={(e) => updateAgendaTitle(item.key, (e.target as HTMLInputElement).value)}
                  />
                  <Input
                    value={item.description}
                    placeholder="简要描述（可选）"
                    class="h-8 text-sm text-muted-foreground"
                    oninput={(e) => updateAgendaDesc(item.key, (e.target as HTMLInputElement).value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="mt-0.5 shrink-0 text-muted-foreground hover:text-red-500"
                  disabled={agendaItems.length <= 1}
                  onclick={() => removeAgendaItem(item.key)}
                >
                  <Trash2Icon size={14} />
                </Button>
              </div>
            {/each}
          </div>
        </section>

        <Separator />

        <!-- 国家/组织列表 -->
        <section class="px-1 py-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">
              国家/组织列表
              {#if parsedDelegationsCount > 0}
                <Badge variant="outline" class="ml-2 text-[10px]">{parsedDelegationsCount} 个</Badge>
              {/if}
            </span>
            <Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={insertP5}>
              <PlusIcon size={12} />
              快速添加五常
            </Button>
          </div>

          <Textarea
            bind:value={delegationsText}
            placeholder="每行一个代表团，格式：全称,简称&#10;示例：&#10;中华人民共和国,中国&#10;美利坚合众国,美国&#10;德意志联邦共和国,德国"
            class="min-h-[160px] font-mono text-xs"
          />
          <p class="mt-1 text-[10px] text-muted-foreground">
            格式：全称,简称（简称可选）
          </p>
        </section>

        <Separator />

        <!-- 默认发言时间 -->
        <section class="px-1 py-3">
          <Label for="speaking-time" class="mb-2 block text-xs text-muted-foreground">
            默认发言时间（秒）
          </Label>
          <div class="flex items-center gap-2">
            <Input
              id="speaking-time"
              type="number"
              min="30"
              max="600"
              step="10"
              bind:value={defaultSpeakingTimeSec}
              class="h-9 w-32 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span class="text-xs text-muted-foreground">
              {Math.floor(defaultSpeakingTimeSec / 60)}分{defaultSpeakingTimeSec % 60}秒
            </span>
            <div class="flex gap-1">
              {#each [60, 90, 120, 180] as preset}
                <Button
                  size="sm"
                  variant={defaultSpeakingTimeSec === preset ? 'default' : 'outline'}
                  class="h-7 text-xs"
                  onclick={() => (defaultSpeakingTimeSec = preset)}
                >
                  {preset >= 60 ? `${Math.floor(preset / 60)}分${preset % 60 ? preset % 60 + '秒' : ''}` : `${preset}秒`}
                </Button>
              {/each}
            </div>
          </div>
        </section>
      </div>

      <Dialog.Footer class="pt-1">
        <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        <Button onclick={handleCreate} disabled={!canCreate} class="min-w-[140px] gap-2">
          <PlusIcon size={15} />
          创建大会
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
