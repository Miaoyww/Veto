'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  downloadOrganizerFile, listOrganizerFiles, withdrawOrganizerFile, type OrganizerFile,
} from '@/lib/conference-client'

interface Props {
  token: string
  conferenceId: string
  lifecycle: 'draft' | 'active' | 'closed'
  onError: (error: unknown, fallback: string) => void
}

export function ConferenceFilesWorkspace({ token, conferenceId, lifecycle, onError }: Props) {
  const [files, setFiles] = useState<OrganizerFile[]>([])
  const [loading, setLoading] = useState(false)
  const [withdrawId, setWithdrawId] = useState<string>()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (lifecycle === 'draft') return
    setLoading(true)
    try {
      const result = await listOrganizerFiles(token, conferenceId, true)
      setFiles(result.files)
    } catch (error) {
      onError(error, '加载文件失败')
    } finally {
      setLoading(false)
    }
  }, [conferenceId, lifecycle, onError, token])

  useEffect(() => { void load() }, [load])

  async function withdraw(item: OrganizerFile): Promise<void> {
    if (!reason.trim() || busy) return
    setBusy(true)
    try {
      await withdrawOrganizerFile(token, conferenceId, item.id, reason.trim())
      setWithdrawId(undefined)
      setReason('')
      await load()
    } catch (error) {
      onError(error, '撤回文件失败')
    } finally {
      setBusy(false)
    }
  }

  async function download(item: OrganizerFile): Promise<void> {
    try {
      await downloadOrganizerFile(token, conferenceId, item)
    } catch (error) {
      onError(error, '下载文件失败')
    }
  }

  if (lifecycle === 'draft') {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">大会激活后可查看文件记录。</CardContent></Card>
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-semibold">文件管理</h2><p className="text-sm text-muted-foreground">组织者可查看各委员会文件并附原因撤回，不能代发。</p></div>
      <Button variant="outline" disabled={loading} onClick={() => void load()}>
        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}刷新
      </Button>
    </div>
    {files.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">暂无文件记录</CardContent></Card> : files.map((item) =>
      <Card key={item.id}>
        <CardHeader><div className="flex items-start justify-between gap-4">
          <div><CardTitle>{item.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.author.committeeName} / {item.author.seatName} · {new Date(item.createdAt).toLocaleString('zh-CN')}</p></div>
          <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>{item.status === 'published' ? '已发布' : '已撤回'}</Badge>
        </div></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{item.fileType} · {item.fileName} · {(item.size / 1024).toFixed(1)} KiB</p>
          {item.agendaItem && <p className="text-sm text-muted-foreground">议程项：{item.agendaItem}</p>}
          {item.withdrawalReason && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">撤回原因：{item.withdrawalReason}</p>}
          {item.status === 'published' && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => void download(item)}><Download />下载</Button>
            {lifecycle === 'active' && (withdrawId === item.id ? <div className="flex flex-col gap-2 sm:min-w-72">
              <Label htmlFor={`file-withdraw-${item.id}`}>撤回原因</Label>
              <input id={`file-withdraw-${item.id}`} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="rounded-md border border-input bg-transparent p-2 text-sm" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={busy} onClick={() => { setWithdrawId(undefined); setReason('') }}>取消</Button>
                <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => void withdraw(item)}>确认撤回</Button>
              </div>
            </div> : <Button variant="destructive" size="sm" onClick={() => { setWithdrawId(item.id); setReason('') }}>撤回</Button>)}
          </div>}
        </CardContent>
      </Card>
    )}
  </section>
}
