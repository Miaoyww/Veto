<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { ArrowLeft, ArrowRight, Network, Plus, Sparkles, Users } from '@lucide/svelte'
  import favicon from '$lib/assets/favicon.png'
  import WindowControls from '$lib/components/app-sidebar/window-controls.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Empty from '$lib/components/ui/empty'
  import TextAnimate from '$lib/components/ui/text-animate.svelte'
  import TypingAnimation from '$lib/components/ui/typing-animation.svelte'

  function openCreatePage(): void {
    goto(resolve('/conference/create'))
  }

  function openConnectionPage(): void {
    goto(resolve('/'))
  }
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

  <main
    class="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl items-center gap-10 px-6 py-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10"
  >
    <Empty.Root class="min-h-0 items-start justify-center border-0 bg-transparent p-0 text-left">
      <Empty.Header class="max-w-2xl items-start">
        <Empty.Title class="text-4xl leading-tight tracking-tight sm:text-5xl">
          <div
            class="flex flex-col size-12 rounded-2xl bg-primary/10 text-primary items-center justify-center"
          >
            <Sparkles class="size-6" />
          </div>
          <TextAnimate
            text="把下一场大会组织得更漂亮"
            className="font-semibold"
            as="h1"
            by="word"
            animation="blurInUp"
            startOnView={false}
            once
          />
        </Empty.Title>
        <Empty.Description class="max-w-xl text-base leading-7 text-muted-foreground">
          从议程、席位到实时局势，Veto 把复杂的会议流程收束成一个清晰、专注的工作台。
        </Empty.Description>
      </Empty.Header>

      <Empty.Content class="max-w-none items-start">
        <div class="flex flex-wrap items-center gap-3">
          <Button size="lg" onclick={openCreatePage}>
            <Plus data-icon="inline-start" />
            创建第一场大会
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="outline" onclick={openConnectionPage}>
            <ArrowLeft data-icon="inline-start" />
            返回连接入口
          </Button>
        </div>
        <p class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span>让每一次讨论都</span>
          <TypingAnimation
            words={['议程清晰', '协作流畅', '决策有据']}
            className="font-semibold text-foreground"
            typeSpeed={75}
            deleteSpeed={38}
            pauseDelay={850}
            loop
            startOnView={false}
          />
        </p>
      </Empty.Content>
    </Empty.Root>

    <Card.Root
      class="relative overflow-hidden border-primary/20 bg-card/75 shadow-2xl shadow-primary/5 backdrop-blur-xl"
    >
      <Card.Header class="gap-3 p-6 pb-5">
        <div class="flex items-center justify-between gap-4">
          <Card.Title class="text-lg">会议蓝图</Card.Title>
        </div>
        <Card.Description class="leading-6">
          一场大会从一个清晰的起点开始，剩下的交给你的议程与判断。
        </Card.Description>
      </Card.Header>

      <Card.Content class="grid gap-3 px-6 pb-6">
        <div class="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Network class="size-4" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-medium">搭建会议结构</p>
            <p class="mt-0.5 text-xs text-muted-foreground">定义委员会、议程与会议规则</p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Users class="size-4" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-medium">安排参与者</p>
            <p class="mt-0.5 text-xs text-muted-foreground">为每个席位准备清晰的角色</p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Sparkles class="size-4" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-medium">进入实时工作台</p>
            <p class="mt-0.5 text-xs text-muted-foreground">让每个决定都在同一个节奏里发生</p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="border-t bg-muted/20 px-6 py-4 text-xs text-muted-foreground">
        预计只需几分钟，即可完成基础设置
      </Card.Footer>
    </Card.Root>
  </main>
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
