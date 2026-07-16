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
  /** 战役：地图配置文件路径 */
  mapConfig?: string
  /** 战役：初始部署文件路径 */
  deployments?: string
  /** 战役：设施配置文件路径 */
  facilities?: string
  /** 战役：事件配置文件路径 */
  events?: string
}

/** 插件实例（扫描发现后的内存表示） */
export interface PluginInstance {
  manifest: PluginManifest
  path: {
    /** 插件根目录（如 {userData}/Plugins/my-faction） */
    plugin: string
    /** definitions.json 的绝对路径，或 definitions/ 目录的绝对路径 */
    definitions?: string
    /** definitions 是否为目录（true=目录扫描合并，false=单文件） */
    definitionsIsDir?: boolean
    /** i18n 目录的绝对路径 */
    i18n?: string
    /** assets 目录的绝对路径 */
    assets?: string
    /** 战役：map.json 绝对路径 */
    mapConfig?: string
    /** 战役：deployments.json 绝对路径 */
    deployments?: string
    /** 战役：facilities.json 绝对路径 */
    facilities?: string
    /** 战役：events.json 绝对路径 */
    events?: string
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
      const definitionsDirPath = path.join(pluginDir, 'definitions')
      const i18nPath = path.join(pluginDir, 'i18n')
      const assetsPath = path.join(pluginDir, 'assets')

      // 检测 definitions 是单文件还是目录
      let definitionsFinal: string | undefined
      let definitionsIsDir = false
      if (fs.existsSync(definitionsDirPath) && fs.statSync(definitionsDirPath).isDirectory()) {
        definitionsFinal = definitionsDirPath
        definitionsIsDir = true
      } else if (fs.existsSync(definitionsPath)) {
        definitionsFinal = definitionsPath
        definitionsIsDir = false
      } else if (typeof manifest.definitions === 'string' && manifest.definitions.endsWith('/')) {
        // manifest 声明为目录但目录不存在 → 记录路径但不保证存在
        definitionsFinal = path.join(pluginDir, manifest.definitions)
        definitionsIsDir = true
      } else if (typeof manifest.definitions === 'string') {
        // manifest 声明为单文件
        definitionsFinal = path.join(pluginDir, manifest.definitions)
        definitionsIsDir = false
      }

      // 战役资源文件检测
      const getCampaignPath = (manifestPath: string | undefined, defaultName: string): string | undefined => {
        if (manifestPath) {
          const fullPath = path.join(pluginDir, manifestPath)
          return fs.existsSync(fullPath) ? fullPath : undefined
        }
        const defaultPath = path.join(pluginDir, defaultName)
        return fs.existsSync(defaultPath) ? defaultPath : undefined
      }

      const instancePath = {
        plugin: pluginDir,
        definitions: definitionsFinal,
        definitionsIsDir,
        i18n: fs.existsSync(i18nPath) ? i18nPath : undefined,
        assets: fs.existsSync(assetsPath) ? assetsPath : undefined,
        mapConfig: getCampaignPath(manifest.mapConfig, 'map.json'),
        deployments: getCampaignPath(manifest.deployments, 'deployments.json'),
        facilities: getCampaignPath(manifest.facilities, 'facilities.json'),
        events: getCampaignPath(manifest.events, 'events.json')
      }

      plugins.push({
        manifest,
        path: instancePath,
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
