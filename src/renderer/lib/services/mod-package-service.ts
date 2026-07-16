/**
 * mod-package-service.ts — 本地 .csmod 包导入服务。
 *
 * .csmod 文件本质是 ZIP 压缩包，内部结构：
 *   manifest.json          — 必须（描述 mod 元数据）
 *   definitions.json       — 可选（ModData，路径由 manifest.definitions 指定）
 *   i18n/zh-cn.json        — 可选（路径由 manifest.i18n 指定）
 *   assets/*.png/jpg/...   — 可选（自动扫描并写入主进程文件系统）
 */
import JSZip from 'jszip'
import type { InstalledPlugin, PluginManifest } from './plugin-db'
import { processModPackage } from './plugin-registry'

/**
 * 从本地 .csmod 文件解析并安装 Mod。
 *
 * @param file — 用户选择或拖拽的 .csmod 文件
 * @returns 安装后的 InstalledPlugin 记录
 * @throws 解析或校验失败时抛出含用户可读消息的 Error
 */
export async function importModPackage(file: File): Promise<InstalledPlugin> {
  // 1. 解压 ZIP
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('无法解析文件：请确认上传的是有效的 .csmod 压缩包')
  }

  // 2. 读取并校验 manifest.json
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    throw new Error('缺少 manifest.json：该文件不是有效的 Mod 包')
  }

  let manifest: PluginManifest
  try {
    const raw = await manifestFile.async('string')
    manifest = JSON.parse(raw) as PluginManifest
  } catch {
    throw new Error('manifest.json 格式错误：内容不是合法的 JSON')
  }

  if (!manifest.id?.trim()) {
    throw new Error('manifest.json 缺少必填字段 "id"')
  }
  if (!manifest.name?.trim()) {
    throw new Error('manifest.json 缺少必填字段 "name"')
  }
  if (!manifest.version?.trim()) {
    throw new Error('manifest.json 缺少必填字段 "version"')
  }

  // 3. 共用包处理逻辑
  return processModPackage(zip, manifest)
}
