import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTimer, destroyAllTimers, destroyTimer, getTimer } from './timer'

afterEach(() => {
  destroyAllTimers()
  vi.useRealTimers()
})

describe('timer service', () => {
  it('reuses a timer by id', () => {
    expect(createTimer('x')).toBe(createTimer('x'))
  })

  it('pauses with a remaining duration and destroy removes the timer', () => {
    const timer = createTimer('x', 10)
    timer.start(1, vi.fn(), vi.fn())
    expect(typeof timer.pause()).toBe('number')
    expect(timer.isRunning).toBe(false)
    destroyTimer('x')
    expect(getTimer('x')).toBeUndefined()
  })

  it('expires immediately when initial elapsed time reaches total duration', () => {
    const onTick = vi.fn()
    const onExpire = vi.fn()
    createTimer('x').start(1, onTick, onExpire, 1)
    expect(onTick).toHaveBeenCalledWith({ remainingSec: 0, elapsedSec: 1, totalSec: 1, status: 'playing' })
    expect(onExpire).toHaveBeenCalledOnce()
  })
})
