"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FILE_RETENTION_MS,
  formatSchedule,
  scheduleError,
  scheduleInstant,
} from "@/lib/conference-schedule"

export function ConferenceScheduleFields({
  startsAt,
  endsAt,
  onStartChange,
  onEndChange,
  disabled = false,
}: {
  startsAt: string
  endsAt: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  disabled?: boolean
}) {
  const error = scheduleError(startsAt, endsAt)
  const deadline =
    !error && endsAt
      ? new Date(
          Date.parse(scheduleInstant(endsAt)!) + FILE_RETENTION_MS
        ).toISOString()
      : null
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-medium">
        实际会议时间（UTC+8，可选）
      </legend>
      <p className="text-xs text-muted-foreground">
        与模拟时间线独立，不会自动激活或结束大会。清空可移除时间设置。
      </p>
      <Label htmlFor="conference-starts-at">开始时间</Label>
      <Input
        id="conference-starts-at"
        type="datetime-local"
        step="0.001"
        value={startsAt}
        onChange={(event) => onStartChange(event.target.value)}
      />
      <Label htmlFor="conference-ends-at">结束时间</Label>
      <Input
        id="conference-ends-at"
        type="datetime-local"
        step="0.001"
        value={endsAt}
        aria-invalid={Boolean(error)}
        aria-describedby="conference-schedule-help"
        onChange={(event) => onEndChange(event.target.value)}
      />
      <p
        id="conference-schedule-help"
        className={
          error ? "text-sm text-destructive" : "text-xs text-muted-foreground"
        }
      >
        {error ||
          (deadline
            ? `文件将于 ${formatSchedule(deadline)} 到期并自动清理（结束后 3 天，即 72 小时）。请提前下载保存到本地，清理后无法恢复。`
            : "未设置结束时间，暂无自动清理期限。设置后，文件将在结束时间的 3 天（72 小时）后自动清理。")}
      </p>
    </fieldset>
  )
}
