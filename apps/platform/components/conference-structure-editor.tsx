"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const textareaClassName =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

function clientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function roleReference(role: RoleTemplateInput) {
  return role.id ?? role.clientId ?? ""
}

function roleAllowedInCommittee(
  role: RoleTemplateInput,
  committeeType: CommitteeInput["type"]
) {
  if (role.systemCode === "staff") return true
  if (role.systemCode === "mpc_press") return committeeType === "mpc"
  if (role.systemCode === "ipc") return committeeType === "ipc"
  return committeeType !== "ipc"
}

function createRole(): RoleTemplateInput {
  return {
    clientId: clientId("role"),
    name: "",
    description: "",
    capabilities: [],
  }
}

function createCommittee(): CommitteeInput {
  return {
    clientId: clientId("committee"),
    name: "",
    type: "cabinet",
    seats: [],
    agenda: [],
  }
}

export function ConferenceStructureEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: ConferenceStructure
  onChange: (value: ConferenceStructure) => void
  disabled?: boolean
}) {
  function updateRole(index: number, patch: Partial<RoleTemplateInput>) {
    const roles = [...value.roleTemplates]
    roles[index] = { ...roles[index], ...patch }
    onChange({ ...value, roleTemplates: roles })
  }

  function removeRole(index: number) {
    const reference = roleReference(value.roleTemplates[index])
    if (
      value.committees.some((committee) =>
        committee.seats.some((seat) => seat.roleTemplateId === reference)
      )
    ) {
      return
    }
    onChange({
      ...value,
      roleTemplates: value.roleTemplates.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    })
  }

  function updateCommittee(index: number, patch: Partial<CommitteeInput>) {
    const committees = [...value.committees]
    committees[index] = { ...committees[index], ...patch }
    onChange({ ...value, committees })
  }

  function updateSeat(
    committeeIndex: number,
    seatIndex: number,
    patch: Partial<CommitteeInput["seats"][number]>
  ) {
    const committee = value.committees[committeeIndex]
    const seats = [...committee.seats]
    seats[seatIndex] = { ...seats[seatIndex], ...patch }
    updateCommittee(committeeIndex, { seats })
  }

  function updateAgenda(
    committeeIndex: number,
    agendaIndex: number,
    patch: Partial<CommitteeInput["agenda"][number]>
  ) {
    const committee = value.committees[committeeIndex]
    const agenda = [...committee.agenda]
    agenda[agendaIndex] = { ...agenda[agendaIndex], ...patch }
    updateCommittee(committeeIndex, { agenda })
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4" aria-labelledby="roles-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="roles-heading"
              className="text-xl font-semibold tracking-tight"
            >
              角色与权限
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              每个角色至少选择一项权限。系统角色会限制可使用的委员会类型。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                roleTemplates: [...value.roleTemplates, createRole()],
              })
            }
          >
            <Plus aria-hidden="true" />
            添加角色
          </Button>
        </div>

        {value.roleTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            尚未添加角色
          </div>
        ) : (
          <div className="space-y-4">
            {value.roleTemplates.map((role, roleIndex) => {
              const reference = roleReference(role)
              const inUse = value.committees.some((committee) =>
                committee.seats.some(
                  (seat) => seat.roleTemplateId === reference
                )
              )
              return (
                <Card key={reference} className="shadow-none ring-0">
                  <CardHeader className="flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base">
                      {role.name.trim() || `角色 ${roleIndex + 1}`}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || inUse}
                      onClick={() => removeRole(roleIndex)}
                      aria-label={inUse ? "角色正在被席位使用" : "删除角色"}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`role-name-${reference}`}>
                          角色名称
                        </Label>
                        <Input
                          id={`role-name-${reference}`}
                          value={role.name}
                          disabled={disabled}
                          maxLength={120}
                          onChange={(event) =>
                            updateRole(roleIndex, { name: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`role-system-${reference}`}>
                          角色类型
                        </Label>
                        <select
                          id={`role-system-${reference}`}
                          value={role.systemCode ?? "custom"}
                          disabled={disabled}
                          className={selectClassName}
                          onChange={(event) =>
                            updateRole(roleIndex, {
                              systemCode:
                                event.target.value === "custom"
                                  ? undefined
                                  : (event.target
                                      .value as RoleTemplateInput["systemCode"]),
                            })
                          }
                        >
                          <option value="custom">自定义角色</option>
                          <option value="staff">Staff</option>
                          <option value="mpc_press">MPC 记者</option>
                          <option value="ipc">IPC</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`role-description-${reference}`}>
                        角色说明
                      </Label>
                      <Input
                        id={`role-description-${reference}`}
                        value={role.description ?? ""}
                        disabled={disabled}
                        maxLength={2000}
                        onChange={(event) =>
                          updateRole(roleIndex, {
                            description: event.target.value,
                          })
                        }
                      />
                    </div>
                    <fieldset>
                      <legend className="text-sm font-medium">权限</legend>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {CAPABILITIES.map((capability) => (
                          <label
                            key={capability}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={role.capabilities.includes(capability)}
                              disabled={disabled}
                              onChange={() => {
                                const capabilities = role.capabilities.includes(
                                  capability
                                )
                                  ? role.capabilities.filter(
                                      (item) => item !== capability
                                    )
                                  : [...role.capabilities, capability]
                                updateRole(roleIndex, {
                                  capabilities: capabilities as Capability[],
                                })
                              }}
                            />
                            {CAPABILITY_LABELS[capability]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="committees-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="committees-heading"
              className="text-xl font-semibold tracking-tight"
            >
              委员会与席位
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              每个委员会至少需要一个席位；议程可稍后补充。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                committees: [...value.committees, createCommittee()],
              })
            }
          >
            <Plus aria-hidden="true" />
            添加委员会
          </Button>
        </div>

        {value.committees.length === 0 ? (
          <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            尚未添加委员会
          </div>
        ) : (
          <div className="space-y-5">
            {value.committees.map((committee, committeeIndex) => {
              const committeeReference =
                committee.id ?? committee.clientId ?? String(committeeIndex)
              return (
                <Card key={committeeReference} className="shadow-none ring-0">
                  <CardHeader className="flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base">
                      {committee.name.trim() || `委员会 ${committeeIndex + 1}`}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() =>
                        onChange({
                          ...value,
                          committees: value.committees.filter(
                            (_, itemIndex) => itemIndex !== committeeIndex
                          ),
                        })
                      }
                      aria-label="删除委员会"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`committee-name-${committeeReference}`}>
                          委员会名称
                        </Label>
                        <Input
                          id={`committee-name-${committeeReference}`}
                          value={committee.name}
                          disabled={disabled}
                          maxLength={120}
                          onChange={(event) =>
                            updateCommittee(committeeIndex, {
                              name: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`committee-type-${committeeReference}`}>
                          委员会类型
                        </Label>
                        <select
                          id={`committee-type-${committeeReference}`}
                          value={committee.type}
                          disabled={disabled}
                          className={selectClassName}
                          onChange={(event) => {
                            const type = event.target
                              .value as CommitteeInput["type"]
                            updateCommittee(committeeIndex, {
                              type,
                              seats: committee.seats.map((seat) => {
                                const role = value.roleTemplates.find(
                                  (item) =>
                                    roleReference(item) === seat.roleTemplateId
                                )
                                return role &&
                                  !roleAllowedInCommittee(role, type)
                                  ? { ...seat, roleTemplateId: "" }
                                  : seat
                              }),
                            })
                          }}
                        >
                          <option value="cabinet">委员会 / Cabinet</option>
                          <option value="mpc">MPC</option>
                          <option value="ipc">IPC</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium">席位</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            updateCommittee(committeeIndex, {
                              seats: [
                                ...committee.seats,
                                {
                                  clientId: clientId("seat"),
                                  name: "",
                                  shortName: "",
                                  roleTemplateId: "",
                                  hasVotingRights: true,
                                },
                              ],
                            })
                          }
                        >
                          <Plus aria-hidden="true" />
                          添加席位
                        </Button>
                      </div>
                      {committee.seats.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          尚未添加席位
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {committee.seats.map((seat, seatIndex) => {
                            const seatReference =
                              seat.id ?? seat.clientId ?? String(seatIndex)
                            return (
                              <div
                                key={seatReference}
                                className="grid gap-3 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto_auto] lg:items-end"
                              >
                                <div className="space-y-2">
                                  <Label htmlFor={`seat-name-${seatReference}`}>
                                    席位名称
                                  </Label>
                                  <Input
                                    id={`seat-name-${seatReference}`}
                                    value={seat.name}
                                    disabled={disabled}
                                    onChange={(event) =>
                                      updateSeat(committeeIndex, seatIndex, {
                                        name: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`seat-short-${seatReference}`}
                                  >
                                    简称
                                  </Label>
                                  <Input
                                    id={`seat-short-${seatReference}`}
                                    value={seat.shortName ?? ""}
                                    disabled={disabled}
                                    maxLength={32}
                                    onChange={(event) =>
                                      updateSeat(committeeIndex, seatIndex, {
                                        shortName: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`seat-role-${seatReference}`}>
                                    角色
                                  </Label>
                                  <select
                                    id={`seat-role-${seatReference}`}
                                    value={seat.roleTemplateId}
                                    disabled={disabled}
                                    className={selectClassName}
                                    onChange={(event) =>
                                      updateSeat(committeeIndex, seatIndex, {
                                        roleTemplateId: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">选择角色</option>
                                    {value.roleTemplates
                                      .filter((role) =>
                                        roleAllowedInCommittee(
                                          role,
                                          committee.type
                                        )
                                      )
                                      .map((role) => (
                                        <option
                                          key={roleReference(role)}
                                          value={roleReference(role)}
                                        >
                                          {role.name || "未命名角色"}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <label className="flex h-9 items-center gap-2 text-sm whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={seat.hasVotingRights}
                                    disabled={disabled}
                                    onChange={(event) =>
                                      updateSeat(committeeIndex, seatIndex, {
                                        hasVotingRights: event.target.checked,
                                      })
                                    }
                                  />
                                  投票权
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={disabled}
                                  onClick={() =>
                                    updateCommittee(committeeIndex, {
                                      seats: committee.seats.filter(
                                        (_, itemIndex) =>
                                          itemIndex !== seatIndex
                                      ),
                                    })
                                  }
                                  aria-label="删除席位"
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                                {seat.inviteCode ? (
                                  <p className="text-xs text-muted-foreground lg:col-span-5">
                                    邀请码：
                                    <span className="font-mono text-foreground">
                                      {seat.inviteCode}
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium">议程</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            updateCommittee(committeeIndex, {
                              agenda: [
                                ...committee.agenda,
                                {
                                  clientId: clientId("agenda"),
                                  title: "",
                                  description: "",
                                },
                              ],
                            })
                          }
                        >
                          <Plus aria-hidden="true" />
                          添加议程
                        </Button>
                      </div>
                      {committee.agenda.map((item, agendaIndex) => {
                        const agendaReference =
                          item.id ?? item.clientId ?? String(agendaIndex)
                        return (
                          <div
                            key={agendaReference}
                            className="grid gap-3 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end"
                          >
                            <div className="space-y-2">
                              <Label
                                htmlFor={`agenda-title-${agendaReference}`}
                              >
                                标题
                              </Label>
                              <Input
                                id={`agenda-title-${agendaReference}`}
                                value={item.title}
                                disabled={disabled}
                                onChange={(event) =>
                                  updateAgenda(committeeIndex, agendaIndex, {
                                    title: event.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor={`agenda-description-${agendaReference}`}
                              >
                                说明
                              </Label>
                              <Input
                                id={`agenda-description-${agendaReference}`}
                                value={item.description ?? ""}
                                disabled={disabled}
                                onChange={(event) =>
                                  updateAgenda(committeeIndex, agendaIndex, {
                                    description: event.target.value,
                                  })
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={disabled}
                              onClick={() =>
                                updateCommittee(committeeIndex, {
                                  agenda: committee.agenda.filter(
                                    (_, itemIndex) => itemIndex !== agendaIndex
                                  ),
                                })
                              }
                              aria-label="删除议程"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export { textareaClassName }
