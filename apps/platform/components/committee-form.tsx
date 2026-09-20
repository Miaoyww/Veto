"use client"

import type { JSX } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CommitteeInput, RoleTemplateInput } from "@/lib/conference-client"
import {
  createClientId,
  roleAllowedInCommittee,
  roleReference,
} from "@/lib/conference-structure"

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface CommitteeFormProps {
  value: CommitteeInput
  roles: RoleTemplateInput[]
  disabled?: boolean
  onChange: (value: CommitteeInput) => void
}

export function CommitteeForm({
  value,
  roles,
  disabled = false,
  onChange,
}: CommitteeFormProps): JSX.Element {
  const reference = value.id ?? value.clientId ?? "committee"

  function updateSeat(
    index: number,
    patch: Partial<CommitteeInput["seats"][number]>
  ): void {
    const seats = [...value.seats]
    seats[index] = { ...seats[index], ...patch }
    onChange({ ...value, seats })
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`committee-name-${reference}`}>委员会名称</Label>
          <Input
            id={`committee-name-${reference}`}
            value={value.name}
            disabled={disabled}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`committee-type-${reference}`}>委员会类型</Label>
          <select
            id={`committee-type-${reference}`}
            value={value.type}
            disabled={disabled}
            className={selectClassName}
            onChange={(event) => {
              const type = event.target.value as CommitteeInput["type"]
              onChange({
                ...value,
                type,
                seats: value.seats.map((seat) => {
                  const role = roles.find(
                    (item) => roleReference(item) === seat.roleTemplateId
                  )
                  return role && !roleAllowedInCommittee(role, type)
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

      <section
        className="flex flex-col gap-3"
        aria-labelledby={`seats-${reference}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id={`seats-${reference}`} className="font-medium">
              席位
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              每个委员会至少需要一个席位。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                seats: [
                  ...value.seats,
                  {
                    clientId: createClientId("seat"),
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

        {value.seats.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            尚未添加席位
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {value.seats.map((seat, seatIndex) => {
              const seatReference =
                seat.id ?? seat.clientId ?? String(seatIndex)
              return (
                <div
                  key={seatReference}
                  className="grid gap-3 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto_auto] lg:items-end"
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`seat-name-${seatReference}`}>
                      席位名称
                    </Label>
                    <Input
                      id={`seat-name-${seatReference}`}
                      value={seat.name}
                      disabled={disabled}
                      onChange={(event) =>
                        updateSeat(seatIndex, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`seat-short-${seatReference}`}>简称</Label>
                    <Input
                      id={`seat-short-${seatReference}`}
                      value={seat.shortName ?? ""}
                      disabled={disabled}
                      maxLength={32}
                      onChange={(event) =>
                        updateSeat(seatIndex, { shortName: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`seat-role-${seatReference}`}>角色</Label>
                    <select
                      id={`seat-role-${seatReference}`}
                      value={seat.roleTemplateId}
                      disabled={disabled}
                      className={selectClassName}
                      onChange={(event) =>
                        updateSeat(seatIndex, {
                          roleTemplateId: event.target.value,
                        })
                      }
                    >
                      <option value="">选择角色</option>
                      {roles
                        .filter((role) =>
                          roleAllowedInCommittee(role, value.type)
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
                        updateSeat(seatIndex, {
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
                      onChange({
                        ...value,
                        seats: value.seats.filter(
                          (_, index) => index !== seatIndex
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
      </section>
    </div>
  )
}
