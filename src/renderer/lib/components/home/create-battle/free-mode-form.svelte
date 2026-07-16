<script lang="ts">
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days'
  import GaugeIcon from '@lucide/svelte/icons/gauge'
  import ShieldIcon from '@lucide/svelte/icons/shield'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import PuzzleIcon from '@lucide/svelte/icons/puzzle'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import DatePicker from '$lib/components/ui/date-picker.svelte'
  import { TIME_SCALES, TIME_SCALE_LABELS } from '$lib/stores/battle/game-clock.store'
  import type { DateValue } from '@internationalized/date'
  import type { InstalledPlugin } from '$lib/services/plugin-db'
  import { cn } from '$lib/utils.js'

  interface Props {
    draft: {
      name: string
      startDate: DateValue | undefined
      timeScale: number
      pixelsPerKm: number
      iconStyle: 'nato' | 'simple'
      selectedFaction: string | null
      selectedScenario: string | null
      selectedRuleset: string | null
    }
    factionPlugins: InstalledPlugin[]
    scenarioPlugins: InstalledPlugin[]
    rulesetPlugins: InstalledPlugin[]
    hasAnyMods: boolean
    onenter?: () => void
  }

  let {
    draft = $bindable(),
    factionPlugins,
    scenarioPlugins,
    rulesetPlugins,
    hasAnyMods,
    onenter
  }: Props = $props()

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onenter?.()
  }
</script>

<div class="flex flex-col gap-0">
  <!-- 战局代号 -->
  <section class="px-1 py-3">
    <Label for="battle-name" class="mb-2 block text-xs text-muted-foreground">战局代号</Label>
    <Input
      id="battle-name"
      bind:value={draft.name}
      placeholder="输入战局名称..."
      class="h-9"
      onkeydown={handleKeydown}
    />
  </section>

  <Separator />

  <!-- 时间参数 -->
  <section class="px-1 py-3">
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
        <Input
          type="number"
          min="1"
          bind:value={draft.timeScale}
          class="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div class="mt-1.5 flex flex-wrap gap-1">
          {#each TIME_SCALES as scale}
            <Button
              size="sm"
              variant={draft.timeScale === scale ? 'default' : 'outline'}
              onclick={() => (draft.timeScale = scale)}
            >
              {TIME_SCALE_LABELS[scale]}
            </Button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <Separator />

  <!-- 地图比例尺 -->
  <section class="px-1 py-3">
    <Label for="pixels-per-km" class="mb-1.5 block text-xs text-muted-foreground">
      地图比例尺 (px/km)
    </Label>
    <Input
      id="pixels-per-km"
      type="number"
      min="1"
      max="500"
      step="1"
      bind:value={draft.pixelsPerKm}
      class="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  </section>

  <Separator />

  <!-- 视觉标准 -->
  <section class="px-1 py-3">
    <div class="mb-3 flex items-center gap-1.5">
      <ShieldIcon size={12} class="text-muted-foreground" />
      <span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">视觉标准</span>
    </div>
    <div class="flex gap-2">
      <Button
        variant="outline"
        class={cn(
          'flex-1',
          draft.iconStyle === 'nato'
            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
            : ''
        )}
        onclick={() => (draft.iconStyle = 'nato')}
      >
        <ShieldIcon size={13} />
        北约标准
      </Button>
      <Button
        variant="outline"
        class={cn(
          'flex-1',
          draft.iconStyle === 'simple'
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : ''
        )}
        onclick={() => (draft.iconStyle = 'simple')}
      >
        <LayersIcon size={13} />
        简约图标
      </Button>
    </div>
  </section>

  {#if hasAnyMods}
    <Separator />

    <!-- Mod 配置 -->
    <section class="px-1 py-3">
      <div class="mb-3 flex items-center gap-1.5">
        <PuzzleIcon size={12} class="text-muted-foreground" />
        <span class="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">Mod 配置</span>
      </div>

      {#if factionPlugins.length > 0}
        <div class="mb-2">
          <Label class="mb-1.5 block text-xs text-muted-foreground">阵营包</Label>
          <div class="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={!draft.selectedFaction ? 'default' : 'outline'}
              onclick={() => (draft.selectedFaction = null)}
            >
              基础
            </Button>
            {#each factionPlugins as p (p.id)}
              <Button
                size="sm"
                variant={draft.selectedFaction === p.id ? 'default' : 'outline'}
                onclick={() => (draft.selectedFaction = p.id)}
              >
                {p.manifest.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if scenarioPlugins.length > 0}
        <div class="mb-2">
          <Label class="mb-1.5 block text-xs text-muted-foreground">剧情包</Label>
          <div class="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={!draft.selectedScenario ? 'default' : 'outline'}
              onclick={() => (draft.selectedScenario = null)}
            >
              无
            </Button>
            {#each scenarioPlugins as p (p.id)}
              <Button
                size="sm"
                variant={draft.selectedScenario === p.id ? 'default' : 'outline'}
                onclick={() => (draft.selectedScenario = p.id)}
              >
                {p.manifest.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if rulesetPlugins.length > 0}
        <div>
          <Label class="mb-1.5 block text-xs text-muted-foreground">规则包</Label>
          <div class="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={!draft.selectedRuleset ? 'default' : 'outline'}
              onclick={() => (draft.selectedRuleset = null)}
            >
              无
            </Button>
            {#each rulesetPlugins as p (p.id)}
              <Button
                size="sm"
                variant={draft.selectedRuleset === p.id ? 'default' : 'outline'}
                onclick={() => (draft.selectedRuleset = p.id)}
              >
                {p.manifest.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  {/if}
</div>
