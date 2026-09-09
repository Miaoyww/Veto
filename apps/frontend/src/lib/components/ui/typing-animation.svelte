<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { getCursorCharacter, getTypingWords, type CursorStyle } from './animation-utils'

  type ElementTag =
    'article' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'li' | 'p' | 'section' | 'span'

  interface Props {
    text?: string
    words?: string[]
    className?: string
    duration?: number
    typeSpeed?: number
    deleteSpeed?: number
    delay?: number
    pauseDelay?: number
    loop?: boolean
    as?: ElementTag
    startOnView?: boolean
    showCursor?: boolean
    blinkCursor?: boolean
    cursorStyle?: CursorStyle
    onComplete?: () => void
  }

  let {
    text,
    words,
    className = '',
    duration = 80,
    typeSpeed,
    deleteSpeed,
    delay = 0,
    pauseDelay = 600,
    loop = false,
    as = 'span',
    startOnView = true,
    showCursor = true,
    blinkCursor = true,
    cursorStyle = 'line',
    onComplete
  }: Props = $props()

  let element: HTMLElement | undefined = $state()
  let displayedText = $state('')
  let currentWordIndex = $state(0)
  let currentCharIndex = $state(0)
  let phase = $state<'typing' | 'pause' | 'deleting'>('typing')
  let hasStarted = $state(false)
  let completed = $state(false)
  let timeout: ReturnType<typeof setTimeout> | undefined
  let observer: IntersectionObserver | undefined
  let completionNotified = false

  const typingSpeed = $derived(typeSpeed ?? duration)
  const deletingSpeed = $derived(deleteSpeed ?? typingSpeed / 2)
  const typingWords = $derived(getTypingWords(text, words))
  const currentWord = $derived(typingWords[currentWordIndex] ?? '')
  const currentGraphemes = $derived(Array.from(currentWord))
  const isComplete = $derived(
    !loop &&
      typingWords.length > 0 &&
      currentWordIndex === typingWords.length - 1 &&
      currentCharIndex >= currentGraphemes.length &&
      phase !== 'deleting'
  )
  const shouldShowCursor = $derived(
    showCursor &&
      !isComplete &&
      (typingWords.length > 1 || loop || currentCharIndex < currentGraphemes.length)
  )

  function resetAnimation() {
    if (timeout) clearTimeout(timeout)
    displayedText = ''
    currentWordIndex = 0
    currentCharIndex = 0
    phase = 'typing'
    completed = false
    completionNotified = false
  }

  function notifyComplete() {
    if (completionNotified || loop || typingWords.length === 0) return
    completionNotified = true
    completed = true
    onComplete?.()
  }

  function tick() {
    if (!hasStarted || completed || typingWords.length === 0) return

    const current = typingWords[currentWordIndex] ?? ''
    const graphemes = Array.from(current)

    if (phase === 'typing') {
      if (currentCharIndex < graphemes.length) {
        const nextIndex = currentCharIndex + 1
        displayedText = graphemes.slice(0, nextIndex).join('')
        currentCharIndex = nextIndex
        if (
          !loop &&
          currentWordIndex === typingWords.length - 1 &&
          nextIndex === graphemes.length
        ) {
          notifyComplete()
        }
      } else if (typingWords.length > 1 || loop) {
        phase = 'pause'
      } else {
        notifyComplete()
      }
    } else if (phase === 'pause') {
      phase = 'deleting'
    } else if (currentCharIndex > 0) {
      currentCharIndex -= 1
      displayedText = graphemes.slice(0, currentCharIndex).join('')
    } else {
      currentWordIndex = (currentWordIndex + 1) % typingWords.length
      phase = 'typing'
    }

    if (!completed && hasStarted) {
      const wait =
        displayedText === '' &&
        currentCharIndex === 0 &&
        currentWordIndex === 0 &&
        phase === 'typing'
          ? delay
          : phase === 'typing'
            ? typingSpeed
            : phase === 'deleting'
              ? deletingSpeed
              : pauseDelay
      timeout = setTimeout(tick, Math.max(0, wait))
    }
  }

  function begin() {
    if (hasStarted) return
    hasStarted = true
  }

  $effect(() => {
    const sourceKey = `${text ?? ''}\u0000${words?.join('\u0000') ?? ''}`
    void sourceKey
    if (!hasStarted) return

    resetAnimation()
    timeout = setTimeout(tick, Math.max(0, delay))

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  })

  onMount(() => {
    if (!startOnView) {
      begin()
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      begin()
      return
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          begin()
          observer?.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (element) observer.observe(element)
  })

  onDestroy(() => {
    if (timeout) clearTimeout(timeout)
    observer?.disconnect()
  })
</script>

<svelte:element this={as} bind:this={element} class:inline-block={as === 'span'} class={className}>
  {displayedText}
  {#if shouldShowCursor}
    <span class={blinkCursor ? 'inline-block animate-blink-cursor' : 'inline-block'}
      >{getCursorCharacter(cursorStyle)}</span
    >
  {/if}
</svelte:element>
