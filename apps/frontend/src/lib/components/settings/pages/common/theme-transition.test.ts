import { describe, expect, it } from 'vitest'
import { getThemeTransitionClipPaths } from './theme-transition'

describe('主题切换裁剪路径', () => {
  it('从按钮中心收缩的圆形扩散到覆盖视口', () => {
    const [from, to] = getThemeTransitionClipPaths(50, 50, Math.hypot(50, 50), 100, 100)
    expect(from).toBe('circle(0% at 50% 50%)')
    const radius = to.match(/^circle\(([^%]+)% at 50% 50%\)$/)?.[1]
    expect(Number(radius)).toBeCloseTo(70.7106781187, 10)
  })
})
