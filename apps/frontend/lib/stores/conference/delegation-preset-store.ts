/**
 * delegation-preset-store.ts
 * ──────────────────────────────────────────────
 * 代表团预设 Store — 从所有已安装插件中收集代表团（国家/组织）预设，
 * 供创建大会对话框使用。
 */

import { writable, get } from 'svelte/store'
import {
  dbGetAllPlugins,
  installedPluginsRevision,
  ensureStorageInitialized
} from '$lib/services/plugin-db'

// ---- 类型 ----

export interface DelegationPresetEntry {
  name: string
  shortName?: string
  flagUrl?: string
  /** 是否拥有投票权（默认 true，false 即为观察员） */
  vetoPower?: boolean
}

export interface DelegationPreset {
  /** 来源插件 ID */
  pluginId: string
  /** 来源插件名称 */
  pluginName: string
  /** 预设 ID */
  presetId: string
  /** 预设名称 */
  presetName: string
  /** 预设描述 */
  description?: string
  /** 代表团列表 */
  delegations: DelegationPresetEntry[]
}

/** delegations.json 的顶层结构 */
interface DelegationsFile {
  presets?: Array<{
    id: string
    name: string
    description?: string
    delegations: DelegationPresetEntry[]
  }>
}

// ---- Store ----

/** 所有可用的代表团预设 */
export const delegationPresets = writable<DelegationPreset[]>([])

/** 是否正在加载 */
export const presetsLoading = writable(false)

/** 是否已加载完成 */
export const presetsLoaded = writable(false)

// ---- 加载逻辑 ----

function parseDelegationsJson(
  pluginId: string,
  pluginName: string,
  jsonStr: string
): DelegationPreset[] {
  try {
    const data = JSON.parse(jsonStr) as DelegationsFile

    // 格式：{ "presets": [...] }
    if (data.presets && Array.isArray(data.presets)) {
      return data.presets.map((p) => ({
        pluginId,
        pluginName,
        presetId: p.id ?? '',
        presetName: p.name ?? p.id ?? '',
        description: p.description,
        delegations: p.delegations ?? []
      }))
    }

    return []
  } catch {
    console.warn(`[DelegationPresets] 无法解析插件 "${pluginId}" 的 delegations.json`)
    return []
  }
}

/** 从所有已安装插件加载代表团预设 */
export async function loadDelegationPresets(): Promise<void> {
  if (get(presetsLoading)) return

  presetsLoading.set(true)

  try {
    await ensureStorageInitialized()
    const plugins = await dbGetAllPlugins()
    const allPresets: DelegationPreset[] = []

    for (const plugin of plugins) {
      if (plugin.delegations) {
        const presets = parseDelegationsJson(
          plugin.id,
          plugin.manifest.name,
          plugin.delegations
        )
        allPresets.push(...presets)
      }
    }

    delegationPresets.set(allPresets)
    presetsLoaded.set(true)
  } catch (err) {
    console.error('[DelegationPresets] 加载预设失败:', err)
  } finally {
    presetsLoading.set(false)
  }
}

// ---- 格式化工具 ----

/** 将预设格式化为 textarea 文本（全称,简称[,observer] 每行一个） */
export function formatPresetAsText(preset: DelegationPreset): string {
  return preset.delegations
    .map((d) => {
      let line = d.name
      if (d.shortName) line += `,${d.shortName}`
      if (d.vetoPower === false) line += ',observer'
      return line
    })
    .join('\n')
}

// ---- 自动刷新 ----

// 当插件列表变化时（安装/卸载），自动重新加载预设
let _revisionUnsub: (() => void) | null = null

export function startAutoRefresh(): void {
  if (_revisionUnsub) return
  _revisionUnsub = installedPluginsRevision.subscribe(() => {
    // 只有在已经加载过的情况下才自动刷新
    if (get(presetsLoaded)) {
      loadDelegationPresets()
    }
  })
}

export function stopAutoRefresh(): void {
  if (_revisionUnsub) {
    _revisionUnsub()
    _revisionUnsub = null
  }
}
