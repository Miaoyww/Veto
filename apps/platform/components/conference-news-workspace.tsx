"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  type OrganizerNews,
  listOrganizerNews,
  withdrawOrganizerNews,
} from "@/lib/conference-client"

interface Props {
  token: string
  conferenceId: string
  lifecycle: "draft" | "active" | "closed"
  onError: (error: unknown, fallback: string) => void
}

const statusLabel: Record<OrganizerNews["status"], string> = {
  submitted: "待审核",
  rejected: "已驳回",
  published: "已发布",
  withdrawn: "已撤回",
}

export function ConferenceNewsWorkspace({
  token,
  conferenceId,
  lifecycle,
  onError,
}: Props) {
  const [news, setNews] = useState<OrganizerNews[]>([])
  const [timezone, setTimezone] = useState("Asia/Shanghai")
  const [loading, setLoading] = useState(false)
  const [withdrawId, setWithdrawId] = useState<string>()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (lifecycle === "draft") return
    setLoading(true)
    try {
      const result = await listOrganizerNews(token, conferenceId, true)
      setNews(result.news)
      setTimezone(result.timezone)
    } catch (error) {
      onError(error, "加载新闻失败")
    } finally {
      setLoading(false)
    }
  }, [conferenceId, lifecycle, onError, token])

  useEffect(() => {
    void load()
  }, [load])

  async function withdraw(item: OrganizerNews): Promise<void> {
    if (!reason.trim() || busy) return
    setBusy(true)
    try {
      await withdrawOrganizerNews(token, conferenceId, item.id, reason.trim())
      setWithdrawId(undefined)
      setReason("")
      await load()
    } catch (error) {
      onError(error, "撤回新闻失败")
    } finally {
      setBusy(false)
    }
  }

  function formatTime(value: number): string {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value)
  }

  if (lifecycle === "draft") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          大会激活后可查看新闻记录。
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">新闻管理</h2>
          <p className="text-sm text-muted-foreground">
            组织者可以查看全部稿件与附原因撤回，不能代发或审核。
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}刷新
        </Button>
      </div>
      {news.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            暂无新闻记录
          </CardContent>
        </Card>
      ) : (
        news.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.source} · {formatTime(item.contentTime)} ·{" "}
                    {item.author.committeeName} / {item.author.seatName}
                  </p>
                </div>
                <Badge
                  variant={
                    item.status === "published" ? "default" : "secondary"
                  }
                >
                  {statusLabel[item.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {item.content}
              </p>
              {item.reviewNote && (
                <p className="rounded-md bg-muted p-3 text-sm">
                  审核说明：{item.reviewNote}
                </p>
              )}
              {item.withdrawalReason && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  撤回原因：{item.withdrawalReason}
                </p>
              )}
              {lifecycle === "active" && item.status === "published" && (
                <div className="border-t pt-3">
                  {withdrawId === item.id ? (
                    <div className="space-y-2">
                      <Label htmlFor={`news-withdraw-${item.id}`}>
                        撤回原因
                      </Label>
                      <textarea
                        id={`news-withdraw-${item.id}`}
                        value={reason}
                        maxLength={500}
                        rows={3}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full rounded-md border border-input bg-transparent p-3 text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
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
                          disabled={busy || !reason.trim()}
                          onClick={() => void withdraw(item)}
                        >
                          确认撤回
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  )
}
