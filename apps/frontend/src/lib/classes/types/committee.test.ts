import { describe, expect, it } from 'vitest'
import type { Committee, MajorityThresholds } from './committee'
import { MOTION_LABELS, POINT_LABELS } from './committee'
import type { ConferenceDisplayData } from './committee-display'
import type { Conference } from './conference'

const committee: Committee = {} as Committee
const thresholds: MajorityThresholds = {
  presentCount: 0,
  votingCount: 0,
  totalCount: 0,
  simpleMajorityThreshold: 1,
  twoThirdsThreshold: 0
}
const display: ConferenceDisplayData = {} as ConferenceDisplayData
const conference: Conference = { committees: [committee] } as Conference

describe('committee type boundary', () => {
  it('exposes committee, display, and conference contracts together', () => {
    expect(conference.committees).toEqual([committee])
    expect(thresholds.totalCount).toBe(0)
    expect(display).toBeDefined()
    expect(MOTION_LABELS.open_speakers_list).toBe('开启主发言名单')
    expect(POINT_LABELS.point_of_order).toBe('程序性问题')
  })
})
