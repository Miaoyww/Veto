import { describe, expect, it } from 'vitest'
import { calcMaxSpeakers } from './caucus'

describe('caucus utilities', () => {
  it('floors moderated caucus speaker capacity', () => {
    expect(calcMaxSpeakers(121, 60)).toBe(2)
    expect(calcMaxSpeakers(120, 0)).toBe(0)
  })
})
