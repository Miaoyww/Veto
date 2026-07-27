/**
 * event-bus.ts — 主进程事件总线
 *
 * 连接 Renderer 进程发出的状态变更事件到 Service 插件的处理函数。
 * 单例模式，全局共享。
 */

import type { ServiceEventPayload, ServiceEventType } from './types/service-plugin'
import { createLogger } from './logger'

const log = createLogger('EventBus')

type EventHandler = (payload: ServiceEventPayload) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  /**
   * 订阅指定事件类型。
   * @returns 取消订阅函数
   */
  on(type: ServiceEventType | string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    return () => {
      this.handlers.get(type)?.delete(handler)
      if (this.handlers.get(type)?.size === 0) {
        this.handlers.delete(type)
      }
    }
  }

  /**
   * 订阅所有事件（wildcard）。
   * 与 `on(type, handler)` 不同，handler 会收到所有 emit 的事件。
   * @returns 取消订阅函数
   */
  onAny(handler: EventHandler): () => void {
    return this.on('*', handler)
  }

  /**
   * 分发事件到所有匹配的 handler。
   * 每个 handler 调用包裹 try/catch，单个异常不影响其他订阅者。
   */
  emit(type: ServiceEventType | string, data: Record<string, unknown> = {}): void {
    const payload: ServiceEventPayload = {
      type: type as ServiceEventType,
      timestamp: Date.now(),
      data
    }

    // 类型精确匹配的 handler
    const handlers = this.handlers.get(type)
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          handler(payload)
        } catch (err) {
          log.error(`Handler error for event "${type}":`, err)
        }
      }
    }

    // wildcard handler（'*' 订阅者收到所有事件）
    if (type !== '*') {
      const wildcard = this.handlers.get('*')
      if (wildcard && wildcard.size > 0) {
        for (const handler of wildcard) {
          try {
            handler(payload)
          } catch (err) {
            log.error(`Wildcard handler error for event "${type}":`, err)
          }
        }
      }
    }
  }

  /**
   * 移除指定事件类型的所有 handler。
   */
  clear(type?: ServiceEventType | string): void {
    if (type) {
      this.handlers.delete(type)
    } else {
      this.handlers.clear()
    }
  }
}

/** 全局单例 */
export const eventBus = new EventBus()
