import * as XLSX from 'xlsx'

export interface SeatInviteExportRow {
  committeeName?: string
  name: string
  shortName?: string
  roleName?: string
  inviteCode: string
}

const BASE_HEADERS = ['席位名称', '席位简称', '角色', '邀请码']
const BASE_COL_WIDTHS = [{ wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 }]

function hasCommitteeColumn(rows: readonly SeatInviteExportRow[]): boolean {
  return rows.some((row) => row.committeeName)
}

function cells(rows: readonly SeatInviteExportRow[]): string[][] {
  const withCommittee = hasCommitteeColumn(rows)
  return [
    withCommittee ? ['委员会', ...BASE_HEADERS] : BASE_HEADERS,
    ...rows.map((row) => {
      const base = [
        row.name,
        row.shortName ?? '',
        row.roleName ?? '',
        row.inviteCode
      ]
      return withCommittee ? [row.committeeName ?? '', ...base] : base
    })
  ]
}

function textCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim()
}

export function createSeatInviteText(rows: readonly SeatInviteExportRow[]): string {
  return cells(rows).map((row) => row.map(textCell).join('\t')).join('\r\n') + '\r\n'
}

export function createSeatInviteWorkbook(rows: readonly SeatInviteExportRow[]): Uint8Array<ArrayBuffer> {
  const worksheet = XLSX.utils.aoa_to_sheet(cells(rows))
  worksheet['!cols'] = hasCommitteeColumn(rows)
    ? [{ wch: 24 }, ...BASE_COL_WIDTHS]
    : BASE_COL_WIDTHS
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '邀请码')
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Uint8Array(data)
}
