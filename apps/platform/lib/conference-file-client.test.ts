import { afterEach, describe, expect, it, vi } from "vitest"

describe("organizer file client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("filters file types through the mounted organizer route", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test")
    vi.resetModules()
    const { listOrganizerFiles } = await import("./conference-client")
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, files: [] })))
    vi.stubGlobal("fetch", fetchMock)

    await listOrganizerFiles("owner-token", "conference-1", true, "工作文件")

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.example.test/v1/conferences/conference-1/files?fileType=%E5%B7%A5%E4%BD%9C%E6%96%87%E4%BB%B6"
    )
  })

  it("sends the current conference version when closing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test")
    vi.resetModules()
    const { closeConference } = await import("./conference-client")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          conference: { id: "conference-1", lifecycle: "closed", version: 8 },
        })
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await closeConference("owner-token", "conference-1", 7)

    expect(result.lifecycle).toBe("closed")
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.example.test/v1/conferences/conference-1/close"
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("If-Match")).toBe('"7"')
  })
})
