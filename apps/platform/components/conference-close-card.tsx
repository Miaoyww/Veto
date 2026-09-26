"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  closeConference,
  getConference,
  listOrganizerFiles,
  type Conference,
} from "@/lib/conference-client"

interface Props {
  token: string
  conferenceId: string
  lifecycle: "draft" | "active" | "closed"
  version: number
  onConferenceChange: (conference: Conference) => void
  onError: (error: unknown, fallback: string) => void
}

export function ConferenceCloseCard({
  token,
  conferenceId,
  lifecycle,
  version,
  onConferenceChange,
  onError,
}: Props) {
  const [pendingCount, setPendingCount] = useState(0)
  const [closing, setClosing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadPendingCount = useCallback(async () => {
    if (lifecycle !== "closed") return
    try {
      const { files } = await listOrganizerFiles(token, conferenceId)
      setPendingCount(
        files.filter((item) => item.status === "submitted").length
      )
    } catch {
      setPendingCount(0)
    }
  }, [conferenceId, lifecycle, token])

  useEffect(() => {
    void loadPendingCount()
  }, [loadPendingCount])

  async function close(): Promise<void> {
    if (closing) return
    setClosing(true)
    try {
      onConferenceChange(await closeConference(token, conferenceId, version))
    } catch (error) {
      onError(error, "结束大会或清理待审文件失败")
      try {
        onConferenceChange(
          await getConference(token, conferenceId, { refresh: true })
        )
      } catch {
        /* The original error remains visible. */
      }
    } finally {
      setClosing(false)
    }
  }

  if (lifecycle === "draft") return null
  if (lifecycle === "closed" && pendingCount === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">结束大会</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          结束后将停止大会操作，仍可查看记录。
        </p>
      </CardHeader>
      <CardContent>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger
            render={
              <Button type="button" variant="destructive" className="w-full" />
            }
          >
            {closing && <Loader2 className="animate-spin" aria-hidden="true" />}
            {lifecycle === "active" ? "结束大会" : "重试清理"}
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert
                  className="size-5 text-destructive"
                  aria-hidden="true"
                />
                确认{lifecycle === "active" ? "结束大会" : "重试清理"}？
              </DialogTitle>
              <DialogDescription>
                待审核文件将立即清理。已发布文件仅保留至设置的会议结束时间后 3
                天（72
                小时），请在文件页查看截止时间并提前下载到本地。未设置结束时间时暂无自动清理期限。手动结束不会重设该期限。
                <br />
                此操作无法撤回。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={closing}
                onClick={() => setConfirmOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={closing}
                onClick={() => {
                  setConfirmOpen(false)
                  void close()
                }}
              >
                {closing && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                确认结束
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
