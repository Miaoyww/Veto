"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function usePlatformAuth() {
  const router = useRouter()
  const [token, setToken] = useState<string>()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem("veto_token")
    if (!savedToken) {
      router.replace("/login")
      return
    }
    setToken(savedToken)
    setIsReady(true)
  }, [router])

  const signOut = useCallback(() => {
    localStorage.removeItem("veto_token")
    router.replace("/login")
  }, [router])

  return { token, isReady, signOut }
}
