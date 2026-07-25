/**
 * plugin-storage-ipc.ts — 主进程文件系统存储实现
 *
 * 通过 window.veto IPC 与主进程通信，插件数据存储在 {userData}/Plugins/ 目录。
 * 资源文件通过 base64 编码传输。
 */
import type { PluginStorage } from './plugin-storage'
import { onPluginListChanged as notifyChanged } from './plugin-storage'
import type { InstalledPlugin, ModAsset } from '../plugin-db'

/**
 * IPC 文件系统存储实现
 *
 * 插件元数据和资源文件由主进程管理，存储在 Electron userData/Plugins/ 目录。
 * 渲染进程通过 window.veto API 进行所有操作。
 */
export class IpcPluginStorage implements PluginStorage {
  // ─── Plugin 元数据存储 ──────────────────────────────────────────────

  async savePlugin(plugin: InstalledPlugin): Promise<void> {
    // 资源文件已在 installPlugin 中批量发送，此处仅作元数据更新
    // 如果只是更新元数据（不涉及资源），构造轻量 payload
    const assets: Array<{ path: string; data: string; mimeType: string }> = []

    const result = await window.veto.plugins.install({
      manifest: plugin.manifest as unknown as Record<string, unknown>,
      definitions: plugin.definitions,
      i18n: plugin.i18n,
      assets
    })

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to save plugin')
    }

    notifyChanged?.()
  }

  async getPlugin(id: string): Promise<InstalledPlugin | undefined> {
    const data = await window.veto.plugins.get(id)
    if (!data) return undefined

    return {
      id: data.manifest.id as string,
      manifest: data.manifest as InstalledPlugin['manifest'],
      definitions: data.definitions,
      i18n: data.i18n ?? {},
      assetKeys: [],
      installedAt: 0, // 主进程不追踪此字段
      campaignFiles: data.campaignFiles as Record<string, string> | undefined,
      delegations: (data as Record<string, unknown>).delegations as string | null | undefined
    }
  }

  async getAllPlugins(): Promise<InstalledPlugin[]> {
    const list = await window.veto.plugins.list()
    const plugins: InstalledPlugin[] = []

    for (const item of list) {
      if (item.disabled) continue
      // 需要 definitions、delegations 或 i18n 中至少有一项
      if (!(item as any).hasDefinitions && !(item as any).hasDelegations && !(item as any).hasI18n) continue

      const detail = await window.veto.plugins.get(item.id)
      // 有 definitions 或 delegations 即视为有效
      const hasContent = detail?.definitions || (detail as any)?.delegations

      if (hasContent) {
        plugins.push({
          id: item.id,
          manifest: detail.manifest as InstalledPlugin['manifest'],
          definitions: detail.definitions,
          i18n: detail.i18n ?? {},
          assetKeys: [],
          installedAt: 0,
          campaignFiles: detail.campaignFiles as Record<string, string> | undefined,
          delegations: (detail as Record<string, unknown>).delegations as string | null | undefined
        })
      }
    }

    return plugins
  }

  async deletePlugin(id: string): Promise<void> {
    await window.veto.plugins.uninstall(id)
    notifyChanged?.()
  }

  async isInstalled(id: string): Promise<boolean> {
    const list = await window.veto.plugins.list()
    return list.some((p) => p.id === id)
  }

  // ─── Asset 资源存储 ────────────────────────────────────────────────

  async saveAsset(_asset: ModAsset): Promise<void> {
    // 资源随 install 调用批量写入，此方法在 IPC 架构下为空操作
  }

  async getAsset(key: string): Promise<ModAsset | undefined> {
    // key 格式："{pluginId}/{assetPath}"
    const parts = key.split('/')
    const pluginId = parts[0]!
    const assetPath = parts.slice(1).join('/')

    const result = await window.veto.assets.get(pluginId, assetPath)
    if (!result) return undefined

    // 将 base64 转回 Blob
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

    // base64 → blob URL
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
