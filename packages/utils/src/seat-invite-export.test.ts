import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'

import { createSeatInviteText, createSeatInviteWorkbook } from './seat-invite-export'

const rows = [
  { name: '第一席位', shortName: '一席', roleName: '代表', inviteCode: 'ABCD-EFGH-JKLM' },
  { name: '第二席位', inviteCode: 'NPQR-STUV-WXYZ' }
]

describe('seat invite export', () => {
  it('exports readable tab-separated text with the same columns as Excel', () => {
    expect(createSeatInviteText(rows)).toBe(
      '席位名称\t席位简称\t角色\t邀请码\r\n' +
      '第一席位\t一席\t代表\tABCD-EFGH-JKLM\r\n' +
      '第二席位\t\t\tNPQR-STUV-WXYZ\r\n'
    )
  })

  it('writes a workbook that keeps invite codes as text', () => {
    const workbook = XLSX.read(createSeatInviteWorkbook(rows), { type: 'array' })
    expect(workbook.SheetNames).toEqual(['邀请码'])
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['邀请码'], { header: 1 })).toEqual([
      ['席位名称', '席位简称', '角色', '邀请码'],
      ['第一席位', '一席', '代表', 'ABCD-EFGH-JKLM'],
      ['第二席位', '', '', 'NPQR-STUV-WXYZ']
    ])
    expect(workbook.Sheets['邀请码'].D2.t).toBe('s')
  })

  it('returns downloadable XLSX bytes', async () => {
    const data = createSeatInviteWorkbook(rows)
    expect(data).toBeInstanceOf(Uint8Array)
    const blob = new Blob([data])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b])
    expect(bytes.length).toBeGreaterThan(100)
    const downloadedWorkbook = XLSX.read(bytes, { type: 'array' })
    expect(downloadedWorkbook.Sheets['邀请码'].D2.v).toBe('ABCD-EFGH-JKLM')
  })
})
