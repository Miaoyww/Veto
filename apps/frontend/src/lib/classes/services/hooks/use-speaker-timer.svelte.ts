/**
 * use-speaker-timer.svelte.ts
 * ──────────────────────────────────────────────
 * 发言计时器共享状态 + per-speaker 计时 composable。
 *
 * 从 speaker-queue.svelte 中抽离，管理逐人发言计时（一般性辩论 & 有主持磋商），
 * 包括定时器生命周期、periodic save、暂停/恢复状态同步。
 */

import { createTimer, getTimer } from '$lib/classes/services/engine/conference-engine'
import { saveConferencesNow } from '$lib/classes/stores/conference/conference-store'
import type { ConferenceEngine } from '$lib/classes/services/engine/ConferenceEngine.svelte'

/** 发言计时器共享运行时状态（per-speaker timer 与 paused-state-restore 共用） */
export class SpeakerTimerState {
  displayRemaining: number = $state(0)
  displayElapsed: number = $state(0)
  displayTotal: number = $state(0)
  isPaused: boolean = $state(false)
}

export interface PerSpeakerTimerOptions {
  /** 是否启用（caucus 模式下 per-speaker timer 仅在有主持磋商时启用） */
  enabled: boolean
  /** 唯一 timer ID，避免与其他 composable 冲突 */
  timerId: string
  /** tick 间隔（ms），一般性辩论 100ms，有主持磋商 1000ms */
  tickMs: number
  /** 获取当前 engine 实例（通过 getter 避免闭包过期） */
  getEngine: () => ConferenceEngine | null | undefined
  /** 计时器自然到期回调（一般性辩论: endSpeaker, 磋商: advanceCaucusSpeaker） */
  onExpire: () => void
  /** 每 tick 额外回调（用于触发增量 Display 同步） */
  onTick?: (data: { remainingSec: number; elapsedSec: number }) => void
  /** periodic save 间隔（累计 elapsed 秒），默认 5s */
  saveIntervalSec?: number
}

/**
 * 逐人发言计时器。
 * 管理 activeSpeaker 的倒计时显示、tick 更新、到期处理、periodic save。
 * 调用方通过 sharedState 读取 display 值，传递给 ActiveSpeakerCard。
 */
export function usePerSpeakerTimer(
  state: SpeakerTimerState,
  opts: PerSpeakerTimerOptions
): void {
  let lastSavedElapsed = $state(0)
  const saveInterval = opts.saveIntervalSec ?? 5

  $effect(() => {
    if (!opts.enabled) return

    const engine = opts.getEngine()
    const speaker = engine?.activeSpeaker
    if (!speaker) return
    if (speaker.paused) return

    const totalSec = speaker.totalSec
    state.displayTotal = totalSec
    state.displayElapsed = speaker.elapsedSec
    const remaining = Math.max(0, totalSec - speaker.elapsedSec)
    state.displayRemaining = remaining

    if (remaining > 0) {
      createTimer(opts.timerId, opts.tickMs).start(
        totalSec,
        (data) => {
          state.displayRemaining = data.remainingSec
          state.displayElapsed = data.elapsedSec

          // 同步 elapsedSec 到引擎
          const eng = opts.getEngine()
          if (eng?.activeSpeaker) {
            eng.activeSpeaker = { ...eng.activeSpeaker, elapsedSec: data.elapsedSec }
          }

          opts.onTick?.(data)

          // Periodic save：每 saveInterval 秒持久化一次
          if (data.elapsedSec - lastSavedElapsed >= saveInterval) {
            lastSavedElapsed = data.elapsedSec
            saveConferencesNow()
          }
        },
        () => {
          state.isPaused = false
          opts.onExpire()
        },
        speaker.elapsedSec
      )
    } else {
      // 发言时间已过期（脏数据），立刻清理
      state.isPaused = false
      opts.onExpire()
    }

    return () => {
      getTimer(opts.timerId)?.stop()
    }
  })
}
