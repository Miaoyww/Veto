/**
 * status-resolver.ts
 * ──────────────────────────────────────────────
 * 单位姿态裁决核心。所有 status 写入都应经过此函数，
 * 避免 tickMapMovement 与 handlePlacedCombat 各自覆盖对方的状态。
 *
 * 优先级（高 → 低）：
 *   destroyed > retreating > defending > attacking > moving > idle
 */

import type { PlacedUnit } from '$lib/types'

export interface StatusInputs {
  hp: number
  isEngaged: boolean
  routeLength: number
  behavior: string
  hasRouted: boolean // 是否已施加 routed 状态效果（组织度归零时触发）
}

/**
 * 根据一组信号计算单位的最终姿态。
 * 只在状态真正变化时返回新值，否则返回 currentStatus 本身。
 */
export function resolveStatus(
  inputs: StatusInputs,
  currentStatus: PlacedUnit['status']
): PlacedUnit['status'] {
  let next: PlacedUnit['status']

  if (inputs.hp <= 0 || currentStatus === 'destroyed') {
    next = 'destroyed'
  } else if (inputs.hasRouted) {
    next = 'retreating'
  } else if (inputs.behavior === 'defensive' || inputs.behavior === 'hold') {
    next = inputs.routeLength > 0 ? 'moving' : 'defending'
  } else if (inputs.isEngaged) {
    next = 'attacking'
  } else if (inputs.routeLength > 0) {
    next = 'moving'
  } else {
    next = 'idle'
  }

  return next
}
