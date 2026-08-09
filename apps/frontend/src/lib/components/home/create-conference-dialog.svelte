<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import UsersIcon from '@lucide/svelte/icons/users'
  import PuzzleIcon from '@lucide/svelte/icons/puzzle'
  import { navigateToConference } from '$lib/utils'
  import { createConference } from '$lib/stores/conference/conference-store'
  import {
    delegationPresets,
    presetsLoading,
    presetsLoaded,
    loadDelegationPresets,
    startAutoRefresh,
    stopAutoRefresh,
    formatPresetAsText,
    type DelegationPreset
  } from '$lib/stores/conference/delegation-preset-store'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'

  let { open = $bindable(false) }: { open: boolean } = $props()

  // ---- Form state ----
  let name = $state('')
  let venue = $state('')
  let defaultSpeakingTimeSec = $state(120)

  // 代表团文本
  let delegationsText = $state('')

  // 常用五常模板
  const P5_TEMPLATE = `中华人民共和国,中国
美利坚合众国,美国
法兰西共和国,法国
大不列颠及北爱尔兰联合王国,英国
俄罗斯联邦,俄罗斯`

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
    vetoPower?: boolean
  }[] {
    return delegationsText
      .split('\n')
      .map((line) => {
        const parts = line.split(',').map((s) => s.trim())
        if (parts.length < 1 || !parts[0]) return null
        const vetoPower =
          parts[2]?.toLowerCase() === 'observer' || parts[2]?.toLowerCase() === '观察员'
            ? false
            : undefined
        return {
          name: parts[0],
          shortName: parts[1] || undefined,
          ...(vetoPower !== undefined ? { vetoPower } : {})
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }

  function handleCreate(): void {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const parsedDelegations = parseDelegations()
    if (parsedDelegations.length === 0) return

    const id = createConference(trimmedName, venue.trim() || '未指定会场', [], parsedDelegations, {
      defaultSpeakingTimeSec
    })

    open = false
    resetForm()
    navigateToConference(id)
  }

  function resetForm(): void {
    name = ''
    venue = ''
    defaultSpeakingTimeSec = 120
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

  // ---- 插件预设 ----
  let presetLoaded = $state(false)

  $effect(() => {
    if (open && !presetLoaded) {
      presetLoaded = true
      startAutoRefresh()
      loadDelegationPresets()
    }
    if (!open) {
      presetLoaded = false
    }
  })

  function insertPreset(preset: DelegationPreset): void {
    const text = formatPresetAsText(preset)
    if (delegationsText.trim()) {
      delegationsText = delegationsText.trim() + '\n' + text
    } else {
      delegationsText = text
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content
      class="w-5xl max-w-[calc(100vw-40px)] sm:max-w-5xl h-[85vh]"
      onkeydown={handleKeydown}
    >
      <Dialog.Header>
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold tracking-wide">
          <UsersIcon size={18} class="text-indigo-500" />
          新建大会
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          设定会场与参与代表团，创建后进入模拟流程。
        </Dialog.Description>

        <div class="rounded-md borderpx-3 py-2 text-xs text-gray-400">
          仅支持创建基础的会议议程.
        </div>
      </Dialog.Header>

      <div class="flex w-full items-stretch gap-3 py-2">
        <!-- ====== 左栏：大会设置 ====== -->
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <!-- 大会名称 -->
          <section>
            <Label for="conf-name" class="mb-2 block text-xs text-muted-foreground">大会名称</Label>
            <Input
              id="conf-name"
              bind:value={name}
              class="h-9"
              placeholder="例如：联合国安全理事会第2024次会议"
            />
          </section>

          <!-- 会场 -->
          <section>
            <Label for="conf-venue" class="mb-2 block text-xs text-muted-foreground"
              >会场 / 委员会</Label
            >
            <Input
              id="conf-venue"
              bind:value={venue}
              class="h-9"
              placeholder="例如：安全理事会、人权理事会"
            />
          </section>

          <!-- 默认发言时长 -->
          <section class="mt-auto">
            <Label for="speaking-time" class="mb-2 block text-xs text-muted-foreground">
              默认发言时长
            </Label>
            <div class="flex items-center gap-2">
              <Input
                id="speaking-time"
                type="number"
                min="30"
                max="600"
                step="10"
                bind:value={defaultSpeakingTimeSec}
                class="h-9 w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span class="text-xs tabular-nums text-muted-foreground">
                {Math.floor(defaultSpeakingTimeSec / 60)}分{defaultSpeakingTimeSec % 60}秒
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each [60, 90, 120, 180] as preset (preset)}
                <Button
                  size="sm"
                  variant={defaultSpeakingTimeSec === preset ? 'default' : 'outline'}
                  class="h-7 text-xs"
                  onclick={() => (defaultSpeakingTimeSec = preset)}
                >
                  {preset >= 60
                    ? `${Math.floor(preset / 60)}分${preset % 60 ? (preset % 60) + '秒' : ''}`
                    : `${preset}秒`}
                </Button>
              {/each}
            </div>
          </section>
        </div>

        <!-- ====== 右栏：国家/组织列表 ====== -->
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <section class="flex flex-1 flex-col">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-medium text-muted-foreground">
                国家/组织列表
                {#if parsedDelegationsCount > 0}
                  <Badge variant="outline" class="ml-2 text-[10px]"
                    >{parsedDelegationsCount} 个</Badge
                  >
                {/if}
              </span>
            </div>

            <!-- 插件预设按钮 -->
            {#if $presetsLoaded && $delegationPresets.length > 0}
              <div class="mb-2 flex flex-wrap gap-1.5">
                {#each $delegationPresets as preset (preset.pluginId + '/' + preset.presetId)}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1 text-xs"
                    onclick={() => insertPreset(preset)}
                    title={`${preset.description ?? preset.presetName} — 来源: ${preset.pluginName}`}
                  >
                    <PuzzleIcon size={12} />
                    {preset.presetName}
                    <span class="text-[10px] text-muted-foreground"
                      >({preset.delegations.length})</span
                    >
                  </Button>
                {/each}
                <Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={insertP5}>
                  <PlusIcon size={12} />
                  快速添加五常
                </Button>
              </div>
            {:else if $presetsLoading}
              <p class="mb-2 text-[10px] text-muted-foreground">正在加载插件预设…</p>
            {:else}
              <div class="mb-2">
                <Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={insertP5}>
                  <PlusIcon size={12} />
                  快速添加五常
                </Button>
              </div>
            {/if}

            <Textarea
              bind:value={delegationsText}
              class="h-80 font-mono text-xs"
              placeholder="格式：全称,简称&#10;中华人民共和国,中国&#10;美利坚合众国,美国"
            />
            <p class="mt-1 text-[10px] text-muted-foreground">格式：全称,简称（简称可选）</p>
          </section>
        </div>
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
