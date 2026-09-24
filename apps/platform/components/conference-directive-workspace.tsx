"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type OrganizerDirective,
  listOrganizerDirectives,
  releaseOrganizerDirective,
} from "@/lib/conference-client"

interface Props {
  token: string
  conferenceId: string
  lifecycle: "draft" | "active" | "closed"
  onError: (error: unknown, fallback: string) => void
}

const statusLabel: Record<OrganizerDirective["status"], string> = {
  submitted: "待处理",
  processing: "处理中",
  approved: "已批准",
  rejected: "已驳回",
  cancelled: "已取消",
}

export function ConferenceDirectiveWorkspace({
  token,
  conferenceId,
  lifecycle,
  onError,
}: Props) {
  const [directives, setDirectives] = useState<OrganizerDirective[]>([])
  const [loading, setLoading] = useState(false)
  const [releasingId, setReleasingId] = useState<string>()

  const load = useCallback(async () => {
    if (lifecycle === "draft") return
    setLoading(true)
    try {
      const result = await listOrganizerDirectives(token, conferenceId, true)
      setDirectives(result.directives)
    } catch (error) {
      onError(error, "加载指令失败")
    } finally {
      setLoading(false)
    }
  }, [conferenceId, lifecycle, onError, token])

  useEffect(() => {
    void load()
  }, [load])

  async function release(item: OrganizerDirective): Promise<void> {
    const reason = window.prompt("请输入释放认领的原因")?.trim()
    if (!reason) return
    setReleasingId(item.id)
    try {
      await releaseOrganizerDirective(token, conferenceId, item.id, reason)
      await load()
    } catch (error) {
      onError(error, "释放认领失败")
    } finally {
      setReleasingId(undefined)
    }
  }

  if (lifecycle === "draft") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          大会激活后才能提交和处理指令。
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">指令管理</h2>
          <p className="text-sm text-muted-foreground">
            组织者可查看全部指令并附原因释放异常认领；不能代发、批准或驳回。
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
      {directives.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无指令记录
          </CardContent>
        </Card>
      ) : (
        directives.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {item.author.committeeName} · {item.author.seatName} →{" "}
                    {item.targetCommitteeName} · 第 {item.revision} 版
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      item.status === "processing" ? "default" : "secondary"
                    }
                  >
                    {statusLabel[item.status]}
                  </Badge>
                  {lifecycle === "active" && item.status === "processing" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(releasingId)}
                      onClick={() => void release(item)}
                    >
                      {releasingId === item.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RotateCcw />
                      )}
                      释放认领
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="leading-7 whitespace-pre-wrap">
                {item.content}
              </div>
              {item.claimedBySeatId && (
                <p className="text-muted-foreground">
                  认领席位：{item.claimedBySeatId}
                </p>
              )}
              {item.processingNote && (
                <p className="rounded-lg bg-muted p-3">
                  处理说明：{item.processingNote}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  )
}
