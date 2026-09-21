/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Coral · designed-as-app */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
"use client"

import { useCallback, useEffect, useState } from "react"
import type { JSX } from "react"
import {
  FileText,
  FolderOpen,
  Loader2,
  Newspaper,
  Radio,
  Save,
  ScrollText,
  Settings2,
  Trash2,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"

import {
  ConferenceStructureEditor,
  textareaClassName,
} from "@/components/conference-structure-editor"
import { ConferenceWorkspacePlaceholder } from "@/components/conference-workspace-placeholder"
import { PlatformLoading, PlatformShell } from "@/components/platform-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function ConferenceDetailPage(): JSX.Element {
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
    (caught: unknown, fallback: string): void => {
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

  const load = useCallback(
    async (refresh = false): Promise<void> => {
      if (!token || !conferenceId) return
      setIsLoading(true)
      setError("")
      setFieldErrors([])
      try {
        const next = await getConference(token, conferenceId, { refresh })
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
    },
    [conferenceId, handleError, token]
  )

  useEffect(() => {
    void load()
  }, [load])

  async function saveMetadata(): Promise<void> {
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

  async function saveStructure(): Promise<void> {
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

  async function removeConference(): Promise<void> {
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
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">v{conference.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  {conference.committees.length} 个委员会 ·{" "}
                  {conference.roleTemplates.length} 个角色
                </span>
              </div>
              <h1 className="mt-3 min-w-0 text-3xl font-bold tracking-[-0.035em] break-words sm:text-4xl">
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
                  onClick={() => void load(true)}
                >
                  重新加载
                </Button>
              ) : null}
            </div>
          ) : null}

          <Tabs defaultValue="settings" className="gap-0">
            <TabsList
              className="grid h-auto w-full grid-cols-5"
              aria-label="大会工作区"
            >
              <TabsTrigger
                value="settings"
                className="min-h-11 min-w-0 py-2 text-xs sm:text-sm"
              >
                <Settings2 className="hidden sm:block" aria-hidden="true" />
                大会设置
              </TabsTrigger>
              <TabsTrigger
                value="news"
                className="min-h-11 min-w-0 py-2 text-xs sm:text-sm"
              >
                <Newspaper className="hidden sm:block" aria-hidden="true" />
                新闻
              </TabsTrigger>
              <TabsTrigger
                value="directives"
                className="min-h-11 min-w-0 py-2 text-xs sm:text-sm"
              >
                <ScrollText className="hidden sm:block" aria-hidden="true" />
                指令
              </TabsTrigger>
              <TabsTrigger
                value="situations"
                className="min-h-11 min-w-0 py-2 text-xs sm:text-sm"
              >
                <Radio className="hidden sm:block" aria-hidden="true" />
                局势
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="min-h-11 min-w-0 py-2 text-xs sm:text-sm"
              >
                <FolderOpen className="hidden sm:block" aria-hidden="true" />
                文件
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-8">
              <div className="grid min-w-0 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
                <Card className="bg-muted/30 shadow-none ring-0 lg:sticky lg:top-6">
                  <CardHeader>
                    <CardTitle className="text-lg">基本信息</CardTitle>
                    <p className="text-sm leading-6 text-muted-foreground">
                      大会名称、公开说明和主办方信息。
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="conference-name">大会名称</Label>
                      <Input
                        id="conference-name"
                        value={name}
                        maxLength={120}
                        disabled={Boolean(saving)}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="conference-organizer">主办方</Label>
                      <Input
                        id="conference-organizer"
                        value={organizer}
                        maxLength={120}
                        disabled={Boolean(saving)}
                        onChange={(event) => setOrganizer(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
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
                  </CardContent>
                </Card>

                <section
                  className="min-w-0"
                  aria-labelledby="structure-heading"
                >
                  <div className="mb-6 flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/30 text-muted-foreground">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="structure-heading"
                        className="text-xl font-semibold tracking-tight"
                      >
                        大会结构
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        配置角色权限、委员会与席位。
                      </p>
                    </div>
                  </div>

                  <ConferenceStructureEditor
                    value={structure}
                    onChange={setStructure}
                    disabled={Boolean(saving)}
                    conferenceId={conference.id}
                  />

                  <div className="sticky bottom-4 mt-8 flex justify-end rounded-xl border bg-background p-3 shadow-sm">
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
                </section>
              </div>
            </TabsContent>

            <TabsContent value="news" className="mt-8">
              <ConferenceWorkspacePlaceholder
                icon={Newspaper}
                title="新闻"
                description="集中处理大会新闻的起草、审核、发布与撤回。当前云端接口尚未提供新闻数据，工作区先保留稳定的布局入口。"
                items={["新闻草稿", "待审核内容", "已发布新闻", "撤回记录"]}
              />
            </TabsContent>

            <TabsContent value="directives" className="mt-8">
              <ConferenceWorkspacePlaceholder
                icon={ScrollText}
                title="指令"
                description="查看各委员会提交的指令，并在同一工作区内认领、处理和追踪结果。当前云端接口尚未提供指令数据。"
                items={["待处理指令", "处理中", "已完成", "处理记录"]}
              />
            </TabsContent>

            <TabsContent value="situations" className="mt-8">
              <ConferenceWorkspacePlaceholder
                icon={Radio}
                title="局势"
                description="编排和发布大会局势更新，并保留撤回与发布时间线。当前云端接口尚未提供局势数据。"
                items={["局势草稿", "发布时间线", "已发布更新", "撤回记录"]}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-8">
              <ConferenceWorkspacePlaceholder
                icon={FolderOpen}
                title="文件"
                description="统一管理大会材料的上传、分发范围与可见状态。当前云端接口尚未提供文件存储能力。"
                items={["大会材料", "席位文件", "分发范围", "文件记录"]}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PlatformShell>
  )
}
