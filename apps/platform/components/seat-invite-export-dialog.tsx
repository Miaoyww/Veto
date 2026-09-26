"use client"

import { useState } from "react"
import type { JSX } from "react"
import { Download } from "lucide-react"
import type { SeatInviteExportRow } from "@vetoexpress/utils/seat-invite-export"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SeatInviteExportDialogProps {
  filenameBase: string
  rows: SeatInviteExportRow[]
  description?: string
  missingCount?: number
  disabled?: boolean
}

function download(data: BlobPart, mimeType: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: mimeType }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function SeatInviteExportDialog({
  filenameBase,
  rows,
  description = "导出已生成的邀请码，包含席位名称、简称和角色。",
  missingCount = 0,
  disabled = false,
}: SeatInviteExportDialogProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)
  const filename =
    (filenameBase.trim() || "席位")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/[. ]+$/g, "") || "席位"

  async function exportFile(format: "text" | "excel"): Promise<void> {
    if (!rows.length || exporting) return
    setError("")
    setExporting(true)
    try {
      const { createSeatInviteText, createSeatInviteWorkbook } =
        await import("@vetoexpress/utils/seat-invite-export")
      if (format === "text") {
        download(
          `\uFEFF${createSeatInviteText(rows)}`,
          "text/plain;charset=utf-8",
          `${filename}-邀请码.txt`
        )
      } else {
        download(
          createSeatInviteWorkbook(rows),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          `${filename}-邀请码.xlsx`
        )
      }
      setOpen(false)
    } catch {
      setError("导出失败，请重试。")
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setError("")
          setOpen(true)
        }}
      >
        <Download aria-hidden="true" />
        导出邀请码
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>导出邀请码</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>可导出 {rows.length} 个席位的邀请码。</p>
            {missingCount > 0 ? (
              <p className="text-muted-foreground">
                {missingCount}{" "}
                个席位尚未生成邀请码，将不会出现在文件中。请先保存以生成新席位的邀请码。
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!rows.length || exporting}
              onClick={() => void exportFile("text")}
            >
              导出文本
            </Button>
            <Button
              type="button"
              disabled={!rows.length || exporting}
              onClick={() => void exportFile("excel")}
            >
              导出 Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
