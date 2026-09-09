import { describe, expect, it } from 'vitest'
import {
  getTypingWords,
  splitTextSegments,
  getCursorCharacter,
  isFinalTextAnimationSegment
} from './animation-utils'

describe('动画文本工具', () => {
  it('按单词分段时保留空白，以便布局不跳动', () => {
    expect(splitTextSegments('一站式 会务管理', 'word')).toEqual(['一站式', ' ', '会务管理'])
  })

  it('按字符分段时按 Unicode code point 拆分', () => {
    expect(splitTextSegments('更好 🚀', 'character')).toEqual(['更', '好', ' ', '🚀'])
  })

  it('优先使用 words，空输入返回空数组', () => {
    expect(getTypingWords('备用文本', ['第一句', '第二句'])).toEqual(['第一句', '第二句'])
    expect(getTypingWords('', undefined)).toEqual([])
  })

  it('返回对应的光标字符', () => {
    expect(getCursorCharacter('line')).toBe('|')
    expect(getCursorCharacter('block')).toBe('▌')
    expect(getCursorCharacter('underscore')).toBe('_')
  })

  it('只在最后一个文本分段结束时完成动画', () => {
    expect(isFinalTextAnimationSegment(0, 3)).toBe(false)
    expect(isFinalTextAnimationSegment(2, 3)).toBe(true)
    expect(isFinalTextAnimationSegment(0, 1)).toBe(true)
  })
})
