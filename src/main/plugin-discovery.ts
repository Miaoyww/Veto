/**
 * plugin-discovery.ts — 扫描 {userData}/plugins/ 目录，发现已安装插件
 *
 * 对齐 LiteLoaderQQNT 的 scanPluginDirectory() 模式：
 * - 遍历 plugins/ 下的每个子目录
 * - 读取 manifest.json 确认插件身份
 * - 返回 PluginInstance 列表供后续加载
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** 插件清单信息（从 manifest.json 解析） */
export interface PluginManifest {
  manifest_version: number
  id: string
  name: string
  version: string
  author: string
  type: 'faction' | 'scenario' | 'ruleset' | 'campaign' | 'utility' | 'dependency'
  download_url?: string
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
  /** 插件注入点（Phase 2+ 使用） */
  injects?: {
    formulas?: string // "./injects/formulas.js"
    events?: string // "./injects/events.js"
    ui?: string // "./injects/ui.js"  
  }
}

/** 插件实例（扫描发现后的内存表示） */
export interface PluginInstance {
  manifest: PluginManifest
  path: {
    /** 插件根目录（如 {userData}/Plugins/my-faction） */
    plugin: string
    /** definitions.json 的绝对路径 */
    definitions?: string
    /** i18n 目录的绝对路径 */
    i18n?: string
    /** assets 目录的绝对路径 */
    assets?: string
  }
  /** 是否被用户禁用 */
  disabled: boolean
  /** 是否与当前引擎版本不兼容 */
  incompatible: boolean
}

/** 获取插件根目录 */
export function getPluginsDir(): string {
  return path.join(app.getPath('userData'), 'Plugins')
}

/** 确保插件目录存在 */
export function ensurePluginsDir(): string {
  const dir = getPluginsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * 扫描 plugins/ 目录，返回发现的插件列表。
 * 不加载插件内容，仅收集元数据。
 */
export function scanPluginDirectory(): PluginInstance[] {
  const pluginsDir = getPluginsDir()

  if (!fs.existsSync(pluginsDir)) {
    console.log('[PluginDiscovery] Plugins directory does not exist, creating...')
    fs.mkdirSync(pluginsDir, { recursive: true })
    return []
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
  const plugins: PluginInstance[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const pluginDir = path.join(pluginsDir, entry.name)
    const manifestPath = path.join(pluginDir, 'manifest.json')

    if (!fs.existsSync(manifestPath)) {
      console.warn(`[PluginDiscovery] Skipping ${entry.name}: no manifest.json`)
      continue
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as PluginManifest

      if (!manifest.id?.trim() || !manifest.name?.trim()) {
        console.warn(`[PluginDiscovery] Skipping ${entry.name}: invalid manifest (missing id/name)`)
        continue
      }

      const definitionsPath = path.join(pluginDir, 'definitions.json')
      const i18nPath = path.join(pluginDir, 'i18n')
      const assetsPath = path.join(pluginDir, 'assets')

      plugins.push({
        manifest,
        path: {
          plugin: pluginDir,
          definitions: fs.existsSync(definitionsPath) ? definitionsPath : undefined,
          i18n: fs.existsSync(i18nPath) ? i18nPath : undefined,
          assets: fs.existsSync(assetsPath) ? assetsPath : undefined
        },
        disabled: false,
        incompatible: false
      })
    } catch (err) {
      console.error(`[PluginDiscovery] Failed to read manifest for ${entry.name}:`, err)
    }
  }

  console.log(`[PluginDiscovery] Found ${plugins.length} plugin(s) in ${pluginsDir}`)
  return plugins
}
