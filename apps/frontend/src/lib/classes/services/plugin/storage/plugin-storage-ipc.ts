/**
 * plugin-storage-ipc.ts — 主进程文件系统存储实现
 *
 * 通过 window.veto IPC 与主进程通信，插件数据存储在 {userData}/Plugins/ 目录。
 * 资源文件通过 base64 编码传输。
 */
import type { PluginStorage } from './plugin-storage'
import { onPluginListChanged as notifyChanged } from './plugin-storage'
import type { InstalledPlugin, PluginManifest, PluginDetail, ModAsset } from '../plugin-db'

/** veto:plugins:list 返回的条目 */
interface PluginListItem {
  id: string
  name: string
  version: string
  author: string
  type: PluginManifest['type']
  description?: string
  disabled: boolean
  incompatible: boolean
  dependencies?: string[]
  injects?: { formulas?: string; events?: string; ui?: string }
  hasDefinitions: boolean
  hasI18n: boolean
  hasAssets: boolean
  hasSeats: boolean
  hasService: boolean
}

/** 判断给定类型的插件是否需要 definitions */
function typeNeedsDefinitions(type: PluginManifest['type']): boolean {
  return type === 'faction' || type === 'campaign'
}

/** 判断插件是否值得加载（有对应类型的数据） */
function shouldLoadPlugin(item: PluginListItem): boolean {
  if (typeNeedsDefinitions(item.type)) {
    return item.hasDefinitions || item.hasI18n
  }
  // utility / dependency：有 seats 或 service 入口即可
  return item.hasSeats || item.hasService
}

/** 将 IPC 返回的 detail 转换为 InstalledPlugin */
function detailToPlugin(data: PluginDetail): InstalledPlugin {
  return {
    id: data.manifest.id,
    manifest: data.manifest,
    definitions: data.definitions,
    i18n: data.i18n ?? {},
    assetKeys: [],
    installedAt: 0,
    campaignFiles: data.campaignFiles,
    seats: data.seats
  }
}

/**
 * IPC 文件系统存储实现
 *
 * 插件元数据和资源文件由主进程管理，存储在 Electron userData/Plugins/ 目录。
 * 渲染进程通过 window.veto API 进行所有操作。
 */
export class IpcPluginStorage implements PluginStorage {
  // ─── Plugin 元数据存储 ──────────────────────────────────────────────

  async savePlugin(plugin: InstalledPlugin): Promise<void> {
    const assets: Array<{ path: string; data: string; mimeType: string }> = []

    const result = await window.veto.plugins.install({
      manifest: plugin.manifest as unknown as Record<string, unknown>,
      definitions: plugin.definitions,
      i18n: plugin.i18n,
      assets,
      seats: plugin.seats
    })

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to save plugin')
    }

    notifyChanged?.()
  }

  async getPlugin(id: string): Promise<InstalledPlugin | undefined> {
    const data = (await window.veto.plugins.get(id)) as PluginDetail | null
    if (!data) return undefined
    return detailToPlugin(data)
  }

  async getAllPlugins(): Promise<InstalledPlugin[]> {
    const list = (await window.veto.plugins.list()) as PluginListItem[]
    const plugins: InstalledPlugin[] = []

    for (const item of list) {
      if (item.disabled || !shouldLoadPlugin(item)) continue

      const data = (await window.veto.plugins.get(item.id)) as PluginDetail | null
      if (!data) continue

      // 按类型验证数据完整性
      const type = data.manifest.type
      const hasContent =
        typeNeedsDefinitions(type)
          ? !!data.definitions
          : (!!data.seats || !!data.hasService)

      if (hasContent) {
        plugins.push(detailToPlugin(data))
      }
    }

    return plugins
  }

  async deletePlugin(id: string): Promise<void> {
    await window.veto.plugins.uninstall(id)
    notifyChanged?.()
  }

  async isInstalled(id: string): Promise<boolean> {
    const list = (await window.veto.plugins.list()) as PluginListItem[]
    return list.some((p) => p.id === id)
  }

  // ─── Asset 资源存储 ────────────────────────────────────────────────

  async saveAsset(_asset: ModAsset): Promise<void> {
    // 资源随 install 调用批量写入，此方法在 IPC 架构下为空操作
  }

  async getAsset(key: string): Promise<ModAsset | undefined> {
    const parts = key.split('/')
    const pluginId = parts[0]!
    const assetPath = parts.slice(1).join('/')

    const result = await window.veto.assets.get(pluginId, assetPath)
    if (!result) return undefined

    const binaryStr = atob(result.data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    return {
      key,
      blob: new Blob([bytes], { type: result.mimeType }),
      mimeType: result.mimeType
    }
  }

  async getAssetUrl(key: string): Promise<string | null> {
    const parts = key.split('/')
    const pluginId = parts[0]!
    const assetPath = parts.slice(1).join('/')

    const result = await window.veto.assets.get(pluginId, assetPath)
    if (!result) return null

    const binaryStr = atob(result.data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: result.mimeType })
    return URL.createObjectURL(blob)
  }

  async deleteAsset(_key: string): Promise<void> {
    // 资源随插件卸载一起删除
  }

  async deleteAssets(_keys: string[]): Promise<void> {
    // 资源随插件卸载一起删除
  }
}
