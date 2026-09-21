"use client"

import { useEffect, useState } from "react"
import type { JSX, MouseEvent } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ConfirmDeleteButtonProps {
  disabled?: boolean
  disabledLabel?: string
  onConfirm: () => void
}

export function ConfirmDeleteButton({
  disabled = false,
  disabledLabel,
  onConfirm,
}: ConfirmDeleteButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timeout = window.setTimeout(() => setConfirming(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [confirming])

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
    if (confirming) {
      onConfirm()
      setConfirming(false)
      return
    }
    setConfirming(true)
  }

  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "ghost"}
      size="sm"
      disabled={disabled}
      title={
        disabled ? disabledLabel : confirming ? "再次点击确认删除" : "删除"
      }
      aria-label={confirming ? "再次点击确认删除" : disabledLabel || "删除"}
      onClick={handleClick}
    >
      <Trash2 aria-hidden="true" />
      删除
    </Button>
  )
}
