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
import { injectToRegistry, buildStructuredModData } from './plugin-registry'
import { guessMime } from '$lib/utils/mime'

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg)$/i

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

  // 3. 读取 definitions
  let definitions: string | null = null
  if (manifest.type === 'faction' || manifest.type === 'campaign') {
    definitions = await buildStructuredModData(zip, manifest)
  } else if (manifest.definitions) {
    const defPath =
      typeof manifest.definitions === 'string'
        ? manifest.definitions
        : Object.values(manifest.definitions)[0]
    const defFile = zip.file(defPath)
    if (defFile) {
      definitions = await defFile.async('string')
    } else {
      console.warn(`[ModPackage] manifest 引用的 definitions 文件不存在：${defPath}`)
    }
  }

  // 4. 读取 i18n
  const i18nRecord: Record<string, string> = {}
  if (manifest.i18n) {
    const i18nMap: Record<string, string> =
      typeof manifest.i18n === 'string' ? { default: manifest.i18n } : manifest.i18n
    for (const [locale, path] of Object.entries(i18nMap)) {
      const f = zip.file(path)
      if (f) {
        i18nRecord[locale] = await f.async('string')
      } else {
        console.warn(`[ModPackage] i18n 文件不存在（locale: ${locale}）：${path}`)
      }
    }
  }
  // faction / campaign：额外扫描 i18n/ 或 assets/i18n/ 目录
  if (manifest.type === 'faction' || manifest.type === 'campaign') {
    const i18nFiles = zip.filter(
      (path, f) =>
        !f.dir &&
        (path.startsWith('i18n/') || path.startsWith('assets/i18n/')) &&
        path.endsWith('.json')
    )
    for (const f of i18nFiles) {
      const locale = f.name.split('/').pop()?.replace(/\.json$/i, '') ?? ''
      if (locale && !i18nRecord[locale]) {
        i18nRecord[locale] = await f.async('string')
      }
    }
  }

  // 5. 提取所有图片资源（base64）
  const assets: Array<{ path: string; data: string; mimeType: string }> = []
  const assetKeys: string[] = []
  const imageFiles = zip.filter((_, f) => !f.dir && IMAGE_EXTENSIONS.test(f.name))
  for (const f of imageFiles) {
    const blob = await f.async('blob')
    const buffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    assets.push({
      path: f.name,
      data: base64,
      mimeType: guessMime(f.name)
    })
    assetKeys.push(`${manifest.id}/${f.name}`)
  }

  // 6. 发送到主进程写入文件系统
  const result = await window.veto.plugins.install({
    manifest,
    definitions,
    i18n: i18nRecord,
    assets
  })

  if (!result.success) {
    throw new Error(result.error ?? '安装插件失败')
  }

  // 7. 构建记录并注入运行时 ModRegistry
  const record: InstalledPlugin = {
    id: manifest.id,
    manifest,
    definitions,
    i18n: i18nRecord,
    assetKeys,
    installedAt: Date.now()
  }
  injectToRegistry(record)

  return record
}
