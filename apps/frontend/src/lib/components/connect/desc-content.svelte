<script lang="ts">
  import TextAnimate from '$lib/components/ui/text-animate.svelte'
  import TypingAnimation from '$lib/components/ui/typing-animation.svelte'

  let heroStage = $state(0)
</script>

<section class="hidden flex-1 flex-col justify-center px-12 lg:flex xl:px-24">
  <div class="max-w-xl">
    <h1 class="text-5xl font-bold tracking-tight text-foreground">
      <TypingAnimation
        text="Build your ideas."
        as="span"
        startOnView={false}
        onComplete={() => (heroStage = 1)}
      />
      <br />

      {#if heroStage >= 1}
        <TypingAnimation
          text=" Better than ever. "
          as="span"
          className="text-primary"
          startOnView={false}
          onComplete={() => (heroStage = 2)}
        />
      {/if}
    </h1>

    {#if heroStage >= 2}
      <TextAnimate
        text="管理你的会议, 并与其他成员协作. 让模拟联合国会议的组织变得更简单, 更高效."
        as="p"
        className="mt-6 max-w-md text-lg text-muted-foreground"
        startOnView={false}
        onComplete={() => (heroStage = 3)}
      />
    {/if}

    {#if heroStage >= 3}
      <div class="mt-10 flex gap-6 text-sm text-muted-foreground">
        <div>
          <TextAnimate
            text="一站式"
            as="div"
            animation="blurInUp"
            className="text-2xl font-bold text-foreground"
            startOnView={false}
          />
          <TextAnimate text="会务管理" as="div" delay={150} startOnView={false} />
        </div>

        <div>
          <TextAnimate
            text="实时"
            as="div"
            delay={150}
            animation="blurInUp"
            className="text-2xl font-bold text-foreground"
            startOnView={false}
          />
          <TextAnimate text="局势同步" as="div" delay={300} startOnView={false} />
        </div>

        <div>
          <TextAnimate
            text="全流程"
            as="div"
            delay={300}
            animation="blurInUp"
            className="text-2xl font-bold text-foreground"
            startOnView={false}
          />
          <TextAnimate text="数字化管理" as="div" delay={450} startOnView={false} />
        </div>
      </div>
    {/if}
  </div>
</section>
