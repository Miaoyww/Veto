/**
 * display-window.ts
 * ──────────────────────────────────────────────
 * Display 窗口自身窗口管理的 Electron 抽象。
 *
 * Display 路由对主进程窗口能力（全屏切换、窗口事件推送）的访问全部收敛到这里，
 * 页面组件不直接接触 window.veto。非 Electron 环境下安全降级为 no-op。
 */

import { isElectron } from '$lib/classes/utils/runtime'

/** 主进程推送给 Display 窗口的更新载荷（当前仅全屏状态变更） */
export interface DisplayWindowUpdate {
  type?: string
  isFullScreen?: boolean
}

/** 切换 Display 窗口全屏 */
export function toggleDisplayFullscreen(): void {
  if (!isElectron()) return
  void window.veto?.conference?.toggleFullscreen?.()
}

/** 订阅主进程对 Display 窗口的更新（全屏状态变更等），返回退订函数 */
export function onDisplayWindowUpdate(
  callback: (update: DisplayWindowUpdate) => void
): () => void {
  if (!isElectron()) return () => {}
  return (
    window.veto?.conference?.onDisplayUpdate?.((data: unknown) =>
      callback(data as DisplayWindowUpdate)
    ) ?? (() => {})
  )
}
