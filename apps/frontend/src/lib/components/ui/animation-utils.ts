export type TextAnimationBy = 'text' | 'word' | 'character' | 'line'
export type CursorStyle = 'line' | 'block' | 'underscore'

export function splitTextSegments(text: string, by: TextAnimationBy): string[] {
  switch (by) {
    case 'word':
      return text.split(/(\s+)/)
    case 'character':
      return Array.from(text)
    case 'line':
      return text.split('\n')
    case 'text':
    default:
      return [text]
  }
}

export function getTypingWords(text: string | undefined, words: string[] | undefined): string[] {
  return words ?? (text ? [text] : [])
}

export function getCursorCharacter(cursorStyle: CursorStyle): string {
  switch (cursorStyle) {
    case 'block':
      return '▌'
    case 'underscore':
      return '_'
    case 'line':
    default:
      return '|'
  }
}

export function isFinalTextAnimationSegment(index: number, segmentCount: number): boolean {
  return segmentCount > 0 && index === segmentCount - 1
}
