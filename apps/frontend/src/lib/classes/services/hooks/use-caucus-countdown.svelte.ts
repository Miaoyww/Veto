/**
 * use-caucus-countdown.svelte.ts
 * ──────────────────────────────────────────────
 * 自由磋商 / 个人演讲的总倒计时 composable。
 *
 * 管理 activeCaucus 的总时间倒计时、暂停/恢复、到期处理。
 * 仅在 isCaucus && !isModerated 时启用。
 */

import { createTimer, getTimer } from '$lib/classes/services/engine/conference-engine'
import { saveConferencesNow } from '$lib/classes/stores/conference/conference-store'
import type { Committee } from '$lib/classes/domain/committee.svelte'

export interface CaucusCountdownOptions {
  /** 仅自由磋商（或 individual speech）时启用 */
  enabled: boolean
  /** 唯一 timer ID */
  timerId: string
  /** 获取当前 engine 实例 */
  getEngine: () => Committee | null | undefined
  /** 到期回调（endCaucus） */
  onExpire: () => void
  /** 每 tick 额外回调（用于触发增量 Display 同步） */
  onTick?: (data: { remainingSec: number; elapsedSec: number }) => void
  /** periodic save 间隔（累计 elapsed 秒），默认 5s */
  saveIntervalSec?: number
}

/**
 * 自由磋商 / 个人演讲总倒计时。
 * 管理 activeCaucus 的总时间显示、tick 更新、到期处理。
 */
export function useCaucusCountdown(opts: CaucusCountdownOptions) {
  let totalRemainingSec = $state(0)
  let totalElapsedSec = $state(0)
  let totalSec = $state(0)
  let isCaucusPaused = $state(false)
  let lastSavedElapsed = $state(0)
  const saveInterval = opts.saveIntervalSec ?? 5

  $effect(() => {
    if (!opts.enabled) return

    const engine = opts.getEngine()
    const caucus = engine?.activeCaucus
    if (!caucus || caucus.paused) return

    const caucusTotalSec = caucus.totalSec
    const remaining = Math.max(0, caucusTotalSec - caucus.elapsedSec)

    if (remaining > 0) {
      createTimer(opts.timerId, 1000).start(
        caucusTotalSec,
        (data) => {
          totalRemainingSec = data.remainingSec
          totalElapsedSec = data.elapsedSec
          totalSec = data.totalSec

          // 同步 elapsedSec 到引擎
          const eng = opts.getEngine()
          if (eng?.activeCaucus) {
            eng.activeCaucus = { ...eng.activeCaucus, elapsedSec: data.elapsedSec }
          }

          opts.onTick?.(data)

          // Periodic save
          if (data.elapsedSec - lastSavedElapsed >= saveInterval) {
            lastSavedElapsed = data.elapsedSec
            saveConferencesNow()
          }
        },
        () => {
          opts.onExpire()
        },
        caucus.elapsedSec
      )
    }

    return () => {
      getTimer(opts.timerId)?.stop()
    }
  })

  return {
    get totalRemainingSec() { return totalRemainingSec },
    get totalElapsedSec() { return totalElapsedSec },
    get totalSec() { return totalSec },
    get isCaucusPaused() { return isCaucusPaused },
    set isCaucusPaused(v: boolean) { isCaucusPaused = v }
  }
}
