<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { tick } from 'svelte'
  import { ArrowLeft, ArrowRight, Check } from '@lucide/svelte'
  import { cn } from '$lib/classes/utils'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import { getConferenceEventById } from '$lib/classes/stores/conference/conference-event-store'
  import { wizard } from '$lib/classes/stores/runes/create-conference-event-wizard.svelte'
  import { wizardSteps } from './steps'
  import { resolve } from '$app/paths'

  let { children } = $props()

  let contentEl = $state<HTMLDivElement | undefined>(undefined)

  const currentIndex = $derived(
    Math.max(
      0,
      wizardSteps.findIndex((step) => step.path === $page.url.pathname)
    )
  )
  const isLastStep = $derived(currentIndex === wizardSteps.length - 1)

  // 步骤切换后清除上一页留下的“已尝试”错误态
  $effect(() => {
    if (wizardSteps[currentIndex]) wizard.attempted = false
  })

  function focusFirstInvalid(): void {
    // 等错误文案渲染后再聚焦第一个无效控件
    void tick().then(() => {
      contentEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  /** 校验当前步并通过后跳转 targetIndex；未通过则原地标错 */
  function tryAdvance(targetIndex: number): void {
    if (!wizard.isStepValid(currentIndex)) {
      wizard.attempted = true
      focusFirstInvalid()
      return
    }
    void goto(resolve(wizardSteps[targetIndex].path))
  }

  function goToStep(index: number): void {
    if (index < 0 || index >= wizardSteps.length) return
    if (index <= currentIndex) {
      void goto(resolve(wizardSteps[index].path))
      return
    }
    // 向前跳步与“下一步”同规则：先通过当前步校验
    tryAdvance(index)
  }

  function handleNext(): void {
    if (isLastStep) return
    tryAdvance(Math.min(currentIndex + 1, wizardSteps.length - 1))
  }

  async function handleSubmit(): Promise<void> {
    if (wizard.creating) return
    const eventId = await wizard.submit()
    if (!eventId) return
    // 落地大会总览页（settings：小会议与 Key）；取第一个小会议作为路由上下文
    const event = getConferenceEventById(eventId)
    wizard.reset()
    void goto(
      resolve(event?.conferenceIds[0] ? `/conference/${event.conferenceIds[0]}/settings` : '/')
    )
  }
</script>

<div class="flex h-screen min-h-0 flex-col bg-background">
  <header class="flex shrink-0 items-center justify-between gap-4 border-b px-8 py-5">
    <div>
      <h1 class="text-xl font-semibold">创建大会</h1>
      <p class="mt-1 text-sm text-muted-foreground">配置大会、小会议、角色权限与席位</p>
    </div>
    <Badge variant="outline" class="shrink-0">步骤 {currentIndex + 1}/{wizardSteps.length}</Badge>
  </header>

  <div class="flex min-h-0 flex-1">
    <nav aria-label="创建步骤" class="hidden w-56 shrink-0 border-r px-4 py-5 lg:block">
      <div class="flex flex-col gap-1">
        {#each wizardSteps as step, index (step.path)}
          {@const Icon = step.icon}
          {@const completed = index < wizardSteps.length - 1 && wizard.isStepValid(index)}
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
        <div
          bind:this={contentEl}
          class="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-6"
        >
          {@render children?.()}

          <footer
            class="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t bg-background py-4 mb-5"
          >
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
