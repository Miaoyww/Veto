<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    isFinalTextAnimationSegment,
    splitTextSegments,
    type TextAnimationBy
  } from './animation-utils'

  type AnimationVariant =
    | 'fadeIn'
    | 'blurIn'
    | 'blurInUp'
    | 'blurInDown'
    | 'slideUp'
    | 'slideDown'
    | 'slideLeft'
    | 'slideRight'
    | 'scaleUp'
    | 'scaleDown'

  type ElementTag =
    'article' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'li' | 'p' | 'section' | 'span'

  interface Props {
    text: string
    className?: string
    segmentClassName?: string
    delay?: number
    duration?: number
    as?: ElementTag
    by?: TextAnimationBy
    startOnView?: boolean
    once?: boolean
    animation?: AnimationVariant
    accessible?: boolean
    onComplete?: () => void
  }

  let {
    text,
    className = '',
    delay = 0,
    duration = 300,
    as = 'p',
    by = 'word',
    startOnView = true,
    once = false,
    animation = 'fadeIn',
    accessible = true,
    onComplete
  }: Props = $props()

  let element: HTMLElement | undefined = $state()
  let visible = $state(false)
  let animationCompleted = false
  let observer: IntersectionObserver | undefined
  const segments = $derived(splitTextSegments(text, by))

  function handleSegmentAnimationEnd(index: number) {
    if (animationCompleted || !isFinalTextAnimationSegment(index, segments.length)) return

    animationCompleted = true
    onComplete?.()
  }

  onMount(() => {
    if (!startOnView) {
      visible = true
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      visible = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          visible = true
          if (once) observer?.disconnect()
        } else if (!once) {
          visible = false
          animationCompleted = false
        }
      },
      { threshold: 0.3 }
    )
    if (element) observer.observe(element)
  })

  onDestroy(() => observer?.disconnect())
</script>

<svelte:element
  this={as}
  bind:this={element}
  class="whitespace-pre-wrap {className}"
  aria-label={accessible ? text : undefined}
>
  {#if accessible}
    <span class="sr-only">{text}</span>
  {/if}
  {#each segments as segment, index (`${by}-${segment}-${index}`)}
    <span
      class:text-animate-segment={true}
      class:text-animate-visible={visible}
      class:text-animate-line={by === 'line'}
      class:text-animate-space={by !== 'line'}
      aria-hidden={accessible ? 'true' : undefined}
      data-animation={animation}
      style={`--text-animate-delay: ${delay + index * 50}ms; --text-animate-duration: ${duration}ms`}
      onanimationend={() => handleSegmentAnimationEnd(index)}>{segment}</span
    >
  {/each}
</svelte:element>

<style>
  .text-animate-segment {
    opacity: 0;
    animation-duration: var(--text-animate-duration);
    animation-delay: var(--text-animate-delay);
    animation-fill-mode: both;
    animation-play-state: paused;
    will-change: transform, opacity, filter;
  }

  .text-animate-visible {
    animation-name: text-animate-fade-in;
    animation-play-state: running;
  }

  .text-animate-space {
    display: inline-block;
    white-space: pre;
  }

  .text-animate-line {
    display: block;
  }

  .text-animate-segment[data-animation='blurIn'] {
    animation-name: text-animate-blur-in;
  }
  .text-animate-segment[data-animation='blurInUp'] {
    animation-name: text-animate-blur-in-up;
  }
  .text-animate-segment[data-animation='blurInDown'] {
    animation-name: text-animate-blur-in-down;
  }
  .text-animate-segment[data-animation='slideUp'] {
    animation-name: text-animate-slide-up;
  }
  .text-animate-segment[data-animation='slideDown'] {
    animation-name: text-animate-slide-down;
  }
  .text-animate-segment[data-animation='slideLeft'] {
    animation-name: text-animate-slide-left;
  }
  .text-animate-segment[data-animation='slideRight'] {
    animation-name: text-animate-slide-right;
  }
  .text-animate-segment[data-animation='scaleUp'] {
    animation-name: text-animate-scale-up;
  }
  .text-animate-segment[data-animation='scaleDown'] {
    animation-name: text-animate-scale-down;
  }

  @keyframes text-animate-fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes text-animate-blur-in {
    from {
      opacity: 0;
      filter: blur(10px);
    }
    to {
      opacity: 1;
      filter: blur(0);
    }
  }
  @keyframes text-animate-blur-in-up {
    from {
      opacity: 0;
      filter: blur(10px);
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      filter: blur(0);
      transform: translateY(0);
    }
  }
  @keyframes text-animate-blur-in-down {
    from {
      opacity: 0;
      filter: blur(10px);
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      filter: blur(0);
      transform: translateY(0);
    }
  }
  @keyframes text-animate-slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes text-animate-slide-down {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes text-animate-slide-left {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes text-animate-slide-right {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes text-animate-scale-up {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes text-animate-scale-down {
    from {
      opacity: 0;
      transform: scale(1.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .text-animate-segment,
    .text-animate-visible {
      animation: none;
      opacity: 1;
      transform: none;
      filter: none;
    }
  }
</style>
