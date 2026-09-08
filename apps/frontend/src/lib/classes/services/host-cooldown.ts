export const HOST_COOLDOWN_MIN_MS = 2000
export const HOST_COOLDOWN_MAX_MS = 3000

export function createHostCooldownDuration(random = Math.random): number {
  const sample = Math.min(Math.max(random(), 0), 0.999999999)
  return (
    HOST_COOLDOWN_MIN_MS + Math.floor(sample * (HOST_COOLDOWN_MAX_MS - HOST_COOLDOWN_MIN_MS + 1))
  )
}

/** Keep lifecycle controls locked briefly after a successful Host command. */
export function waitForHostCooldown(
  signal: AbortSignal,
  durationMs = createHostCooldownDuration()
): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      resolve()
    }, durationMs)
    const onAbort = () => {
      cleanup()
      reject(signal.reason)
    }
    const cleanup = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
