/**
 * use-paused-state-restore.svelte.ts
 * ──────────────────────────────────────────────
 * 组件挂载时从 engine 恢复暂停态的 display 值。
 *
 * 场景：浏览器刷新 / 重新打开会议后，engine 中 activeSpeaker.paused === true，
 * timer 不会在 per-speaker effect 中启动，需要此 composable 恢复 UI 显示状态。
 */

import type { ConferenceEngine } from '$lib/engine/ConferenceEngine.svelte'
import { SpeakerTimerState } from '$lib/hooks/use-speaker-timer.svelte'

export interface PausedStateRestoreOptions {
  /** 与 per-speaker timer 相同的 enabled 条件 */
  enabled: boolean
  /** 获取当前 engine 实例 */
  getEngine: () => ConferenceEngine | null | undefined
  /** caucus 模式下排除自由磋商 */
  isExcludedCaucus?: boolean
}

/**
 * 恢复暂停态的 display 值。
 * 当 engine.activeSpeaker 存在且 paused === true 时，将 engine 中的
 * totalSec/elapsedSec 同步到 shared state，供 ActiveSpeakerCard 渲染。
 */
export function usePausedStateRestore(
  state: SpeakerTimerState,
  opts: PausedStateRestoreOptions
): void {
  $effect(() => {
    if (!opts.enabled) return
    if (opts.isExcludedCaucus) return

    const speaker = opts.getEngine()?.activeSpeaker
    if (!speaker || !speaker.paused) return

    const totalSec = speaker.totalSec
    const remaining = Math.max(0, totalSec - speaker.elapsedSec)

    state.displayRemaining = remaining
    state.displayElapsed = speaker.elapsedSec
    state.displayTotal = totalSec
    state.isPaused = true
  })
}
