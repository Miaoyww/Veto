const CACHE_TTL_MS = 30_000
const MAX_ENTRIES_PER_TOKEN = 100

interface ApiCacheEntry {
  value: unknown
  expiresAt: number
}

type ApiCacheStore = Map<string, Map<string, ApiCacheEntry>>

const globalCache = globalThis as typeof globalThis & {
  __vetoPlatformApiCache__?: ApiCacheStore
}

const cacheStore: ApiCacheStore =
  globalCache.__vetoPlatformApiCache__ ?? new Map()
globalCache.__vetoPlatformApiCache__ = cacheStore

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function pruneTokenCache(tokenCache: Map<string, ApiCacheEntry>): void {
  const now = Date.now()
  for (const [path, entry] of tokenCache) {
    if (entry.expiresAt <= now) tokenCache.delete(path)
  }
  while (tokenCache.size > MAX_ENTRIES_PER_TOKEN) {
    const oldest = [...tokenCache.entries()].sort(
      ([, left], [, right]) => left.expiresAt - right.expiresAt
    )[0]
    if (!oldest) break
    tokenCache.delete(oldest[0])
  }
}

export function readApiCache<T>(token: string, path: string): T | undefined {
  const tokenCache = cacheStore.get(token)
  const entry = tokenCache?.get(path)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    tokenCache?.delete(path)
    return undefined
  }
  return cloneValue(entry.value) as T
}

export function writeApiCache<T>(token: string, path: string, value: T): void {
  const tokenCache = cacheStore.get(token) ?? new Map()
  tokenCache.set(path, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  pruneTokenCache(tokenCache)
  cacheStore.set(token, tokenCache)
}

export function clearApiCache(): void {
  cacheStore.clear()
}
