import type { Conference } from '$lib/classes/types/conference'

/**
 * 首页与会议卡片共享的会议状态派生工具。
 * 从 Conference JSON 直接计算，不依赖引擎实例，可在列表场景安全使用。
 */

/** 获取当前正在发言的代表团名称（主发言名单优先，其次磋商） */
export function getCurrentSpeakerName(conf: Conference): string | null {
  const nameById = (id: string): string | null =>
    conf.delegations.find((d) => d.id === id)?.name ?? null

  if (conf.activeSpeaker) {
    const entry = conf.speakerLists?.entries?.find((s) => s.id === conf.activeSpeaker!.entryId)
    if (entry) {
      const name = nameById(entry.delegationId)
      if (name) return name
    }
  }

  if (conf.activeCaucus) {
    const idx = conf.activeCaucus.currentSpeakerIndex
    if (idx != null) {
      const entry = conf.activeCaucus.caucusSpeakers?.[idx]
      if (entry) {
        const name = nameById(entry.delegationId)
        if (name) return name
      }
    }
  }

  return null
}

/** 待处理动议数量 */
export function getPendingMotionCount(conf: Conference): number {
  return conf.motions.filter((m) => m.status === 'pending').length
}
