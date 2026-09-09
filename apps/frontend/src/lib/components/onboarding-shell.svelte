<script lang="ts">
  import type { Snippet } from 'svelte'
  import favicon from '$lib/assets/favicon.png'
  import WindowControls from '$lib/components/app-sidebar/window-controls.svelte'

  let { children } = $props<{ children?: Snippet }>()
</script>

<div class="relative min-h-svh overflow-clip bg-background">
  <div class="flowing-background" aria-hidden="true">
    <span class="flowing-background__veil flowing-background__veil--strong"></span>
    <span class="flowing-background__veil flowing-background__veil--soft"></span>
  </div>

  <div class="absolute left-8 top-12 z-20 flex items-center gap-3 text-sm font-medium">
    <div class="flex size-9 items-center justify-center">
      <img src={favicon} alt="Veto" class="size-8" />
    </div>
    <span class="text-lg">Veto</span>
  </div>

  <div class="absolute left-0 right-0 top-0 z-20 flex h-9 items-center">
    <div class="drag-region h-full flex-1"></div>
    <WindowControls />
  </div>

  <div class="page-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true"></div>
  <div class="page-orb page-orb-primary pointer-events-none" aria-hidden="true"></div>
  <div class="page-orb page-orb-secondary pointer-events-none" aria-hidden="true"></div>

  <div class="relative z-10 min-h-svh">
    {@render children?.()}
  </div>
</div>

<style>
  .drag-region {
    -webkit-app-region: drag;
  }

  .flowing-background {
    --flow-color-strong: oklch(0.73 0.14 68);
    --flow-color-soft: oklch(0.88 0.08 78);
    --flow-opacity-strong: 0.2;
    --flow-opacity-soft: 0.32;
    --flow-blur: 4rem;
    --flow-ease: cubic-bezier(0.65, 0, 0.35, 1);

    position: absolute;
    inset: -16%;
    overflow: hidden;
    pointer-events: none;
    contain: paint;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--flow-color-soft) 12%, var(--background)),
      var(--background)
    );
  }

  :global(.dark) .flowing-background {
    --flow-color-strong: oklch(0.62 0.14 68);
    --flow-color-soft: oklch(0.48 0.09 78);
    --flow-opacity-strong: 0.24;
    --flow-opacity-soft: 0.2;
  }

  .flowing-background__veil {
    position: absolute;
    display: block;
    border-radius: 50%;
    filter: blur(var(--flow-blur));
    will-change: transform;
  }

  .flowing-background__veil--strong {
    inset-block-start: -8%;
    inset-inline-start: -12%;
    width: clamp(26rem, 62vw, 62rem);
    aspect-ratio: 1.55;
    background: var(--flow-color-strong);
    opacity: var(--flow-opacity-strong);
    animation: flow-strong 22s var(--flow-ease) -6s infinite alternate;
  }

  .flowing-background__veil--soft {
    inset-block-end: -12%;
    inset-inline-end: -10%;
    width: clamp(24rem, 54vw, 54rem);
    aspect-ratio: 1.35;
    background: var(--flow-color-soft);
    opacity: var(--flow-opacity-soft);
    animation: flow-soft 28s var(--flow-ease) -14s infinite alternate;
  }

  .page-grid {
    background-image:
      linear-gradient(
        to right,
        color-mix(in oklch, var(--border) 42%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        to bottom,
        color-mix(in oklch, var(--border) 42%, transparent) 1px,
        transparent 1px
      );
    background-size: 42px 42px;
    mask-image: linear-gradient(to bottom, black, transparent 75%);
  }

  .page-orb {
    position: absolute;
    aspect-ratio: 1;
    border-radius: 9999px;
    filter: blur(72px);
    pointer-events: none;
    opacity: 0.18;
  }

  .page-orb-primary {
    top: -18rem;
    right: -12rem;
    width: min(48rem, 72vw);
    background: color-mix(in oklch, var(--primary) 70%, transparent);
  }

  .page-orb-secondary {
    bottom: -20rem;
    left: -16rem;
    width: min(42rem, 65vw);
    background: color-mix(in oklch, var(--primary) 42%, transparent);
  }

  @keyframes flow-strong {
    from {
      transform: translate3d(-6%, -4%, 0) rotate(-7deg) scale(1);
    }

    to {
      transform: translate3d(24%, 16%, 0) rotate(8deg) scale(1.08);
    }
  }

  @keyframes flow-soft {
    from {
      transform: translate3d(8%, 10%, 0) rotate(6deg) scale(1.04);
    }

    to {
      transform: translate3d(-22%, -14%, 0) rotate(-8deg) scale(0.96);
    }
  }

  @media (min-width: 40rem) {
    .flowing-background {
      --flow-opacity-strong: 0.28;
      --flow-opacity-soft: 0.38;
      --flow-blur: clamp(5rem, 8vw, 8rem);
    }

    :global(.dark) .flowing-background {
      --flow-opacity-strong: 0.28;
      --flow-opacity-soft: 0.24;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flowing-background__veil {
      animation: none;
      will-change: auto;
    }

    .flowing-background__veil--strong {
      transform: translate3d(8%, 4%, 0) rotate(-4deg) scale(1.04);
    }

    .flowing-background__veil--soft {
      transform: translate3d(-8%, -4%, 0) rotate(4deg) scale(1);
    }

    .page-orb {
      filter: blur(52px);
    }
  }
</style>
