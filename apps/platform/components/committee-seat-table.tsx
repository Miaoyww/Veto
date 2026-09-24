"use client"

import { useEffect, useRef, useState } from "react"
import type { JSX, KeyboardEvent } from "react"
import { Check, Copy, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  CommitteeType,
  RoleTemplateInput,
  SeatInput,
} from "@/lib/conference-client"
import {
  roleAllowedInCommittee,
  roleReference,
} from "@/lib/conference-structure"

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface CommitteeSeatTableProps {
  seats: SeatInput[]
  roles: RoleTemplateInput[]
  committeeType: CommitteeType
  disabled?: boolean
  allowExistingRemoval?: boolean
  onChange: (seats: SeatInput[]) => void
}

function seatReference(seat: SeatInput, index: number): string {
  return seat.id ?? seat.clientId ?? String(index)
}

export function CommitteeSeatTable({
  seats,
  roles,
  committeeType,
  disabled = false,
  allowExistingRemoval = true,
  onChange,
}: CommitteeSeatTableProps): JSX.Element {
  const knownSeats = useRef(new Set(seats.map(seatReference)))
  const deleteTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [copied, setCopied] = useState("")
  const [editing, setEditing] = useState("")
  const [editName, setEditName] = useState("")
  const [editShortName, setEditShortName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editVotingRights, setEditVotingRights] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const allowedRoles = roles.filter((role) =>
    roleAllowedInCommittee(role, committeeType)
  )

  function startEditing(seat: SeatInput, index: number): void {
    clearDeleteConfirmation()
    setEditing(seatReference(seat, index))
    setEditName(seat.name)
    setEditShortName(seat.shortName ?? "")
    setEditRole(seat.roleTemplateId)
    setEditVotingRights(seat.hasVotingRights)
  }

  function cancelEditing(): void {
    setEditing("")
    setEditName("")
    setEditShortName("")
    setEditRole("")
    setEditVotingRights(true)
  }

  function saveSeat(index: number): void {
    const name = editName.trim()
    if (!name || !editRole) return
    const next = [...seats]
    next[index] = {
      ...next[index],
      name,
      shortName: editShortName.trim() || undefined,
      roleTemplateId: editRole,
      hasVotingRights: editVotingRights,
    }
    onChange(next)
    cancelEditing()
  }

  function handleEditorKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ): void {
    if (event.key === "Enter") {
      event.preventDefault()
      saveSeat(index)
    } else if (event.key === "Escape") {
      event.preventDefault()
      cancelEditing()
    }
  }

  function clearDeleteConfirmation(): void {
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
    deleteTimer.current = undefined
    setDeleteConfirm("")
  }

  function handleDelete(seat: SeatInput, index: number): void {
    const reference = seatReference(seat, index)
    if (deleteConfirm !== reference) {
      clearDeleteConfirmation()
      setDeleteConfirm(reference)
      deleteTimer.current = setTimeout(clearDeleteConfirmation, 3000)
      return
    }

    clearDeleteConfirmation()
    if (editing === reference) cancelEditing()
    onChange(seats.filter((_, seatIndex) => seatIndex !== index))
  }

  async function copyCode(code: string, reference: string): Promise<void> {
    if (!code) return
    await navigator.clipboard.writeText(code)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    setCopied(reference)
    copiedTimer.current = setTimeout(() => setCopied(""), 1400)
  }

  useEffect(() => {
    const currentReferences = new Set(seats.map(seatReference))
    const addedIndex = seats.findIndex(
      (seat, index) =>
        !knownSeats.current.has(seatReference(seat, index)) && !seat.name.trim()
    )
    knownSeats.current = currentReferences
    if (addedIndex >= 0) startEditing(seats[addedIndex], addedIndex)
  }, [seats])

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    []
  )

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">席位</th>
            <th className="px-4 py-3 text-left font-medium">简称</th>
            <th className="px-4 py-3 text-left font-medium">角色</th>
            <th className="px-4 py-3 text-left font-medium">投票权</th>
            <th className="px-4 py-3 text-left font-medium">访问 Key</th>
            <th className="px-4 py-3 text-center font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((seat, index) => {
            const reference = seatReference(seat, index)
            const isEditing = editing === reference
            const role = roles.find(
              (item) => roleReference(item) === seat.roleTemplateId
            )
            return (
              <tr key={reference} className="border-t align-middle">
                <td className="px-4 py-3 font-medium">
                  {isEditing ? (
                    <Input
                      value={editName}
                      disabled={disabled}
                      aria-label="席位名称"
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => handleEditorKeyDown(event, index)}
                    />
                  ) : (
                    seat.name || "未命名席位"
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <Input
                      value={editShortName}
                      disabled={disabled}
                      maxLength={32}
                      placeholder="可选"
                      aria-label="席位简称"
                      onChange={(event) => setEditShortName(event.target.value)}
                      onKeyDown={(event) => handleEditorKeyDown(event, index)}
                    />
                  ) : (
                    seat.shortName || "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {isEditing ? (
                    <select
                      value={editRole}
                      disabled={disabled}
                      className={selectClassName}
                      aria-label="席位角色"
                      onChange={(event) => setEditRole(event.target.value)}
                      onKeyDown={(event) => handleEditorKeyDown(event, index)}
                    >
                      <option value="">选择角色</option>
                      {allowedRoles.map((allowedRole) => (
                        <option
                          key={roleReference(allowedRole)}
                          value={roleReference(allowedRole)}
                        >
                          {allowedRole.name || "未命名角色"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    role?.name || "未选择"
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <label className="flex h-9 items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={editVotingRights}
                        disabled={disabled}
                        onChange={(event) =>
                          setEditVotingRights(event.target.checked)
                        }
                      />
                      有投票权
                    </label>
                  ) : seat.hasVotingRights ? (
                    "有"
                  ) : (
                    "无"
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="font-mono text-xs">
                    {seat.inviteCode || "未生成"}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="复制 Key"
                      aria-label="复制 Key"
                      disabled={disabled || !seat.inviteCode}
                      onClick={() =>
                        void copyCode(seat.inviteCode ?? "", reference)
                      }
                    >
                      {copied === reference ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Copy aria-hidden="true" />
                      )}
                    </Button>
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="取消编辑"
                          aria-label="取消编辑"
                          disabled={disabled}
                          onClick={cancelEditing}
                        >
                          <X aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="保存席位"
                          aria-label="保存席位"
                          disabled={disabled || !editName.trim() || !editRole}
                          onClick={() => saveSeat(index)}
                        >
                          <Check aria-hidden="true" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="编辑席位"
                        aria-label="编辑席位"
                        disabled={disabled}
                        onClick={() => startEditing(seat, index)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || (!allowExistingRemoval && Boolean(seat.id))}
                      className={
                        deleteConfirm === reference
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                          : undefined
                      }
                      title={
                        deleteConfirm === reference
                          ? "再次点击确认删除"
                          : "删除席位"
                      }
                      onClick={() => handleDelete(seat, index)}
                    >
                      <Trash2 aria-hidden="true" />
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
          {seats.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                暂无席位
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
