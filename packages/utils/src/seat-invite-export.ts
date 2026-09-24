import * as XLSX from 'xlsx'

export interface SeatInviteExportRow {
  name: string
  shortName?: string
  roleName?: string
  inviteCode: string
}

const HEADERS = ['席位名称', '席位简称', '角色', '邀请码']

function cells(rows: readonly SeatInviteExportRow[]): string[][] {
  return [HEADERS, ...rows.map((row) => [
    row.name,
    row.shortName ?? '',
    row.roleName ?? '',
    row.inviteCode
  ])]
}

function textCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim()
}

export function createSeatInviteText(rows: readonly SeatInviteExportRow[]): string {
  return cells(rows).map((row) => row.map(textCell).join('\t')).join('\r\n') + '\r\n'
}

export function createSeatInviteWorkbook(rows: readonly SeatInviteExportRow[]): Uint8Array<ArrayBuffer> {
  const worksheet = XLSX.utils.aoa_to_sheet(cells(rows))
  worksheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '邀请码')
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Uint8Array(data)
}
