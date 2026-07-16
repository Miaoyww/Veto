<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days'
  import GaugeIcon from '@lucide/svelte/icons/gauge'
  import ShieldIcon from '@lucide/svelte/icons/shield'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import PuzzleIcon from '@lucide/svelte/icons/puzzle'
  import SwordsIcon from '@lucide/svelte/icons/swords'
  import FlagIcon from '@lucide/svelte/icons/flag'
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import { navigate } from '$lib/router.svelte'
  import { onMount } from 'svelte'
  import { createBattle } from '$lib/stores/battle/battle-store'
  import { TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/battle/game-clock.store'
  import { CalendarDate, type DateValue } from '@internationalized/date'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import DatePicker from '$lib/components/ui/date-picker.svelte'
  import type { InstalledPlugin } from '$lib/services/plugin-db'
  import { dbGetAllPlugins } from '$lib/services/plugin-db'

  let { open = $bindable(false) }: { open: boolean } = $props()

  /** 已安装的插件列表（异步从主进程文件系统加载） */
  let installedPlugins = $state<InstalledPlugin[]>([])
  onMount(async () => {
    installedPlugins = await dbGetAllPlugins()
  })

  const campaignPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'campaign'))
  const factionPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'faction'))
  const scenarioPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'scenario'))
  const rulesetPlugins = $derived(installedPlugins.filter((p) => p.manifest.type === 'ruleset'))
  const hasAnyMods = $derived(
    campaignPlugins.length +
      factionPlugins.length +
      scenarioPlugins.length +
      rulesetPlugins.length >
      0
  )

  let step = $state<'mode_select' | 'campaign' | 'free'>('mode_select')

  let draft = $state({
    name: '',
    startDate: new CalendarDate(2026, 1, 1) as DateValue | undefined,
    timeScale: 60,
    pixelsPerKm: 10,
    iconStyle: 'nato' as 'nato' | 'simple',
    selectedCampaign: null as string | null,
    selectedFaction: null as string | null,
    selectedScenario: null as string | null,
    selectedRuleset: null as string | null
  })

  function resetDraft() {
    draft = {
      name: '',
      startDate: new CalendarDate(2026, 1, 1),
      timeScale: 60,
      pixelsPerKm: 10,
      iconStyle: 'nato',
      selectedCampaign: null,
      selectedFaction: null,
      selectedScenario: null,
      selectedRuleset: null
    }
  }

  function handleCreate() {
    const name = draft.name.trim()
    if (!name) return
    const enabledMods = draft.selectedCampaign
      ? [draft.selectedCampaign]
      : [draft.selectedFaction, draft.selectedScenario, draft.selectedRuleset].filter(
          (id): id is string => id !== null
        )
    if (enabledMods.length === 0) {
      enabledMods.push('base')
    }
    const id = createBattle(name, {
      startDate: draft.startDate?.toString(),
      timeScale: draft.timeScale,
      pixelsPerKm: draft.pixelsPerKm,
      iconStyle: draft.iconStyle,
      enabledMods,
      campaignId: draft.selectedCampaign ?? undefined
    })
    open = false
    navigate(`/battle/${id}`)
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      resetDraft()
      step = 'mode_select'
    }
    open = value
  }

  function enterCampaignMode() {
    step = 'campaign'
    if (campaignPlugins.length > 0 && !draft.selectedCampaign) {
      draft.selectedCampaign = campaignPlugins[0].id
    }
  }

  function enterFreeMode() {
    step = 'free'
    draft.selectedCampaign = null
  }

  function backToModeSelect() {
    step = 'mode_select'
    draft.selectedCampaign = null
  }

  const selectedCampaignMeta = $derived(
    campaignPlugins.find((p) => p.id === draft.selectedCampaign) ?? null
  )
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-xl">
      <Dialog.Header class="pb-1">
        <Dialog.Title class="text-base font-semibold tracking-wide">
          {#if step === 'mode_select'}
            新建战局
          {:else if step === 'campaign'}
            新建战役推演
          {:else}
            新建自由推演
          {/if}
        </Dialog.Title>
        <Dialog.Description class="text-xs text-muted-foreground">
          {#if step === 'mode_select'}
            选择推演模式开始。战役模式将自动加载预设的阵营、地图与事件。
          {:else if step === 'campaign'}
            选定战役，为战局命名后即可进入推演。
          {:else}
            自由配置所有参数，从头构建一场推演。
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-0 py-2">
        {#if step === 'mode_select'}
          <div class="grid grid-cols-2 gap-4 px-1 py-4">
            <button
              type="button"
              class="group flex flex-col items-center gap-3 rounded-xl border-2
                border-stone-200 bg-stone-50 p-6 text-center
                transition-all hover:border-amber-400 hover:bg-amber-50
                hover:shadow-md dark:border-stone-700 dark:bg-stone-800/60
                dark:hover:border-amber-600 dark:hover:bg-amber-900/20"
              onclick={enterCampaignMode}
              disabled={campaignPlugins.length === 0}
            >
              <div class="flex h-14 w-14 items-center justify-center rounded-xl
                bg-amber-100 text-amber-600 transition-transform
                group-hover:scale-110 dark:bg-amber-900/30 dark:text-amber-400">
                <SwordsIcon size={28} />
              </div>
              <div>
                <p class="text-sm font-semibold text-stone-800 dark:text-stone-200">战役模式</p>
                <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  选择预设战役包，阵营、地图、事件自动加载，命名后即刻推演。
                </p>
              </div>
              {#if campaignPlugins.length === 0}
                <span class="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                  暂无可用战役
                </span>
              {:else}
                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {campaignPlugins.length} 个可用
                </span>
              {/if}
            </button>

            <button
              type="button"
              class="group flex flex-col items-center gap-3 rounded-xl border-2
                border-stone-200 bg-stone-50 p-6 text-center
                transition-all hover:border-emerald-400 hover:bg-emerald-50
                hover:shadow-md dark:border-stone-700 dark:bg-stone-800/60
                dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20"
              onclick={enterFreeMode}
            >
              <div class="flex h-14 w-14 items-center justify-center rounded-xl
                bg-emerald-100 text-emerald-600 transition-transform
                group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400">
                <PuzzleIcon size={28} />
              </div>
              <div>
                <p class="text-sm font-semibold text-stone-800 dark:text-stone-200">自由模式</p>
                <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  自行组合阵营、Mod 与时间参数，完全自定义推演环境。
                </p>
              </div>
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                完全自定义
              </span>
            </button>
          </div>

        {:else if step === 'campaign'}
          <button type="button"
            class="mb-1 flex items-center gap-1 px-1 text-xs text-muted-foreground
              transition-colors hover:text-stone-800 dark:hover:text-stone-200"
            onclick={backToModeSelect}>
            <ArrowLeftIcon size={12} />
            返回模式选择
          </button>

          <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
            <Label class="mb-2 block text-xs text-muted-foreground">
              <FlagIcon size={11} class="mr-1 inline" />
              选择战役
            </Label>
            <div class="flex flex-wrap gap-1.5">
              {#each campaignPlugins as p (p.id)}
                <button type="button"
                  class="rounded-lg border px-3 py-2 text-left text-xs transition-all
                    {draft.selectedCampaign === p.id
                      ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-300 dark:border-amber-600 dark:bg-amber-900/30 dark:ring-amber-700'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:hover:border-stone-500'}"
                  onclick={() => (draft.selectedCampaign = p.id)}>
                  <span class="font-medium text-stone-800 dark:text-stone-200">{p.manifest.name}</span>
                  {#if p.manifest.description}
                    <span class="mt-0.5 block text-[10px] text-muted-foreground line-clamp-1">
                      {p.manifest.description}
                    </span>
                  {/if}
                  <span class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    v{p.manifest.version ?? '?.?.?'} · {p.manifest.author}
                  </span>
                </button>
              {/each}
            </div>
          </section>

          {#if selectedCampaignMeta}
            <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
              <div class="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-600 dark:bg-stone-800/60">
                <div class="flex items-center gap-2">
                  <SwordsIcon size={14} class="text-amber-500" />
                  <span class="text-xs font-medium text-stone-700 dark:text-stone-300">
                    {selectedCampaignMeta.manifest.name}
                  </span>
                </div>
                {#if selectedCampaignMeta.manifest.description}
                  <p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {selectedCampaignMeta.manifest.description}
                  </p>
                {/if}
                <div class="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span class="rounded bg-stone-200 px-1.5 py-0.5 dark:bg-stone-700">
                    作者 {selectedCampaignMeta.manifest.author}
                  </span>
                  <span class="rounded bg-stone-200 px-1.5 py-0.5 dark:bg-stone-700">
                    v{selectedCampaignMeta.manifest.version}
                  </span>
                </div>
              </div>
            </section>
          {/if}

          <section class="px-1 py-3">
            <Label for="battle-name-campaign" class="mb-2 block text-xs text-muted-foreground">
              为这场推演命名
            </Label>
            <Input
              id="battle-name-campaign"
              bind:value={draft.name}
              placeholder={selectedCampaignMeta
                ? `输入名称...（如：${selectedCampaignMeta.manifest.name} 第一回合）`
                : '输入战局名称...'}
              class="h-9"
              onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCreate()}
            />
          </section>

        {:else if step === 'free'}
          <button type="button"
            class="mb-1 flex items-center gap-1 px-1 text-xs text-muted-foreground
              transition-colors hover:text-stone-800 dark:hover:text-stone-200"
            onclick={backToModeSelect}>
            <ArrowLeftIcon size={12} />
            返回模式选择
          </button>

          <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
            <Label for="battle-name" class="mb-2 block text-xs text-muted-foreground">战局代号</Label>
            <Input
              id="battle-name"
              bind:value={draft.name}
              placeholder="输入战局名称..."
              class="h-9"
              onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCreate()}
            />
          </section>

          <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
            <div class="mb-3 flex items-center gap-1.5">
              <CalendarDaysIcon size={12} class="text-muted-foreground" />
              <span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">时间参数</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">模拟日期</Label>
                <DatePicker bind:value={draft.startDate} class="h-9 w-full text-sm" />
              </div>
              <div>
                <Label class="mb-1.5 block text-xs text-muted-foreground">
                  <GaugeIcon size={11} class="mr-1 inline text-muted-foreground" />
                  时间流速 (模拟秒/真实秒)
                </Label>
                <input type="number" min="1" bind:value={draft.timeScale}
                  class="h-9 w-full [appearance:textfield] rounded-lg border border-stone-300 bg-white
                    px-3 text-sm text-stone-800 transition-colors outline-none focus:border-stone-400
                    focus:ring-2 focus:ring-stone-300/60 dark:border-stone-600 dark:bg-stone-800
                    dark:text-stone-200 dark:focus:border-stone-400 dark:focus:ring-stone-600/40
                    [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <div class="mt-1.5 flex flex-wrap gap-1">
                  {#each TIME_SCALES as scale}
                    <button type="button"
                      class="rounded border px-2 py-0.5 text-[11px] transition-all
                        {draft.timeScale === scale
                          ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                          : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                      onclick={() => (draft.timeScale = scale)}>
                      {TIME_SCALE_LABELS[scale]}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </section>

          <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
            <Label for="pixels-per-km" class="mb-1.5 block text-xs text-muted-foreground">
              地图比例尺 (px/km)
            </Label>
            <input id="pixels-per-km" type="number" min="1" max="500" step="1"
              bind:value={draft.pixelsPerKm}
              class="h-9 w-full [appearance:textfield] rounded-lg border border-stone-300 bg-white
                px-3 text-sm text-stone-800 transition-colors outline-none focus:border-stone-400
                focus:ring-2 focus:ring-stone-300/60 dark:border-stone-600 dark:bg-stone-800
                dark:text-stone-200 dark:focus:border-stone-400
                [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </section>

          <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
            <div class="mb-3 flex items-center gap-1.5">
              <ShieldIcon size={12} class="text-muted-foreground" />
              <span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">视觉标准</span>
            </div>
            <div class="flex gap-2">
              <button type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-xs transition-all
                  {draft.iconStyle === 'nato'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                    : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                onclick={() => (draft.iconStyle = 'nato')}>
                <ShieldIcon size={13} />
                北约标准
              </button>
              <button type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-xs transition-all
                  {draft.iconStyle === 'simple'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                onclick={() => (draft.iconStyle = 'simple')}>
                <LayersIcon size={13} />
                简约图标
              </button>
            </div>
          </section>

          {#if hasAnyMods}
            <section class="border-b border-stone-200 px-1 py-3 dark:border-stone-700">
              <div class="mb-3 flex items-center gap-1.5">
                <PuzzleIcon size={12} class="text-muted-foreground" />
                <span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">Mod 配置</span>
              </div>

              {#if factionPlugins.length > 0}
                <div class="mb-2">
                  <Label class="mb-1.5 block text-xs text-muted-foreground">阵营包</Label>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button"
                      class="rounded-md border px-2.5 py-1 text-xs transition-all
                        {!draft.selectedFaction
                          ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                          : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                      onclick={() => (draft.selectedFaction = 'null')}>基础</button>
                    {#each factionPlugins as p (p.id)}
                      <button type="button"
                        class="rounded-md border px-2.5 py-1 text-xs transition-all
                          {draft.selectedFaction === p.id
                            ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                            : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                        onclick={() => (draft.selectedFaction = p.id)}>{p.manifest.name}</button>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if scenarioPlugins.length > 0}
                <div class="mb-2">
                  <Label class="mb-1.5 block text-xs text-muted-foreground">剧情包</Label>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button"
                      class="rounded-md border px-2.5 py-1 text-xs transition-all
                        {!draft.selectedScenario
                          ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                          : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                      onclick={() => (draft.selectedScenario = null)}>无</button>
                    {#each scenarioPlugins as p (p.id)}
                      <button type="button"
                        class="rounded-md border px-2.5 py-1 text-xs transition-all
                          {draft.selectedScenario === p.id
                            ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                            : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                        onclick={() => (draft.selectedScenario = p.id)}>{p.manifest.name}</button>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if rulesetPlugins.length > 0}
                <div>
                  <Label class="mb-1.5 block text-xs text-muted-foreground">规则包</Label>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button"
                      class="rounded-md border px-2.5 py-1 text-xs transition-all
                        {!draft.selectedRuleset
                          ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                          : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                      onclick={() => (draft.selectedRuleset = null)}>无</button>
                    {#each rulesetPlugins as p (p.id)}
                      <button type="button"
                        class="rounded-md border px-2.5 py-1 text-xs transition-all
                          {draft.selectedRuleset === p.id
                            ? 'border-stone-600 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-600'
                            : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500'}"
                        onclick={() => (draft.selectedRuleset = p.id)}>{p.manifest.name}</button>
                    {/each}
                  </div>
                </div>
              {/if}
            </section>
          {/if}
        {/if}
      </div>

      <Dialog.Footer class="pt-1">
        {#if step === 'mode_select'}
          <Button variant="outline" onclick={() => (open = false)}>取消</Button>
        {:else}
          <Button variant="outline" onclick={backToModeSelect}>
            <ArrowLeftIcon size={13} class="mr-1" />
            返回
          </Button>
          <Button onclick={handleCreate} disabled={!draft.name.trim()} class="min-w-[120px] gap-2">
            <PlusIcon size={15} />
            {#if step === 'campaign'}
              开始推演
            {:else}
              初始化战局
            {/if}
          </Button>
        {/if}
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
