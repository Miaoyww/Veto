"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

import {
  ConferenceStructureEditor,
  textareaClassName,
} from "@/components/conference-structure-editor"
import { PlatformLoading, PlatformShell } from "@/components/platform-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ConferenceApiError,
  type Conference,
  type ConferenceStructure,
  deleteConference,
  getConference,
  replaceConferenceStructure,
  updateConferenceMetadata,
} from "@/lib/conference-client"
import { usePlatformAuth } from "@/lib/use-platform-auth"

type SavingSection = "metadata" | "structure" | "delete"

export default function ConferenceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { token, isReady, signOut } = usePlatformAuth()
  const [conference, setConference] = useState<Conference>()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [organizer, setOrganizer] = useState("")
  const [structure, setStructure] = useState<ConferenceStructure>({
    roleTemplates: [],
    committees: [],
  })
  const [saving, setSaving] = useState<SavingSection>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const conferenceId = params.id

  const handleError = useCallback(
    (caught: unknown, fallback: string) => {
      if (caught instanceof ConferenceApiError && caught.status === 401) {
        signOut()
        return
      }
      if (
        caught instanceof ConferenceApiError &&
        caught.code === "CONFERENCE_VERSION_CONFLICT"
      ) {
        setError("大会已在其他位置更新，请刷新后再保存。")
      } else {
        setError(caught instanceof Error ? caught.message : fallback)
      }
      if (caught instanceof ConferenceApiError) {
        setFieldErrors(
          caught.fields.map(
            (field) => `${field.path || "大会配置"}：${field.message}`
          )
        )
      }
    },
    [signOut]
  )

  const load = useCallback(async () => {
    if (!token || !conferenceId) return
    setIsLoading(true)
    setError("")
    setFieldErrors([])
    try {
      const next = await getConference(token, conferenceId)
      setConference(next)
      setName(next.name)
      setDescription(next.description ?? "")
      setOrganizer(next.organizer ?? "")
      setStructure({
        roleTemplates: next.roleTemplates,
        committees: next.committees,
      })
    } catch (caught) {
      handleError(caught, "加载大会失败")
    } finally {
      setIsLoading(false)
    }
  }, [conferenceId, handleError, token])

  useEffect(() => {
    void load()
  }, [load])

  async function saveMetadata() {
    if (!token || !conference || saving) return
    if (!name.trim()) {
      setError("大会名称不能为空")
      return
    }
    setSaving("metadata")
    setError("")
    setFieldErrors([])
    try {
      const next = await updateConferenceMetadata(
        token,
        conference.id,
        conference.version,
        {
          name: name.trim(),
          description: description.trim(),
          organizer: organizer.trim(),
        }
      )
      setConference(next)
      setName(next.name)
      setDescription(next.description ?? "")
      setOrganizer(next.organizer ?? "")
    } catch (caught) {
      handleError(caught, "保存大会信息失败")
    } finally {
      setSaving(undefined)
    }
  }

  async function saveStructure() {
    if (!token || !conference || saving) return
    setSaving("structure")
    setError("")
    setFieldErrors([])
    try {
      const next = await replaceConferenceStructure(
        token,
        conference.id,
        conference.version,
        structure
      )
      setConference(next)
      setStructure({
        roleTemplates: next.roleTemplates,
        committees: next.committees,
      })
    } catch (caught) {
      handleError(caught, "保存大会结构失败")
    } finally {
      setSaving(undefined)
    }
  }

  async function removeConference() {
    if (!token || !conference || saving) return
    if (
      !window.confirm(
        `确定删除“${conference.name}”吗？删除后可从大会列表恢复。`
      )
    ) {
      return
    }
    setSaving("delete")
    setError("")
    try {
      await deleteConference(token, conference.id, conference.version)
      router.replace("/")
    } catch (caught) {
      handleError(caught, "删除大会失败")
      setSaving(undefined)
    }
  }

  if (!isReady || (isLoading && !conference)) {
    return <PlatformLoading label="正在加载大会" />
  }

  return (
    <PlatformShell onSignOut={signOut} backHref="/">
      {!conference ? (
        <div className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            {error || "大会不存在或无法访问"}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => router.push("/")}
          >
            返回大会列表
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <section className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">v{conference.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  {conference.committees.length} 个委员会 ·{" "}
                  {conference.roleTemplates.length} 个角色
                </span>
              </div>
              <h1 className="mt-3 truncate text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                {conference.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                上次更新：
                {new Date(conference.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(saving)}
              onClick={() => void removeConference()}
            >
              {saving === "delete" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              删除大会
            </Button>
          </section>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p>{error}</p>
              {fieldErrors.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {fieldErrors.map((fieldError, index) => (
                    <li key={`${index}-${fieldError}`}>{fieldError}</li>
                  ))}
                </ul>
              ) : null}
              {error.includes("其他位置更新") ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void load()}
                >
                  重新加载
                </Button>
              ) : null}
            </div>
          ) : null}

          <Card className="shadow-none ring-0">
            <CardHeader>
              <CardTitle className="text-xl">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="conference-name">大会名称</Label>
                <Input
                  id="conference-name"
                  value={name}
                  maxLength={120}
                  disabled={Boolean(saving)}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conference-description">大会说明</Label>
                <textarea
                  id="conference-description"
                  value={description}
                  maxLength={4000}
                  disabled={Boolean(saving)}
                  className={textareaClassName}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conference-organizer">主办方</Label>
                <Input
                  id="conference-organizer"
                  value={organizer}
                  maxLength={120}
                  disabled={Boolean(saving)}
                  onChange={(event) => setOrganizer(event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => void saveMetadata()}
                >
                  {saving === "metadata" ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  保存基本信息
                </Button>
              </div>
            </CardContent>
          </Card>

          <ConferenceStructureEditor
            value={structure}
            onChange={setStructure}
            disabled={Boolean(saving)}
          />

          <div className="flex justify-end border-t pt-6">
            <Button
              type="button"
              size="lg"
              disabled={Boolean(saving)}
              onClick={() => void saveStructure()}
            >
              {saving === "structure" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              保存大会结构
            </Button>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}
