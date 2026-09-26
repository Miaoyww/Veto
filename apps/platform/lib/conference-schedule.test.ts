import { describe, expect, it } from "vitest"
import {
  FILE_RETENTION_MS,
  filesExpired,
  scheduleError,
  scheduleInput,
  scheduleInstant,
} from "./conference-schedule"

describe("conference schedule", () => {
  it("round trips UTC instants through the UTC+8 editor without losing precision", () => {
    const instant = "2026-10-03T10:00:25.123Z"
    expect(scheduleInput(instant)).toBe("2026-10-03T18:00:25.123")
    expect(scheduleInstant(scheduleInput(instant))).toBe(instant)
    expect(scheduleInstant("")).toBeNull()
    expect(scheduleInput(null)).toBe("")
  })
  it("allows optional dates but rejects equal, reversed and invalid ranges", () => {
    expect(scheduleError("", "2026-10-03T18:00")).toBe("")
    expect(scheduleError("2026-10-03T18:00", "")).toBe("")
    expect(scheduleError("2026-10-03T18:00", "2026-10-03T18:00")).not.toBe("")
    expect(scheduleError("2026-10-04T18:00", "2026-10-03T18:00")).not.toBe("")
    expect(scheduleError("invalid", "")).not.toBe("")
  })
  it("expires at exactly 72 hours and respects irreversible cleanup", () => {
    const end = Date.parse("2026-10-03T10:00:00Z")
    const deadline = new Date(end + FILE_RETENTION_MS).toISOString()
    expect(deadline).toBe("2026-10-06T10:00:00.000Z")
    expect(filesExpired(deadline, null, end + FILE_RETENTION_MS - 1)).toBe(
      false
    )
    expect(filesExpired(deadline, null, end + FILE_RETENTION_MS)).toBe(true)
    expect(filesExpired(null, null)).toBe(false)
    expect(filesExpired(null, "2026-10-06T10:00:00Z")).toBe(true)
  })
})
