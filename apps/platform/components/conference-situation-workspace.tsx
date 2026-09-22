"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock3, Loader2, Play, RefreshCw, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type Conference,
  type OrganizerSituation,
  activateConference,
  configureConferenceRuntime,
  listOrganizerSituations,
  withdrawOrganizerSituation,
} from "@/lib/conference-client"

interface Props {
  token: string
  conference: Conference
  onConferenceChange: (conference: Conference) => void
  onError: (error: unknown, fallback: string) => void
}

function toLocalInput(timestamp: number): string {
  const date = new Date(timestamp + 8 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 16)
}

function fromChinaInput(value: string): number {
  return Date.parse(`${value}:00+08:00`)
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

export function ConferenceSituationWorkspace({
  token,
  conference,
  onConferenceChange,
  onError,
}: Props) {
  const [useTimeline, setUseTimeline] = useState(conference.timelineMode !== "none")
  const [timelineName, setTimelineName] = useState(conference.timeline?.name ?? "大会时间线")
  const [initialTime, setInitialTime] = useState(
    toLocalInput(conference.timeline?.initialSimTime ?? Date.now())
  )
  const [ratio, setRatio] = useState(String(conference.timeline?.ratio ?? 1))
  const [situations, setSituations] = useState<OrganizerSituation[]>([])
  const [busy, setBusy] = useState<"runtime" | "activate" | "load" | "withdraw">()

  const loadSituations = useCallback(async () => {
    if (conference.lifecycle === "draft") return
    setBusy("load")
    try {
      const result = await listOrganizerSituations(token, conference.id, true)
      setSituations(result.situations)
    } catch (error) {
      onError(error, "加载局势失败")
    } finally {
      setBusy(undefined)
    }
  }, [conference.id, conference.lifecycle, onError, token])

  useEffect(() => {
    void loadSituations()
  }, [loadSituations])

  async function saveRuntime(): Promise<void> {
    const numericRatio = Number(ratio)
    if (useTimeline && (!timelineName.trim() || !Number.isInteger(numericRatio) || numericRatio <= 0)) {
      onError(new Error("时间线名称不能为空，倍率必须是正整数"), "时间线配置无效")
      return
    }
    setBusy("runtime")
    try {
      const next = await configureConferenceRuntime(
        token,
        conference.id,
        conference.version,
        useTimeline
          ? {
              name: timelineName.trim(),
              initialSimTime: fromChinaInput(initialTime),
              ratio: numericRatio,
            }
          : null
      )
      onConferenceChange(next)
    } catch (error) {
      onError(error, "保存时间配置失败")
    } finally {
      setBusy(undefined)
    }
  }

  async function activate(): Promise<void> {
    setBusy("activate")
    try {
      const next = await activateConference(token, conference.id, conference.version)
      onConferenceChange(next)
    } catch (error) {
      onError(error, "激活大会失败")
    } finally {
      setBusy(undefined)
    }
  }

  async function withdraw(item: OrganizerSituation): Promise<void> {
    const reason = window.prompt("请输入撤回原因")?.trim()
    if (!reason) return
    setBusy("withdraw")
    try {
      await withdrawOrganizerSituation(token, conference.id, item.id, reason)
      await loadSituations()
    } catch (error) {
      onError(error, "撤回局势失败")
    } finally {
      setBusy(undefined)
    }
  }

  if (conference.lifecycle === "draft") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 />大会时间</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-2">
              <Button type="button" variant={useTimeline ? "default" : "outline"} onClick={() => setUseTimeline(true)}>使用 Timeline</Button>
              <Button type="button" variant={!useTimeline ? "default" : "outline"} onClick={() => setUseTimeline(false)}>手动填写内容时间</Button>
            </div>
            {useTimeline ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="timeline-name">名称</Label><Input id="timeline-name" value={timelineName} onChange={(event) => setTimelineName(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="timeline-start">起始时间（UTC+8）</Label><Input id="timeline-start" type="datetime-local" value={initialTime} onChange={(event) => setInitialTime(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="timeline-ratio">默认倍率</Label><Input id="timeline-ratio" type="number" min={1} step={1} value={ratio} onChange={(event) => setRatio(event.target.value)} /></div>
              </div>
            ) : (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">新闻和局势的创建者将手动填写 ContentTime。</p>
            )}
            <Button disabled={Boolean(busy)} onClick={() => void saveRuntime()}>{busy === "runtime" && <Loader2 className="animate-spin" />}保存时间配置</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>激活大会</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>激活后不能再新增、删除或修改 Timeline 基础配置。</p>
            <p>默认时区：Asia/Shanghai（UTC+8）</p>
            <Button className="w-full" disabled={conference.timelineMode === "undecided" || Boolean(busy)} onClick={() => void activate()}>
              {busy === "activate" ? <Loader2 className="animate-spin" /> : <Play />}激活大会
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-semibold">局势管理</h2><p className="text-sm text-muted-foreground">组织者只能查看和附原因撤回，不能代发或修改。</p></div>
        <Button variant="outline" disabled={busy === "load"} onClick={() => void loadSituations()}><RefreshCw className={busy === "load" ? "animate-spin" : ""} />刷新</Button>
      </div>
      {situations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无局势记录</CardContent></Card>
      ) : situations.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div><CardTitle className="font-mono text-base">{formatTime(item.contentTime)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.author.committeeName} · {item.author.seatName}{item.author.role ? ` · ${item.author.role}` : ""}</p></div>
              <div className="flex items-center gap-2"><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status === "published" ? "已发布" : "已撤回"}</Badge>{item.status === "published" && <Button variant="destructive" size="sm" disabled={busy === "withdraw"} onClick={() => void withdraw(item)}><RotateCcw />撤回</Button>}</div>
            </div>
          </CardHeader>
          <CardContent><div className="whitespace-pre-wrap text-sm leading-7">{item.content}</div>{item.withdrawalReason && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">撤回原因：{item.withdrawalReason}</p>}</CardContent>
        </Card>
      ))}
    </section>
  )
}
