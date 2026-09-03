<script lang="ts">
  import type { Facility, FacilityType } from '$lib/classes/types/battle'

  let { facility }: { facility: Facility } = $props()

  const TYPE_LABELS: Record<FacilityType, string> = {
    fortress: '要塞',
    trench_network: '堑壕网络',
    supply_depot: '补给站',
    railway_hub: '铁路枢纽',
    airfield: '机场',
    artillery_position: '炮兵阵地',
    command_post: '指挥部',
    hospital: '野战医院'
  }

  const typeLabel = $derived(TYPE_LABELS[facility.type] ?? facility.type)
  const properties = $derived(Object.entries(facility.properties ?? {}))
</script>

<div class="facility-popup min-w-[160px] max-w-[220px] text-xs">
  <p class="font-semibold text-stone-800 dark:text-stone-200">{facility.name}</p>
  <p class="mt-0.5 text-[11px] text-muted-foreground">{typeLabel}</p>

  {#if properties.length > 0}
    <div class="mt-2 border-t border-stone-200 pt-1.5 dark:border-stone-700">
      {#each properties as [key, value]}
        <div class="flex justify-between gap-3 text-[11px]">
          <span class="text-muted-foreground">{key}</span>
          <span class="font-medium text-stone-700 dark:text-stone-300">
            {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : String(value)}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  {#if facility.maxCapacity != null}
    <div class="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
      <span>容量: {facility.maxCapacity}</span>
    </div>
  {/if}
</div>

<style>
  .facility-popup {
    font-family: inherit;
  }
</style>
