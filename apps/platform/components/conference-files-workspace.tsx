"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  downloadOrganizerFile,
  listOrganizerFiles,
  listOrganizerFileTypes,
  withdrawOrganizerFile,
  type OrganizerFile,
} from "@/lib/conference-client"

interface Props {
  token: string
  conferenceId: string
  lifecycle: "draft" | "active" | "closed"
  onError: (error: unknown, fallback: string) => void
}

export function ConferenceFilesWorkspace({
  token,
  conferenceId,
  lifecycle,
  onError,
}: Props) {
  const [files, setFiles] = useState<OrganizerFile[]>([])
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawId, setWithdrawId] = useState<string>()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [sortKey, setSortKey] = useState<
    "fileType" | "createdAt" | "author" | "fileName"
  >("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const loadSequence = useRef(0)

  const statusLabel: Record<OrganizerFile["status"], string> = {
    submitted: "待审核",
    published: "已发布",
    rejected: "已打回",
    cancelled: "已取消",
    withdrawn: "已撤回",
  }

  function scopeLabel(item: OrganizerFile): string {
    const scope =
      item.status === "submitted" ? item.requestedVisibility : item.visibility
    return `${item.status === "submitted" ? "申请：" : ""}${scope === "conference" ? "全大会" : "本委员会"}`
  }

  const sortedFiles = [...files].sort((a, b) => {
    const compare =
      sortKey === "createdAt"
        ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
        : sortKey === "author"
          ? `${a.author.committeeName} / ${a.author.seatName}`.localeCompare(
              `${b.author.committeeName} / ${b.author.seatName}`,
              "zh-CN",
              { numeric: true }
            )
          : a[sortKey].localeCompare(b[sortKey], "zh-CN", { numeric: true })
    return (
      (sortDirection === "asc" ? compare : -compare) || a.id.localeCompare(b.id)
    )
  })

  function sortBy(key: typeof sortKey): void {
    if (sortKey === key)
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDirection(key === "createdAt" ? "desc" : "asc")
    }
  }

  const load = useCallback(async () => {
    if (lifecycle === "draft") return
    const sequence = ++loadSequence.current
    setLoading(true)
    try {
      const [result, types] = await Promise.all([
        listOrganizerFiles(
          token,
          conferenceId,
          true,
          selectedType || undefined
        ),
        listOrganizerFileTypes(token, conferenceId, true),
      ])
      if (sequence !== loadSequence.current) return
      setFiles(result.files)
      setFileTypes(types.fileTypes)
    } catch (error) {
      if (sequence === loadSequence.current) onError(error, "加载文件失败")
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [conferenceId, lifecycle, onError, selectedType, token])

  useEffect(() => {
    void load()
  }, [load])

  async function withdraw(item: OrganizerFile): Promise<void> {
    if (!reason.trim() || busy) return
    setBusy(true)
    try {
      await withdrawOrganizerFile(token, conferenceId, item.id, reason.trim())
      setWithdrawId(undefined)
      setReason("")
      await load()
    } catch (error) {
      onError(error, "撤回文件失败")
    } finally {
      setBusy(false)
    }
  }

  async function download(item: OrganizerFile): Promise<void> {
    try {
      await downloadOrganizerFile(token, conferenceId, item)
    } catch (error) {
      onError(error, "下载文件失败")
    }
  }

  if (lifecycle === "draft") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          大会激活后可查看文件记录。
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">文件管理</h2>
          <p className="text-sm text-muted-foreground">
            查看各委员会的提交、审核结果和发布范围；组织者可撤回已发布文件。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="organizer-file-type"
            className="text-sm text-muted-foreground"
          >
            文件类型
          </label>
          <select
            id="organizer-file-type"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">全部类型</option>
            {fileTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}刷新
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-3 font-medium">标题</th>
              {(
                [
                  { key: "fileType", label: "类型" },
                  { key: "createdAt", label: "时间" },
                  { key: "author", label: "上传者" },
                  { key: "fileName", label: "文件名" },
                ] as const
              ).map((column) => (
                <th
                  key={column.key}
                  aria-sort={
                    sortKey === column.key
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-3 py-3 font-medium"
                >
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => sortBy(column.key)}
                    aria-label={`按${column.label}排序`}
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 font-medium">可视范围</th>
              <th className="px-3 py-3 font-medium">状态</th>
              <th className="px-3 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  {loading ? "正在加载文件…" : "暂无文件记录"}
                </td>
              </tr>
            ) : (
              sortedFiles.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="min-w-40 px-3 py-3 align-middle font-medium">
                    {item.title}
                    {item.replacesFileId && (
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        重新提交：{item.replacesFileId}
                      </p>
                    )}
                    {item.reviewNote && (
                      <p
                        className={`mt-1 max-w-56 text-xs font-normal ${item.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        审核说明：{item.reviewNote}
                      </p>
                    )}
                    {item.withdrawalReason && (
                      <p className="mt-1 max-w-56 text-xs font-normal text-destructive">
                        撤回原因：{item.withdrawalReason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">{item.fileType}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.author.committeeName} / {item.author.seatName}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.fileName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(item.size / 1024).toFixed(1)} KiB
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {scopeLabel(item)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        item.status === "published" ? "default" : "secondary"
                      }
                    >
                      {statusLabel[item.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.status === "published" && (
                      <>
                        <div className="flex justify-end gap-2">
                          {lifecycle === "active" && withdrawId !== item.id && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setWithdrawId(item.id)
                                setReason("")
                              }}
                            >
                              撤回
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void download(item)}
                          >
                            <Download />
                            下载
                          </Button>
                        </div>
                        {lifecycle === "active" && withdrawId === item.id && (
                          <div className="mt-2 flex min-w-56 flex-col gap-2 text-left">
                            <Label htmlFor={`file-withdraw-${item.id}`}>
                              撤回原因
                            </Label>
                            <input
                              id={`file-withdraw-${item.id}`}
                              value={reason}
                              maxLength={500}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                              className="rounded-md border border-input bg-transparent p-2 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  setWithdrawId(undefined)
                                  setReason("")
                                }}
                              >
                                取消
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={busy || !reason.trim()}
                                onClick={() => void withdraw(item)}
                              >
                                确认撤回
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
