/**
 * storage.test.ts — PluginStorage 集成测试
 *
 * 缝合面：
 * - createPluginStorage(tmpDir) 返回 PluginStorage
 * - set + get 往返一致性
 * - 覆盖写入
 * - delete 行为
 * - keys() 列出所有 key
 * - 读/删不存在的 key → 安全默认值
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock logger（避免 electron 依赖）
vi.mock('../logger')

import { createPluginStorage } from '../storage'

describe('PluginStorage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veto-storage-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── 基本读写 ──────────────────────────────────────────────

  describe('set + get 往返', () => {
    it('写入字符串后读取一致', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('name', 'test-value')
      const val = await storage.get<string>('name')
      expect(val).toBe('test-value')
    })

    it('写入数字后读取一致', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('count', 42)
      const val = await storage.get<number>('count')
      expect(val).toBe(42)
    })

    it('写入对象后读取一致（JSON 序列化往返）', async () => {
      const storage = createPluginStorage(tmpDir)
      const obj = { a: 1, b: [2, 3], c: { d: 'hello' } }
      await storage.set('config', obj)
      const val = await storage.get<typeof obj>('config')
      expect(val).toEqual(obj)
    })

    it('写入 null 后读取一致', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('nil', null)
      const val = await storage.get('nil')
      expect(val).toBeNull()
    })

    it('写入 undefined 会抛出（JSON 不支持 undefined）', async () => {
      const storage = createPluginStorage(tmpDir)
      await expect(storage.set('undef', undefined)).rejects.toThrow()
    })
  })

  // ── 覆盖写入 ─────────────────────────────────────────────

  describe('覆盖写入', () => {
    it('set 同一 key 两次 → get 返回最新值', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('key', 'first')
      await storage.set('key', 'second')
      const val = await storage.get<string>('key')
      expect(val).toBe('second')
    })
  })

  // ── 读不存在的 key ───────────────────────────────────────

  describe('get 不存在的 key', () => {
    it('返回 undefined', async () => {
      const storage = createPluginStorage(tmpDir)
      const val = await storage.get('nonexistent')
      expect(val).toBeUndefined()
    })
  })

  // ── 删除 ─────────────────────────────────────────────────

  describe('delete', () => {
    it('删除存在的 key 后 get 返回 undefined', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('temp', 'data')
      expect(await storage.get('temp')).toBe('data')

      await storage.delete('temp')
      expect(await storage.get('temp')).toBeUndefined()
    })

    it('删除不存在的 key 不抛错（no-op）', async () => {
      const storage = createPluginStorage(tmpDir)
      await expect(storage.delete('nonexistent')).resolves.toBeUndefined()
    })
  })

  // ── keys ──────────────────────────────────────────────────

  describe('keys()', () => {
    it('空存储返回 []', async () => {
      const storage = createPluginStorage(tmpDir)
      const keys = await storage.keys()
      expect(keys).toEqual([])
    })

    it('返回所有已存储的 key', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('a', 1)
      await storage.set('b', 2)
      await storage.set('c', 3)

      const keys = await storage.keys()
      expect(keys.sort()).toEqual(['a', 'b', 'c'])
    })

    it('删除后 keys 不再包含该 key', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('x', 1)
      await storage.set('y', 2)
      await storage.delete('x')

      const keys = await storage.keys()
      expect(keys).toEqual(['y'])
    })

    it('不包含 .json 后缀（纯 key 名）', async () => {
      const storage = createPluginStorage(tmpDir)
      await storage.set('my-key', 'val')

      const keys = await storage.keys()
      expect(keys).toEqual(['my-key'])
      // 验证文件名不含 .json 后缀污染
      expect(keys.every((k) => !k.endsWith('.json'))).toBe(true)
    })
  })

  // ── Key 消毒 ─────────────────────────────────────────────

  describe('key 文件名消毒', () => {
    it('路径分隔符被替换为下划线，防止目录穿越', async () => {
      const storage = createPluginStorage(tmpDir)
      // 包含路径穿越字符的 key：斜杠被替换为 _
      await storage.set('../../../etc/passwd', 'dangerous')

      // 读写正常（key 被消毒后仍可正常存取）
      const val = await storage.get('../../../etc/passwd')
      expect(val).toBe('dangerous')

      // 验证文件安全地保存在 storage 子目录内
      const storageDir = path.join(tmpDir, 'storage')
      const files = fs.readdirSync(storageDir)
      expect(files.length).toBe(1)

      // 文件名中不应包含路径分隔符（/ 和 \ 被替换）
      expect(files[0]).not.toContain('/')
      expect(files[0]).not.toContain('\\')

      // 验证文件未越出 storage 目录（消毒后 .. 没有 / 配合无法穿越）
      const filePath = path.join(storageDir, files[0])
      expect(filePath.startsWith(storageDir)).toBe(true)
    })

    it('合法字符（字母、数字、._-）保持不变', async () => {
      const storage = createPluginStorage(tmpDir)
      const safeKey = 'config.ui.theme-v2_test'
      await storage.set(safeKey, 'ok')
      const val = await storage.get(safeKey)
      expect(val).toBe('ok')
    })
  })
})
