"use client"

import { useCallback, useEffect, useState } from "react"
import type { JSX } from "react"
import { Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { CommitteeForm } from "@/components/committee-form"
import { PlatformLoading, PlatformShell } from "@/components/platform-shell"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ConferenceApiError,
  type CommitteeInput,
  type Conference,
  getConference,
  replaceConferenceStructure,
} from "@/lib/conference-client"
import { committeeReference, createCommittee } from "@/lib/conference-structure"
import { usePlatformAuth } from "@/lib/use-platform-auth"
import { cn } from "@/lib/utils"

export default function CommitteeDetailPage(): JSX.Element {
  const params = useParams<{ id: string; committeeId: string }>()
  const router = useRouter()
  const { token, isReady, signOut } = usePlatformAuth()
  const [conference, setConference] = useState<Conference>()
  const [committee, setCommittee] = useState<CommitteeInput>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const isNew = params.committeeId === "new"

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
        setError("大会已在其他位置更新，请返回大会页面重新加载后再编辑。")
        return
      }
      setError(caught instanceof Error ? caught.message : fallback)
    },
    [signOut]
  )

  const load = useCallback(async (): Promise<void> => {
    if (!token || !params.id || !params.committeeId) return
    setIsLoading(true)
    setError("")
    try {
      const next = await getConference(token, params.id)
      const nextCommittee = isNew
        ? createCommittee()
        : next.committees.find(
            (item, index) =>
              committeeReference(item, index) === params.committeeId
          )
      setConference(next)
      setCommittee(nextCommittee)
      if (!nextCommittee) setError("委员会不存在或已被删除。")
    } catch (caught) {
      handleError(caught, "加载委员会失败")
    } finally {
      setIsLoading(false)
    }
  }, [handleError, isNew, params.committeeId, params.id, token])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (!token || !conference || conference.lifecycle !== "draft" || !committee || isSaving) return
    if (!committee.name.trim()) {
      setError("委员会名称不能为空。")
      return
    }
    if (committee.seats.length === 0) {
      setError("每个委员会至少需要一个席位。")
      return
    }

    setIsSaving(true)
    setError("")
    try {
      const committees = isNew
        ? [...conference.committees, committee]
        : conference.committees.map((item, index) =>
            committeeReference(item, index) === params.committeeId
              ? committee
              : item
          )
      await replaceConferenceStructure(
        token,
        conference.id,
        conference.version,
        {
          roleTemplates: conference.roleTemplates,
          committees,
        }
      )
      router.replace(`/conferences/${conference.id}`)
    } catch (caught) {
      handleError(caught, "保存委员会失败")
      setIsSaving(false)
    }
  }

  if (!isReady || isLoading) {
    return <PlatformLoading label="正在加载委员会" />
  }

  const backHref = `/conferences/${params.id}`

  return (
    <PlatformShell onSignOut={signOut} backHref={backHref} backLabel="返回大会">
      {!conference || !committee ? (
        <div className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            {error || "委员会不存在或无法访问"}
          </p>
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            返回大会
          </Link>
        </div>
      ) : conference.lifecycle !== "draft" ? (
        <div className="mx-auto max-w-xl rounded-xl border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            只有草稿大会可以修改委员会结构。
          </p>
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            返回大会
          </Link>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <header className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <Badge variant="secondary">
                {isNew ? "新委员会" : `${committee.seats.length} 个席位`}
              </Badge>
              <h1 className="mt-3 min-w-0 text-3xl font-bold tracking-[-0.035em] break-words sm:text-4xl">
                {committee.name.trim() || "新建委员会"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {conference.name}
              </p>
            </div>
          </header>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <Card className="shadow-none ring-0">
            <CardHeader>
              <CardTitle className="text-xl">委员会设置</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                配置委员会类型、席位、角色与投票权。
              </p>
            </CardHeader>
            <CardContent>
              <CommitteeForm
                value={committee}
                roles={conference.roleTemplates}
                disabled={isSaving}
                onChange={setCommittee}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Link
              href={backHref}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              取消
            </Link>
            <Button
              type="button"
              size="lg"
              disabled={isSaving}
              onClick={() => void save()}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              保存委员会
            </Button>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}
