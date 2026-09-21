<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { tick } from 'svelte'
  import { ArrowLeft, ArrowRight, Check } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { getCreatedConferenceById } from '$lib/classes/stores/conference/conference-event-store'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import { getWizardSteps } from './steps'
  import { resolve } from '$app/paths'
  import OnboardingShell from '$lib/components/onboarding-shell.svelte'

  let { children } = $props()

  let contentEl = $state<HTMLDivElement | undefined>(undefined)

  const visibleSteps = $derived(getWizardSteps(wizard.mode))

  const currentIndex = $derived(
    Math.max(
      0,
      visibleSteps.findIndex((step) => step.path === $page.url.pathname)
    )
  )
  const isLastStep = $derived(currentIndex === visibleSteps.length - 1)

  $effect(() => {
    if (wizard.mode === 'singleton' && $page.url.pathname.endsWith('/roles')) {
      void goto(resolve('/conference/create/seats'), { replaceState: true })
    }
  })

  // 步骤切换后清除上一页留下的“已尝试”错误态
  $effect(() => {
    if (visibleSteps[currentIndex]) wizard.attempted = false
  })

  function focusFirstInvalid(): void {
    // 等错误文案渲染后再聚焦第一个无效控件
    void tick().then(() => {
      contentEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  /** 校验当前步并通过后跳转 targetIndex；未通过则原地标错 */
  function tryAdvance(targetIndex: number): void {
    const currentStep = visibleSteps[currentIndex]
    const targetStep = visibleSteps[targetIndex]
    if (!currentStep || !targetStep || !wizard.isStepValidById(currentStep.id)) {
      wizard.attempted = true
      focusFirstInvalid()
      return
    }
    void goto(resolve(targetStep.path))
  }

  function goToStep(index: number): void {
    if (index < 0 || index >= visibleSteps.length) return
    if (index <= currentIndex) {
      void goto(resolve(visibleSteps[index].path))
      return
    }
    // 向前跳步与“下一步”同规则：先通过当前步校验
    tryAdvance(index)
  }

  function handleNext(): void {
    if (isLastStep) return
    tryAdvance(Math.min(currentIndex + 1, visibleSteps.length - 1))
  }

  async function handleSubmit(): Promise<void> {
    if (wizard.creating) return
    const eventId = await wizard.submit()
    if (!eventId) return
    // 落地大会总览页，并进入第一个委员会。
    const event = getCreatedConferenceById(eventId)
    wizard.reset()
    const committeeId = event?.committees[0]?.id
    if (event && committeeId && event.mode === 'singleton') {
      void goto(resolve(`/client/${event.id}/committee/${committeeId}/chair`))
      return
    }
    void goto(
      resolve(event && committeeId ? `/client/${event.id}/committee/${committeeId}` : '/')
    )
  }
</script>

<OnboardingShell>
  <div class="relative z-10 flex h-screen min-h-0 flex-col pt-18">
    <header
      class="flex shrink-0 items-center justify-between gap-4 px-6 py-5 backdrop-blur-xl sm:px-8"
    >
      <div>
        <h1 class="text-xl font-semibold">创建大会</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {wizard.mode === 'singleton'
            ? '配置一场独立主持的会议与席位'
            : '配置大会、委员会、角色权限与席位'}
        </p>
      </div>
      <Badge variant="outline" class="shrink-0">
        步骤 {currentIndex + 1}/{visibleSteps.length}
      </Badge>
    </header>

    <div class="flex min-h-0 flex-1">
      <nav
        aria-label="创建步骤"
        class="hidden w-48 shrink-0 rounded-3xl px-4 py-5 bg-background/70 lg:block ml-5 mb-5"
      >
        <div class="flex flex-col gap-1">
          {#each visibleSteps as step, index (step.path)}
            {@const Icon = step.icon}
            {@const completed =
              index <= currentIndex &&
              index < visibleSteps.length - 1 &&
              wizard.isStepValidById(step.id)}
            <button
              type="button"
              class={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                index === currentIndex
                  ? 'bg-accent font-medium text-accent-foreground'
                  : completed
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              )}
              onclick={() => goToStep(index)}
            >
              <Icon class="size-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">{step.title}</span>
              {#if completed}<Check class="size-3.5 shrink-0 text-emerald-500" />{/if}
            </button>
          {/each}
        </div>
      </nav>

      <main class="min-w-0 min-h-0 flex-1">
        <ScrollArea class="size-full">
          <div bind:this={contentEl} class="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8">
            <div class="create-step-surface" style="view-transition-name: create-handoff">
              {@render children?.()}
            </div>

            <footer class="sticky bottom-0 mt-6 flex items-center justify-between gap-3 py-4 mb-5">
              <Button
                variant="ghost"
                disabled={currentIndex === 0 || wizard.creating}
                onclick={() => goToStep(currentIndex - 1)}
              >
                <ArrowLeft data-icon="inline-start" />
                上一步
              </Button>
              {#if !isLastStep}
                <Button disabled={wizard.creating} onclick={handleNext}>
                  下一步
                  <ArrowRight data-icon="inline-end" />
                </Button>
              {:else}
                <Button disabled={wizard.creating} onclick={() => void handleSubmit()}>
                  {#if wizard.creating}
                    创建中
                  {:else}
                    创建大会
                  {/if}
                  <Check data-icon="inline-end" />
                </Button>
              {/if}
            </footer>
          </div>
        </ScrollArea>
      </main>
    </div>
  </div>
</OnboardingShell>

<style>
  .create-step-surface {
    min-height: 13rem;
    border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
    border-radius: 1rem;
    background: color-mix(in oklch, var(--card) 78%, transparent);
    padding: 1.25rem;
    box-shadow: 0 1.5rem 4rem color-mix(in oklch, var(--primary) 6%, transparent);
    backdrop-filter: blur(1rem);
  }

  @media (min-width: 40rem) {
    .create-step-surface {
      padding: 1.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .create-step-surface {
      backdrop-filter: none;
    }
  }
</style>
