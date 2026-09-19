"use client"

import { useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  ConferenceStructureEditor,
  textareaClassName,
} from "@/components/conference-structure-editor"
import { PlatformLoading, PlatformShell } from "@/components/platform-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ConferenceApiError,
  type ConferenceStructure,
  createConference,
} from "@/lib/conference-client"
import { usePlatformAuth } from "@/lib/use-platform-auth"

const emptyStructure: ConferenceStructure = {
  roleTemplates: [],
  committees: [],
}

export default function NewConferencePage() {
  const router = useRouter()
  const { token, isReady, signOut } = usePlatformAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [organizer, setOrganizer] = useState("")
  const [structure, setStructure] = useState(emptyStructure)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const lastSubmission = useRef<{ payload: string; key: string } | undefined>(
    undefined
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || isSaving) return

    if (!name.trim()) {
      setError("请填写大会名称")
      return
    }
    if (
      structure.roleTemplates.length === 0 ||
      structure.committees.length === 0
    ) {
      setError("至少添加一个角色和一个委员会")
      return
    }

    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      organizer: organizer.trim() || undefined,
      ...structure,
    }
    const payload = JSON.stringify(input)
    if (!lastSubmission.current || lastSubmission.current.payload !== payload) {
      lastSubmission.current = { payload, key: crypto.randomUUID() }
    }

    setIsSaving(true)
    setError("")
    setFieldErrors([])
    try {
      const conference = await createConference(
        token,
        input,
        lastSubmission.current.key
      )
      router.replace(`/conferences/${conference.id}`)
    } catch (caught) {
      if (caught instanceof ConferenceApiError && caught.status === 401) {
        signOut()
        return
      }
      setError(caught instanceof Error ? caught.message : "创建大会失败")
      if (caught instanceof ConferenceApiError) {
        setFieldErrors(
          caught.fields.map(
            (field) => `${field.path || "大会配置"}：${field.message}`
          )
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isReady) return <PlatformLoading />

  return (
    <PlatformShell onSignOut={signOut} backHref="/">
      <form onSubmit={submit} className="space-y-10">
        <section className="border-b pb-10">
          <p className="text-sm font-medium text-muted-foreground">创建大会</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            从空白配置开始
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            大会名称、角色、委员会和席位是必需项。创建后仍可继续调整。
          </p>
        </section>

        <Card className="shadow-none ring-0">
          <CardHeader>
            <CardTitle className="text-xl">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conference-name">大会名称</Label>
              <Input
                id="conference-name"
                value={name}
                maxLength={120}
                disabled={isSaving}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conference-description">大会说明</Label>
              <textarea
                id="conference-description"
                value={description}
                maxLength={4000}
                disabled={isSaving}
                className={textareaClassName}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conference-organizer">主办方</Label>
              <Input
                id="conference-organizer"
                value={organizer}
                maxLength={120}
                disabled={isSaving}
                onChange={(event) => setOrganizer(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <ConferenceStructureEditor
          value={structure}
          onChange={setStructure}
          disabled={isSaving}
        />

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
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => router.push("/")}
          >
            取消
          </Button>
          <Button type="submit" className="min-w-28" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            创建大会
          </Button>
        </div>
      </form>
    </PlatformShell>
  )
}
