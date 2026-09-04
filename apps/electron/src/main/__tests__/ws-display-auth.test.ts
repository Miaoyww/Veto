import { beforeEach, describe, expect, it, vi } from 'vitest'

const { storeData, send } = vi.hoisted(() => ({
  storeData: new Map<string, unknown>(),
  send: vi.fn()
}))

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [{ webContents: { send } }] }
}))
vi.mock('../logger')
vi.mock('../lan-service', () => ({ getAdvertisedConference: () => null }))
vi.mock('../data/store', () => ({
  loadStore: vi.fn((domain: string) => storeData.get(domain) ?? null),
  saveStore: vi.fn((domain: string, data: unknown) => storeData.set(domain, data))
}))

import { defaultAuthResolver } from '../ws-display'

function conference() {
  return {
    id: 'conf-1',
    users: [],
    seatAccesses: [{ seatId: 'seat-1', inviteCode: 'ABCD-EFGH-JKLM' }],
    seatGroups: [{ id: 'group-1', defaultCapabilities: ['view_conference'] }],
    committees: [{
      seats: [{
        id: 'seat-1',
        name: '外交部长',
        seatGroupId: 'group-1',
        role: '外交部长',
        capabilityOverrides: { submit_directive: true }
      }]
    }]
  }
}

describe('seat authentication', () => {
  beforeEach(() => {
    storeData.clear()
    send.mockClear()
  })

  it('claims an unassigned seat and returns only the safe session projection', async () => {
    storeData.set('conferences', [conference()])

    const result = await defaultAuthResolver('ABCD-EFGH-JKLM', '张三')

    expect(result?.valid).toBe(true)
    expect(result?.session).toMatchObject({
      conferenceId: 'conf-1',
      seat: { id: 'seat-1', name: '外交部长' },
      seatGroupId: 'group-1',
      capabilities: ['view_conference', 'submit_directive'],
      user: { name: '张三', hasPassword: false }
    })
    expect(result?.session).not.toHaveProperty('inviteCode')
    expect(result?.session?.seat).not.toHaveProperty('capabilityOverrides')
    expect(send).toHaveBeenCalledWith('veto:event', expect.objectContaining({
      event: 'conference:user-claimed'
    }))
  })

  it('requires the User password after a password-protected first claim', async () => {
    storeData.set('conferences', [conference()])
    const claimed = await defaultAuthResolver('ABCD-EFGH-JKLM', '张三', 'secret')
    expect(claimed?.valid).toBe(true)
    expect(claimed?.session?.user.hasPassword).toBe(true)

    const rejected = await defaultAuthResolver('ABCD-EFGH-JKLM', 'ignored', 'wrong')
    expect(rejected).toEqual({ valid: false, error: '密码错误' })

    const accepted = await defaultAuthResolver('ABCD-EFGH-JKLM', 'ignored', 'secret')
    expect(accepted?.valid).toBe(true)
  })
})
