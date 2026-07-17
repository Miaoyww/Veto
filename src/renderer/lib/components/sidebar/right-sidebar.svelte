<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui/card'
  import { coords } from '$lib/stores/battle/map-store'
  import UnitInfoPanel from '$lib/components/panels/unit-info-panel.svelte'
  import * as Accordion from '$lib/components/ui/accordion'

  let lat = $derived($coords.lat.toFixed(5))
  let lng = $derived($coords.lng.toFixed(5))
</script>

<div class="right-sidebar">
  <Card class="flex h-full flex-col overflow-hidden">
    <CardContent class="flex-1 overflow-y-auto p-3">
      <Accordion.Root type="single" value="unit-status">
        <Accordion.Item value="unit-status">
          <Accordion.Trigger class="border border-border px-3 py-2 text-sm font-medium">
            单位状态
          </Accordion.Trigger>
          <Accordion.Content class="border border-border rounded-lg p-0 pt-4">
            <UnitInfoPanel />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </CardContent>
    <div class="border-t border-border px-3 py-2 text-center">
      <span class="font-mono text-xs text-muted-foreground">
        {lat}, {lng}
      </span>
    </div>
  </Card>
</div>

<style>
  .right-sidebar {
    position: fixed;
    top: 3.75rem;
    right: 0.5rem;
    bottom: 4rem;
    width: 360px;
    z-index: 30;
  }
</style>
