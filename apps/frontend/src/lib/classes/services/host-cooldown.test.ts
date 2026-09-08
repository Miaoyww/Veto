import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createHostCooldownDuration,
  HOST_COOLDOWN_MAX_MS,
  HOST_COOLDOWN_MIN_MS,
  waitForHostCooldown
} from './host-cooldown'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Host 操作后等待', () => {
  it('每次生成 2 到 3 秒的随机等待', () => {
    expect(createHostCooldownDuration(() => 0)).toBe(HOST_COOLDOWN_MIN_MS)
    expect(createHostCooldownDuration(() => 0.5)).toBe(2500)
    expect(createHostCooldownDuration(() => 0.999999999)).toBe(HOST_COOLDOWN_MAX_MS)
  })

  it('等待完成前保持操作锁定', async () => {
    vi.useFakeTimers()
    const completed = vi.fn()
    const wait = waitForHostCooldown(new AbortController().signal, 2500).then(completed)
    await vi.advanceTimersByTimeAsync(2499)
    expect(completed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await wait
    expect(completed).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('离页取消时清理计时器', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const wait = waitForHostCooldown(controller.signal, 2500)
    const rejection = expect(wait).rejects.toThrow('离开页面')
    controller.abort(new Error('离开页面'))
    await rejection
    expect(vi.getTimerCount()).toBe(0)
  })

  it('已取消的操作不会开启等待', () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    controller.abort(new Error('已取消'))
    expect(() => waitForHostCooldown(controller.signal)).toThrow('已取消')
    expect(vi.getTimerCount()).toBe(0)
  })
})
