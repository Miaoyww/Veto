"use client"

import { useRef, useState } from "react"
import type { ChangeEvent, JSX } from "react"
import { FileSpreadsheet, FileText, Upload } from "lucide-react"
import {
  SeatImportError,
  parseSeatText,
  readSeatWorkbook,
  type ImportedSeat,
  type SeatWorkbook,
} from "@vetoexpress/utils/seat-import"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface SeatImportDialogProps {
  disabled?: boolean
  roleLabel: (roleName: string) => string
  onImport: (seats: ImportedSeat[]) => void
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof SeatImportError))
    return error instanceof Error ? error.message : fallback
  if (error.code === "empty_workbook") return "文件中没有可读取的 Sheet"
  if (error.code === "sheet_not_found") return "找不到所选 Sheet"
  if (error.code === "no_valid_rows") return fallback
  return fallback
}

export function SeatImportDialog({
  disabled = false,
  roleLabel,
  onImport,
}: SeatImportDialogProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [workbook, setWorkbook] = useState<SeatWorkbook | null>(null)
  const [selectedSheet, setSelectedSheet] = useState("")
  const [rows, setRows] = useState<ImportedSeat[]>([])

  function clear(): void {
    setText("")
    setError("")
    setWorkbook(null)
    setSelectedSheet("")
    setRows([])
  }

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen)
    if (!nextOpen) clear()
  }

  function selectSheet(reader: SeatWorkbook, sheetName: string): void {
    setSelectedSheet(sheetName)
    try {
      setRows(reader.importSheet(sheetName, "conference"))
      setError("")
    } catch (cause) {
      setRows([])
      setError(errorMessage(cause, "Sheet 读取失败"))
    }
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    try {
      const reader = readSeatWorkbook(await file.arrayBuffer())
      setWorkbook(reader)
      selectSheet(reader, reader.sheetNames[0])
    } catch (cause) {
      setWorkbook(null)
      setRows([])
      setError(errorMessage(cause, "Excel 文件读取失败"))
    }
  }

  function readText(): void {
    try {
      setRows(parseSeatText(text, "conference"))
      setWorkbook(null)
      setSelectedSheet("")
      setError("")
    } catch (cause) {
      setRows([])
      setError(errorMessage(cause, "文本读取失败"))
    }
  }

  function confirmImport(): void {
    if (rows.length === 0) return
    onImport(rows)
    setOpen(false)
    clear()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
          />
        }
      >
        <Upload aria-hidden="true" />
        导入席位
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>导入席位</DialogTitle>
          <DialogDescription>
            Excel 第一行作为表头；文本每行一个席位，格式为“名称, 简称, 角色”。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => void handleFile(event)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet aria-hidden="true" />
            选择 Excel 文件
          </Button>

          {workbook ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              工作表
              <select
                className="h-9 rounded-lg border border-input bg-background px-2.5 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={selectedSheet}
                onChange={(event) => selectSheet(workbook, event.target.value)}
              >
                {workbook.sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="seat-import-text" className="text-sm font-medium">
              或粘贴文本
            </label>
            <textarea
              id="seat-import-text"
              className="min-h-28 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={text}
              placeholder="中国, CHN, 常规代表"
              onChange={(event) => setText(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!text.trim()}
              onClick={readText}
            >
              <FileText aria-hidden="true" />
              读取文本
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {rows.length > 0 ? (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">席位名称</th>
                    <th className="px-3 py-2 font-medium">简称</th>
                    <th className="px-3 py-2 font-medium">输入角色</th>
                    <th className="px-3 py-2 font-medium">匹配角色</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.name}-${index}`} className="border-t">
                      <td className="px-3 py-2">{row.name || "（空）"}</td>
                      <td className="px-3 py-2">{row.shortName || "—"}</td>
                      <td className="px-3 py-2">
                        {row.roleName || "自动匹配"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {roleLabel(row.roleName ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            取消
          </DialogClose>
          <Button
            type="button"
            disabled={rows.length === 0}
            onClick={confirmImport}
          >
            导入 {rows.length || ""} 个席位
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
