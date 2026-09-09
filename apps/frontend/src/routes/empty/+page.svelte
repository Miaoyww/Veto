<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { ArrowLeft, ArrowRight, Network, Plus, Sparkles, Users } from '@lucide/svelte'
  import OnboardingShell from '$lib/components/onboarding-shell.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Empty from '$lib/components/ui/empty'
  import TextAnimate from '$lib/components/ui/text-animate.svelte'
  import TypingAnimation from '$lib/components/ui/typing-animation.svelte'

  function openCreatePage(): void {
    goto(resolve('/conference/create/info'))
  }

  function openConnectionPage(): void {
    goto(resolve('/'))
  }
</script>

<OnboardingShell>
  <main
    class="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl items-center gap-10 px-6 py-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10"
  >
    <Empty.Root class="min-h-0 items-start justify-center border-0 bg-transparent p-0 text-left">
      <Empty.Header class="max-w-2xl items-start">
        <Empty.Title class="text-4xl leading-tight tracking-tight sm:text-5xl">
          <div
            class="flex flex-col size-12 rounded-2xl bg-primary/10 text-primary items-center justify-center mb-5"
          >
            <Sparkles class="size-6" />
          </div>
          <TextAnimate
            text="开始你的第一场大会"
            className="font-semibold"
            as="h1"
            by="word"
            animation="blurInUp"
            startOnView={false}
            once
          />
        </Empty.Title>
        <Empty.Description class="max-w-xl text-base leading-7 text-muted-foreground">
          从议程、席位到实时局势, Veto 把复杂的会议流程收束成一个清晰、专注的工作台。
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
      class="create-handoff-card relative overflow-hidden border-primary/20 bg-card/75 shadow-2xl shadow-primary/5 backdrop-blur-xl"
      style="view-transition-name: create-handoff"
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
</OnboardingShell>
