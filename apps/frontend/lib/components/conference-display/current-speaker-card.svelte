<script lang="ts">
  /**
   * current-speaker-card.svelte
   * ────────────────────────────
   * Display 端当前发言人卡片：状态标题栏 + 代表团全称/简称 + 发言倒计时。
   */
  import { Mic } from '@lucide/svelte'
  import { formatTime } from '$lib/utils'
  import type { Delegation } from '$lib/types-conference'
  import DisplaySectionHeader from './display-section-header.svelte'
  import DelegationNameDisplay from './delegation-name-display.svelte'

  let {
    delegation,
    remainingSec,
    status
  }: {
    delegation: Delegation
    remainingSec: number
    status: 'playing' | 'paused'
  } = $props()

  const isPaused = $derived(status === 'paused')
  const accentColor = $derived(isPaused ? 'text-[#C9A84C]' : 'text-[#5B92E5]')
</script>

<div class="flex flex-col items-center">
  <DisplaySectionHeader
    Icon={Mic}
    label={isPaused ? '计时已暂停' : '正在发言'}
    colorClass={accentColor}
  />

  <DelegationNameDisplay name={delegation.name} shortName={delegation.shortName} />

  <!-- 倒计时 -->
  <div
    class="font-mono text-[120px] font-light tabular-nums leading-none tracking-tight {accentColor}"
  >
    {formatTime(Math.max(0, remainingSec ?? 0))}
  </div>
</div>
