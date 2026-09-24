"use client"

import { useEffect, useState } from "react"

import { AuthError, fetchMe, readCachedUser, type PlatformUser } from "@/lib/auth-client"

export function usePlatformUser(
  token: string | undefined,
  onUnauthorized?: () => void
) {
  const [user, setUser] = useState<PlatformUser | undefined>(() =>
    token ? readCachedUser(token) : undefined
  )
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return

    const cached = readCachedUser(token)
    if (cached) {
      setUser(cached)
      return
    }

    let cancelled = false
    fetchMe(token)
      .then((result) => {
        if (!cancelled) setUser(result)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        if (caught instanceof AuthError && caught.status === 401) {
          onUnauthorized?.()
          return
        }
        setError(caught instanceof Error ? caught.message : "加载用户信息失败")
      })
    return () => {
      cancelled = true
    }
  }, [token, onUnauthorized])

  return { user, error }
}
