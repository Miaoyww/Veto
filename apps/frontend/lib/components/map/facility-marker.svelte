<script lang="ts">
  import type { Facility, FacilityType } from '$lib/types'
  import { getMilSymbolSVG } from '$lib/utils/milsymbol-utils'

  let { facility, onclick }: { facility: Facility; onclick?: () => void } = $props()

  const TYPE_LABELS: Record<FacilityType, string> = {
    fortress: '要塞',
    trench_network: '堑壕',
    supply_depot: '补给站',
    railway_hub: '铁路枢纽',
    airfield: '机场',
    artillery_position: '炮兵阵地',
    command_post: '指挥部',
    hospital: '野战医院'
  }

  const FACILITY_CODES: Record<FacilityType, string> = {
    fortress: 'GUCFS--',
    trench_network: 'GUCE---',
    supply_depot: 'GUCS---',
    railway_hub: 'GURRH---',
    airfield: 'AA------',
    artillery_position: 'GCFS---',
    command_post: 'GUGPHQ--',
    hospital: 'GUH-----'
  }

  const label = $derived(TYPE_LABELS[facility.type] ?? facility.type)
  const natoCode = $derived(FACILITY_CODES[facility.type] ?? 'GU------')
  const symSvg = $derived(getMilSymbolSVG(natoCode, 'neutral', 20, undefined))
</script>

<button type="button" class="facility-marker" title={label} onclick={() => onclick?.()}>
  <div class="facility-marker-icon">{@html symSvg}</div>
  <span>{facility.name}</span>
</button>
