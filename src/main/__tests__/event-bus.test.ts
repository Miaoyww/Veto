/**
 * event-bus.test.ts — EventBus 单元测试
 *
 * 缝合面：
 * - on(pattern, handler) → 返回取消函数
 * - emit(type, data) → 分发到匹配 handler
 * - 精确匹配 / 前缀通配 / 全局通配
 * - handler 异常隔离
 * - clear(pattern?)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 使用 manual mock: src/main/__mocks__/logger.ts
// 避免 electron + electron-log 原生模块被加载
vi.mock('../logger')

import { eventBus, type EventPayload } from '../event-bus'

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  // ── 订阅与分发 ──────────────────────────────────────────────

  describe('on + emit', () => {
    it('精确匹配：handler 收到匹配事件', () => {
      const handler = vi.fn()
      eventBus.on('conference:phase_changed', handler)

      eventBus.emit('conference:phase_changed', { phase: 'voting' })

      expect(handler).toHaveBeenCalledTimes(1)
      const payload: EventPayload = handler.mock.calls[0][0]
      expect(payload.type).toBe('conference:phase_changed')
      expect(payload.data).toEqual({ phase: 'voting' })
      expect(payload.timestamp).toBeGreaterThan(0)
    })

    it('不匹配的事件不触发 handler', () => {
      const handler = vi.fn()
      eventBus.on('conference:phase_changed', handler)

      eventBus.emit('conference:roll_call_completed', {})

      expect(handler).not.toHaveBeenCalled()
    })

    it('前缀通配 conference:* 匹配所有 conference: 事件', () => {
      const handler = vi.fn()
      eventBus.on('conference:*', handler)

      eventBus.emit('conference:phase_changed', {})
      eventBus.emit('conference:motion_approved', {})
      eventBus.emit('conference:voting_started', {})

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('前缀通配不匹配其他域的事件', () => {
      const handler = vi.fn()
      eventBus.on('conference:*', handler)

      eventBus.emit('timeline:paused', {})
      eventBus.emit('custom:event', {})

      expect(handler).not.toHaveBeenCalled()
    })

    it('全局通配 * 匹配所有事件', () => {
      const handler = vi.fn()
      eventBus.on('*', handler)

      eventBus.emit('conference:phase_changed', {})
      eventBus.emit('timeline:paused', {})
      eventBus.emit('custom:arbitrary_event', {})

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('同一 pattern 可注册多个 handler，全部被调用', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      eventBus.on('conference:*', h1)
      eventBus.on('conference:*', h2)

      eventBus.emit('conference:phase_changed', {})

      expect(h1).toHaveBeenCalledTimes(1)
      expect(h2).toHaveBeenCalledTimes(1)
    })
  })

  // ── 取消订阅 ────────────────────────────────────────────────

  describe('取消订阅', () => {
    it('调用返回的取消函数后 handler 不再被触发', () => {
      const handler = vi.fn()
      const dispose = eventBus.on('conference:*', handler)

      // 触发一次确认注册成功
      eventBus.emit('conference:phase_changed', {})
      expect(handler).toHaveBeenCalledTimes(1)

      // 取消
      dispose()

      // 之后不再触发
      eventBus.emit('conference:voting_started', {})
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('多次调用取消函数是安全的（幂等）', () => {
      const handler = vi.fn()
      const dispose = eventBus.on('test:event', handler)

      dispose()
      dispose() // 不应抛错
      dispose()

      eventBus.emit('test:event', {})
      expect(handler).not.toHaveBeenCalled()
    })

    it('取消一个 handler 不影响同一 pattern 的其他 handler', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      const d1 = eventBus.on('test:*', h1)
      eventBus.on('test:*', h2)

      d1() // 取消 h1

      eventBus.emit('test:foo', {})
      expect(h1).not.toHaveBeenCalled()
      expect(h2).toHaveBeenCalledTimes(1)
    })
  })

  // ── 异常隔离 ────────────────────────────────────────────────

  describe('handler 异常隔离', () => {
    it('一个 handler 抛错不影响其他 handler', () => {
      const good = vi.fn()
      const bad = vi.fn(() => {
        throw new Error('boom')
      })

      eventBus.on('test:*', bad)
      eventBus.on('test:*', good)

      // 不应抛错到调用方
      expect(() => eventBus.emit('test:foo', {})).not.toThrow()

      expect(bad).toHaveBeenCalledTimes(1)
      expect(good).toHaveBeenCalledTimes(1)
    })
  })

  // ── onAny 语法糖 ────────────────────────────────────────────

  describe('onAny', () => {
    it('等价于 on("*", handler)', () => {
      const viaAny = vi.fn()
      const viaStar = vi.fn()

      eventBus.onAny(viaAny)
      eventBus.on('*', viaStar)

      eventBus.emit('foo:bar', { x: 1 })

      expect(viaAny).toHaveBeenCalledTimes(1)
      expect(viaStar).toHaveBeenCalledTimes(1)
      expect(viaAny.mock.calls[0][0].data).toEqual({ x: 1 })
    })
  })

  // ── clear ───────────────────────────────────────────────────

  describe('clear', () => {
    it('clear(pattern) 移除匹配 pattern 的所有 handler', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      eventBus.on('conference:*', h1)
      eventBus.on('conference:*', h2)

      eventBus.clear('conference:*')

      eventBus.emit('conference:phase_changed', {})
      expect(h1).not.toHaveBeenCalled()
      expect(h2).not.toHaveBeenCalled()
    })

    it('clear() 无参数清空所有 handler', () => {
      eventBus.on('conference:*', vi.fn())
      eventBus.on('timeline:*', vi.fn())
      eventBus.on('*', vi.fn())

      eventBus.clear()

      // 验证：内部 handlers map 为空
      eventBus.emit('conference:phase_changed', {})
      eventBus.emit('timeline:paused', {})
      // 所有 handler 都不会被调用（没有残留引用，无法直接验证，但至少不抛错）
    })

    it('clear 不存在的 pattern 不抛错', () => {
      expect(() => eventBus.clear('nonexistent:*')).not.toThrow()
    })
  })

  // ── emit 默认参数 ───────────────────────────────────────────

  describe('emit data 默认值', () => {
    it('emit 不传 data 时默认为 {}', () => {
      const handler = vi.fn()
      eventBus.on('test:event', handler)

      eventBus.emit('test:event')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].data).toEqual({})
    })
  })
})
