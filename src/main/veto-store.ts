/**
 * veto-store.ts — 应用数据文件持久化
 *
 * 将会议、战局、全局设置等数据存储在 {appData}/Veto/store/ 目录下
 * （Windows 上即 %APPDATA%/Veto/store/），所有 Veto 实例共享。
 *
 * 存储内容：
 * - conferences.json   — 所有模拟大会数据
 * - battles.json       — 所有推演战局数据
 * - settings.json      — 全局设置（语言、图标风格、主题等）
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** 数据域 */
export type StoreDomain = 'conferences' | 'battles' | 'settings'

/** 数据域 → 文件名映射 */
const FILES: Record<StoreDomain, string> = {
  conferences: 'conferences.json',
  battles: 'battles.json',
  settings: 'settings.json'
}

/** 获取存储根目录 */
function getStoreDir(): string {
  return path.join(app.getPath('appData'), 'Veto', 'store')
}

/** 获取指定数据域的完整文件路径 */
function getFilePath(domain: StoreDomain): string {
  return path.join(getStoreDir(), FILES[domain])
}

/** 读取数据 */
export function loadStore<T>(domain: StoreDomain): T | null {
  const filePath = getFilePath(domain)

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`[VetoStore] Failed to read ${domain}:`, err)
    return null
  }
}

/** 保存数据 */
export function saveStore<T>(domain: StoreDomain, data: T): void {
  const dir = getStoreDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filePath = getFilePath(domain)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`[VetoStore] Failed to save ${domain}:`, err)
    throw err
  }
}

/** 删除数据 */
export function deleteStore(domain: StoreDomain): void {
  const filePath = getFilePath(domain)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[VetoStore] Deleted ${domain}`)
    }
  } catch (err) {
    console.error(`[VetoStore] Failed to delete ${domain}:`, err)
  }
}

/**
 * 从 localStorage 迁移数据到文件（仅当文件不存在时写入）
 * 用于首次升级时的数据迁移
 */
export function migrateFromLocalStorage(domain: StoreDomain, jsonData: string): void {
  // 如果文件已存在则跳过（不覆盖已有数据）
  if (loadStore(domain) !== null) {
    console.log(`[VetoStore] ${domain} file exists, skip migration`)
    return
  }

  try {
    JSON.parse(jsonData) // 验证 JSON 合法性
    saveStore(domain, JSON.parse(jsonData))
    console.log(`[VetoStore] Migrated ${domain} from localStorage`)
  } catch (err) {
    console.warn(`[VetoStore] Invalid data during ${domain} migration:`, err)
  }
}
