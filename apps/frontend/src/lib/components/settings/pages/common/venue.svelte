<script lang="ts">
  import SettingCard from '../../settings-card.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { globalSettings } from '$lib/classes/stores/app/global-settings.store'
  import { fly } from 'svelte/transition'

  let offsetX = $state($globalSettings.displayOffsetX)
  let offsetY = $state($globalSettings.displayOffsetY)

  $effect(() => {
    offsetX = $globalSettings.displayOffsetX
    offsetY = $globalSettings.displayOffsetY
  })

  function saveIconStyle(style: 'nato' | 'simple') {
    globalSettings.patch({ defaultIconStyle: style })
  }

  function persistOffset() {
    globalSettings.patch({ displayOffsetX: offsetX, displayOffsetY: offsetY })
  }
  function resetOffset() {
    offsetX = 0
    offsetY = 0
    globalSettings.patch({ displayOffsetX: 0, displayOffsetY: 0 })
  }
</script>

<div in:fly={{ y: 8, duration: 320, opacity: 0 }}>
  <ScrollArea>
    <div class="mb-1 text-xl font-bold">会场</div>
    <p class="mb-4 text-sm">配置新建战局时的默认值。</p>
    <div class="space-y-3">
      <SettingCard title="默认图标风格" description="新建战局时使用的单位图标样式。">
        <div class="flex gap-2">
          <Button
            variant={$globalSettings.defaultIconStyle === 'nato' ? 'default' : 'outline'}
            size="sm"
            onclick={() => saveIconStyle('nato')}>北约标准</Button
          >
          <Button
            variant={$globalSettings.defaultIconStyle === 'simple' ? 'default' : 'outline'}
            size="sm"
            onclick={() => saveIconStyle('simple')}>简单图标</Button
          >
        </div>
      </SettingCard>

      <SettingCard
        title="Display 主展示区位置"
        description="调整 Display 窗口中主内容的水平/垂直偏移（px）。也可在 Display 窗口用 Alt+方向键 微调。"
      >
        <div class="flex items-end gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-muted-foreground">X 偏移</label>
            <Input
              type="number"
              bind:value={offsetX}
              oninput={persistOffset}
              class="w-28"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-muted-foreground">Y 偏移</label>
            <Input
              type="number"
              bind:value={offsetY}
              oninput={persistOffset}
              class="w-28"
            />
          </div>
          <Button size="sm" variant="ghost" onclick={resetOffset}>重置</Button>
        </div>
      </SettingCard>
    </div>
  </ScrollArea>
</div>
