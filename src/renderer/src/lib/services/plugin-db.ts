/**
 * plugin-db.ts — 插件持久化层，通过主进程文件系统存储用户已安装的插件数据。
 *
 * DB: {userData}/Plugins/  (主进程 fs)
 */

import { writable } from 'svelte/store'
import { getPluginStorage, initPluginStorage } from './plugin-storage/plugin-storage-factory'
import { setPluginListChangeCallback } from './plugin-storage/plugin-storage'

// ─── 导出新 API ────────────────────────────────────────────────────
export { getPluginStorage, initPluginStorage } from './plugin-storage/plugin-storage-factory'
export type { PluginStorage } from './plugin-storage/plugin-storage'

/**
 * 存储初始化状态和错误信息
 */
export const storageInitialized = writable(false)
export const storageError = writable<string | null>(null)

/**
 * 每次保存/删除插件后递增。
 * 组件订阅此 store 即可响应式感知已安装列表变化。
 */
export const installedPluginsRevision = writable(0)

// ─── 初始化存储和响应式回调 ──────────────────────────────────────

initPluginStorage()
  .then(() => {
    storageInitialized.set(true)
    console.log('[plugin-db] Storage initialized successfully')
  })
  .catch((err) => {
    const errorMsg = err instanceof Error ? err.message : String(err)
    storageError.set(errorMsg)
    console.error('[plugin-db] Failed to initialize storage:', err)
  })

setPluginListChangeCallback(() => {
  installedPluginsRevision.update((n) => n + 1)
})

/**
 * 等待存储初始化完成，超时时间为 5 秒。
 */
export async function ensureStorageInitialized(): Promise<void> {
  let initialized: boolean
  storageInitialized.subscribe((v) => {
    initialized = v
  })()

  if (initialized) return

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('Storage initialization timeout'))
    }, 5000)

    const unsubscribe = storageInitialized.subscribe((initialized) => {
      if (initialized) {
        clearTimeout(timeout)
        unsubscribe()
        resolve()
      }
    })

    storageError.subscribe((error) => {
      if (error) {
        clearTimeout(timeout)
        unsubscribe()
        reject(new Error(`Storage initialization failed: ${error}`))
      }
    })
  })
}

export interface InstalledPlugin {
  id: string
  manifest: PluginManifest
  /** definitions.json 的原始内容（字符串，按需解析） */
  definitions: string | null
  /** i18n locale → JSON 字符串 */
  i18n: Record<string, string>
  /** 已存入资源文件的 key 列表（格式："{pluginId}/{assetPath}"） */
  assetKeys: string[]
  installedAt: number
  /** 战役资源文件内容（type='campaign' 时有效） */
  campaignFiles?: Record<string, string>
}

/** dist/registry.json 中每个条目的结构（manifest 字段 + 注册中心元数据） */
export interface PluginManifest {
  manifest_version: number
  id: string
  name: string
  version: string
  author: string
  type: 'faction' | 'scenario' | 'ruleset' | 'campaign' | 'utility' | 'dependency'
  /** .vmod 包的下载地址 */
  download_url?: string
  /** 包文件的 SHA-256 十六进制哈希，用于完整性校验 */
  repo: string
  hash?: string
  preview?: string
  description?: string
  min_engine_version?: string
  definitions?: string | Record<string, string>
  i18n?: string | Record<string, string>
  dependencies?: string[]
  tags?: string[]
  license?: string
}

/** Blob 资源条目（图片、地图底图等） */
export interface ModAsset {
  /** 格式："{pluginId}/{assetPath}"，如 "my-mod/assets/map.png" */
  key: string
  blob: Blob
  mimeType: string
}

// ─── 兼容性包装函数 ────────────────────────────────────────────

export async function dbSavePlugin(plugin: InstalledPlugin): Promise<void> {
  await ensureStorageInitialized()
  return await getPluginStorage().savePlugin(plugin)
}

export async function dbGetPlugin(id: string): Promise<InstalledPlugin | undefined> {
  await ensureStorageInitialized()
  return await getPluginStorage().getPlugin(id)
}

export async function dbGetAllPlugins(): Promise<InstalledPlugin[]> {
  await ensureStorageInitialized()
  return await getPluginStorage().getAllPlugins()
}

export async function dbDeletePlugin(id: string): Promise<void> {
  await ensureStorageInitialized()
  await getPluginStorage().deletePlugin(id)
}

export async function dbIsInstalled(id: string): Promise<boolean> {
  await ensureStorageInitialized()
  return await getPluginStorage().isInstalled(id)
}

export async function dbSaveAsset(asset: ModAsset): Promise<void> {
  await getPluginStorage().saveAsset(asset)
}

export async function dbGetAsset(key: string): Promise<ModAsset | undefined> {
  return await getPluginStorage().getAsset(key)
}

export async function dbGetAssetUrl(key: string): Promise<string | null> {
  return await getPluginStorage().getAssetUrl(key)
}

export async function dbDeletePluginAssets(assetKeys: string[]): Promise<void> {
  await getPluginStorage().deleteAssets(assetKeys)
}
