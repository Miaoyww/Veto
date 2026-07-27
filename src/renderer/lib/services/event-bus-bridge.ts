/**
 * event-bus-bridge.ts — Renderer → Main Process 事件桥接
 *
 * 轻量 helper，供 conference-store / timeline-store 等调用，
 * 将状态变更事件从 Renderer 进程发送到 Main Process 的 EventBus，
 * 再由 EventBus 转发给所有订阅的 service 插件。
 */

/**
 * 向主进程发送事件。
 * @param type - 事件类型（如 'conference:phase_changed'）
 * @param data - 事件携带的上下文数据
 */
export function emitServiceEvent(type: string, data: Record<string, unknown> = {}): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const veto = (window as any).veto
    if (veto?.services?.emitEvent) {
      veto.services.emitEvent(type, data)
    }
  } catch {
    // 静默失败：事件发射不应阻塞业务流程
  }
}
