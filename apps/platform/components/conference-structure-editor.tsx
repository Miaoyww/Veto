"use client"

import { useState } from "react"
import type { JSX } from "react"
import { ChevronDown, Pencil, Plus } from "lucide-react"
import Link from "next/link"

import { CommitteeForm } from "@/components/committee-form"
import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CAPABILITIES,
  CAPABILITY_LABELS,
  type Capability,
  type CommitteeInput,
  type ConferenceStructure,
  type RoleTemplateInput,
} from "@/lib/conference-client"
import {
  committeeReference,
  createClientId,
  createCommittee,
  roleReference,
} from "@/lib/conference-structure"
import { cn } from "@/lib/utils"

const textareaClassName =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

const committeeTypeLabels: Record<CommitteeInput["type"], string> = {
  cabinet: "委员会 / Cabinet",
  mpc: "MPC",
  ipc: "IPC",
}

const roleSystemLabels: Record<
  NonNullable<RoleTemplateInput["systemCode"]> | "custom",
  string
> = {
  custom: "自定义角色",
  staff: "Staff",
  mpc_press: "MPC 记者",
  ipc: "IPC",
}

function createRole(): RoleTemplateInput {
  return {
    clientId: createClientId("role"),
    name: "",
    description: "",
    capabilities: [],
  }
}

interface ConferenceStructureEditorProps {
  value: ConferenceStructure
  onChange: (value: ConferenceStructure) => void
  disabled?: boolean
  conferenceId?: string
}

export function ConferenceStructureEditor({
  value,
  onChange,
  disabled = false,
  conferenceId,
}: ConferenceStructureEditorProps): JSX.Element {
  const [rolesOpen, setRolesOpen] = useState(true)
  const [committeesOpen, setCommitteesOpen] = useState(true)
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null)
  const [editingCommitteeIndex, setEditingCommitteeIndex] = useState<
    number | null
  >(null)

  const editingRole =
    editingRoleIndex === null
      ? undefined
      : value.roleTemplates[editingRoleIndex]
  const editingCommittee =
    editingCommitteeIndex === null
      ? undefined
      : value.committees[editingCommitteeIndex]

  function updateRole(index: number, patch: Partial<RoleTemplateInput>): void {
    const roles = [...value.roleTemplates]
    roles[index] = { ...roles[index], ...patch }
    onChange({ ...value, roleTemplates: roles })
  }

  function addRole(): void {
    const index = value.roleTemplates.length
    onChange({
      ...value,
      roleTemplates: [...value.roleTemplates, createRole()],
    })
    setEditingRoleIndex(index)
    setRolesOpen(true)
  }

  function removeRole(index: number): void {
    onChange({
      ...value,
      roleTemplates: value.roleTemplates.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    })
    if (editingRoleIndex === index) setEditingRoleIndex(null)
  }

  function addCommittee(): void {
    const index = value.committees.length
    onChange({
      ...value,
      committees: [...value.committees, createCommittee()],
    })
    setEditingCommitteeIndex(index)
    setCommitteesOpen(true)
  }

  function updateCommittee(index: number, committee: CommitteeInput): void {
    const committees = [...value.committees]
    committees[index] = committee
    onChange({ ...value, committees })
  }

  function removeCommittee(index: number): void {
    onChange({
      ...value,
      committees: value.committees.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    })
    if (editingCommitteeIndex === index) setEditingCommitteeIndex(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
        <section
          className="rounded-xl border bg-card"
          aria-labelledby="roles-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="roles-heading"
                  className="text-lg font-semibold tracking-tight"
                >
                  角色与权限
                </h2>
                <Badge variant="secondary">{value.roleTemplates.length}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                每个角色至少选择一项权限。系统角色会限制可使用的委员会类型。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={addRole}
              >
                <Plus aria-hidden="true" />
                添加角色
              </Button>
              <CollapsibleTrigger
                render={<Button type="button" variant="ghost" size="icon" />}
                aria-label={rolesOpen ? "收起角色与权限" : "展开角色与权限"}
              >
                <ChevronDown
                  className={cn(rolesOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="border-t p-4 sm:p-5">
            {value.roleTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
                尚未添加角色
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {value.roleTemplates.map((role, roleIndex) => {
                  const reference = roleReference(role)
                  const inUse = value.committees.some((committee) =>
                    committee.seats.some(
                      (seat) => seat.roleTemplateId === reference
                    )
                  )
                  return (
                    <Card
                      key={reference}
                      className="relative gap-3 bg-muted/25 py-4 shadow-none ring-0 transition-colors hover:bg-muted/45"
                    >
                      <button
                        type="button"
                        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        disabled={disabled}
                        onClick={() => setEditingRoleIndex(roleIndex)}
                      >
                        <span className="sr-only">
                          编辑{role.name.trim() || `角色 ${roleIndex + 1}`}
                        </span>
                      </button>
                      <CardHeader className="pointer-events-none relative px-4">
                        <CardTitle className="truncate text-base">
                          {role.name.trim() || `角色 ${roleIndex + 1}`}
                        </CardTitle>
                        <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {role.description?.trim() || "暂无角色说明"}
                        </p>
                      </CardHeader>
                      <CardContent className="relative flex flex-wrap items-center justify-between gap-3 px-4">
                        <div className="pointer-events-none flex flex-wrap items-center gap-2">
                          {role.systemCode ? (
                            <Badge variant="outline">系统角色</Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {role.capabilities.length} 项权限
                          </span>
                        </div>
                        <div className="relative flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setEditingRoleIndex(roleIndex)
                            }}
                          >
                            <Pencil aria-hidden="true" />
                            编辑
                          </Button>
                          <ConfirmDeleteButton
                            disabled={disabled || inUse}
                            disabledLabel={
                              inUse ? "角色正在被席位使用" : undefined
                            }
                            onConfirm={() => removeRole(roleIndex)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CollapsibleContent>
        </section>
      </Collapsible>

      <Collapsible open={committeesOpen} onOpenChange={setCommitteesOpen}>
        <section
          className="rounded-xl border bg-card"
          aria-labelledby="committees-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="committees-heading"
                  className="text-lg font-semibold tracking-tight"
                >
                  委员会与席位
                </h2>
                <Badge variant="secondary">{value.committees.length}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                每个委员会至少需要一个席位。
              </p>
            </div>
            <div className="flex items-center gap-2">
              {conferenceId ? (
                <Link
                  href={`/conferences/${conferenceId}/committees/new`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Plus aria-hidden="true" />
                  添加委员会
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={addCommittee}
                >
                  <Plus aria-hidden="true" />
                  添加委员会
                </Button>
              )}
              <CollapsibleTrigger
                render={<Button type="button" variant="ghost" size="icon" />}
                aria-label={
                  committeesOpen ? "收起委员会与席位" : "展开委员会与席位"
                }
              >
                <ChevronDown
                  className={cn(committeesOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="border-t p-4 sm:p-5">
            {value.committees.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
                尚未添加委员会
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {value.committees.map((committee, committeeIndex) => {
                  const reference = committeeReference(
                    committee,
                    committeeIndex
                  )
                  const href = conferenceId
                    ? `/conferences/${conferenceId}/committees/${reference}`
                    : undefined
                  return (
                    <Card
                      key={reference}
                      className="relative gap-3 bg-muted/25 py-4 shadow-none ring-0 transition-colors hover:bg-muted/45"
                    >
                      {href ? (
                        <Link
                          href={href}
                          className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          <span className="sr-only">
                            编辑
                            {committee.name.trim() ||
                              `委员会 ${committeeIndex + 1}`}
                          </span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                          disabled={disabled}
                          onClick={() =>
                            setEditingCommitteeIndex(committeeIndex)
                          }
                        >
                          <span className="sr-only">
                            编辑
                            {committee.name.trim() ||
                              `委员会 ${committeeIndex + 1}`}
                          </span>
                        </button>
                      )}
                      <CardHeader className="pointer-events-none relative px-4">
                        <CardTitle className="truncate text-base">
                          {committee.name.trim() ||
                            `委员会 ${committeeIndex + 1}`}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {committeeTypeLabels[committee.type]}
                        </p>
                      </CardHeader>
                      <CardContent className="relative flex flex-wrap items-center justify-between gap-3 px-4">
                        <span className="pointer-events-none text-xs text-muted-foreground">
                          {committee.seats.length} 个席位
                        </span>
                        <div className="relative flex items-center gap-1">
                          {href ? (
                            <Link
                              href={href}
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })}
                            >
                              <Pencil aria-hidden="true" />
                              编辑
                            </Link>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                setEditingCommitteeIndex(committeeIndex)
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              编辑
                            </Button>
                          )}
                          <ConfirmDeleteButton
                            disabled={disabled}
                            onConfirm={() => removeCommittee(committeeIndex)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CollapsibleContent>
        </section>
      </Collapsible>

      <Dialog
        open={editingRole !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditingRoleIndex(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole?.name.trim() || "编辑角色"}</DialogTitle>
            <DialogDescription>
              设置角色名称、类型以及该角色可使用的大会能力。
            </DialogDescription>
          </DialogHeader>
          {editingRole && editingRoleIndex !== null ? (
            <div className="flex flex-col gap-5 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`role-name-${roleReference(editingRole)}`}>
                    角色名称
                  </Label>
                  <Input
                    id={`role-name-${roleReference(editingRole)}`}
                    value={editingRole.name}
                    disabled={disabled}
                    maxLength={120}
                    onChange={(event) =>
                      updateRole(editingRoleIndex, {
                        name: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`role-system-${roleReference(editingRole)}`}>
                    角色类型
                  </Label>
                  <Select
                    value={editingRole.systemCode ?? "custom"}
                    items={roleSystemLabels}
                    disabled={disabled}
                    onValueChange={(newValue) =>
                      updateRole(editingRoleIndex, {
                        systemCode:
                          newValue === "custom"
                            ? undefined
                            : (newValue as RoleTemplateInput["systemCode"]),
                      })
                    }
                  >
                    <SelectTrigger
                      id={`role-system-${roleReference(editingRole)}`}
                      className="h-9 w-full"
                    >
                      <SelectValue placeholder="选择角色类型" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="custom">自定义角色</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="mpc_press">MPC 记者</SelectItem>
                      <SelectItem value="ipc">IPC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor={`role-description-${roleReference(editingRole)}`}
                >
                  角色说明
                </Label>
                <Input
                  id={`role-description-${roleReference(editingRole)}`}
                  value={editingRole.description ?? ""}
                  disabled={disabled}
                  maxLength={2000}
                  onChange={(event) =>
                    updateRole(editingRoleIndex, {
                      description: event.target.value,
                    })
                  }
                />
              </div>
              <fieldset>
                <legend className="text-sm font-medium">权限</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {CAPABILITIES.map((capability) => (
                    <label
                      key={capability}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={editingRole.capabilities.includes(capability)}
                        disabled={disabled}
                        onChange={() => {
                          const capabilities =
                            editingRole.capabilities.includes(capability)
                              ? editingRole.capabilities.filter(
                                  (item) => item !== capability
                                )
                              : [...editingRole.capabilities, capability]
                          updateRole(editingRoleIndex, {
                            capabilities: capabilities as Capability[],
                          })
                        }}
                      />
                      {CAPABILITY_LABELS[capability]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              完成
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!conferenceId && editingCommittee !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditingCommitteeIndex(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingCommittee?.name.trim() || "编辑委员会"}
            </DialogTitle>
            <DialogDescription>
              大会创建完成后，委员会将使用独立页面进行编辑。
            </DialogDescription>
          </DialogHeader>
          {editingCommittee && editingCommitteeIndex !== null ? (
            <CommitteeForm
              value={editingCommittee}
              roles={value.roleTemplates}
              disabled={disabled}
              onChange={(committee) =>
                updateCommittee(editingCommitteeIndex, committee)
              }
            />
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              完成
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { textareaClassName }
