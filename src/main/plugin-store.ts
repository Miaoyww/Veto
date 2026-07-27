/**
 * plugin-store.ts — 插件配置持久化（{userData}/plugin-config.json）
 *
 * 存储内容：
 * - disabled: 禁用的插件 slug 列表
 * - order: 加载顺序（可选，默认按拓扑排序）
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createLogger } from './logger'

const log = createLogger('PluginStore')

/** 插件配置结构 */
export interface PluginConfig {
  /** 禁用的插件 ID 列表 */
  disabled: string[]
  /** 加载顺序（可选，默认按拓扑排序） */
  order?: string[]
}

const CONFIG_FILENAME = 'plugin-config.json'

/** 获取配置文件路径 */
function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILENAME)
}

/** 默认配置 */
const DEFAULT_CONFIG: PluginConfig = {
  disabled: [],
  order: []
}

/** 读取插件配置 */
export function loadPluginConfig(): PluginConfig {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    log.info('No config file found, using defaults')
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PluginConfig>
    return {
      disabled: parsed.disabled ?? [],
      order: parsed.order ?? []
    }
  } catch (err) {
    log.error('Failed to read config, using defaults:', err)
    return { ...DEFAULT_CONFIG }
  }
}

/** 保存插件配置 */
export function savePluginConfig(config: PluginConfig): void {
  const configPath = getConfigPath()

  try {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    log.info('Config saved')
  } catch (err) {
    log.error('Failed to save config:', err)
    throw err
  }
}

/** 启用插件 */
export function enablePlugin(pluginId: string): void {
  const config = loadPluginConfig()
  config.disabled = config.disabled.filter((id) => id !== pluginId)
  savePluginConfig(config)
}

/** 禁用插件 */
export function disablePlugin(pluginId: string): void {
  const config = loadPluginConfig()
  if (!config.disabled.includes(pluginId)) {
    config.disabled.push(pluginId)
    savePluginConfig(config)
  }
}
