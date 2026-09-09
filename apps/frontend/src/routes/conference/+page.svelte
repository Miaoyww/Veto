<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarDays,
    Network,
    Play,
    Plus,
    Search,
    Sparkles,
    Users
  } from '@lucide/svelte'

  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Empty from '$lib/components/ui/empty'
  import * as InputGroup from '$lib/components/ui/input-group'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import ConferenceCard from '$lib/components/home/conference-card.svelte'
  import TextAnimate from '$lib/components/ui/text-animate.svelte'
  import TypingAnimation from '$lib/components/ui/typing-animation.svelte'
  import {
    conferences,
    lastOpenedConferenceId,
    unloadConference
  } from '$lib/classes/stores/conference/conference-store'
  import { navigateToConference } from '$lib/classes/utils'

  let query = $state('')

  const filteredConferences = $derived(
    query.trim()
      ? $conferences.filter(
          (conference) =>
            conference.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            conference.committees.some((committee) =>
              committee.name.toLowerCase().includes(query.trim().toLowerCase())
            )
        )
      : $conferences
  )

  const lastOpened = $derived(
    $lastOpenedConferenceId
      ? ($conferences.find((conference) => conference.id === $lastOpenedConferenceId) ?? null)
      : null
  )

  const conferenceStats = $derived({
    total: $conferences.length,
    committees: $conferences.reduce((count, conference) => count + conference.committees.length, 0),
    seats: $conferences.reduce(
      (count, conference) =>
        count +
        conference.committees.reduce(
          (committeeCount, committee) => committeeCount + committee.seats.length,
          0
        ),
      0
    )
  })

  onMount(() => {
    unloadConference()
  })

  function openCreatePage(): void {
    goto(resolve('/conference/create'))
  }

  function openConnectionPage(): void {
    goto(resolve('/'))
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
  }

  function resumeConference(): void {
    if (lastOpened) navigateToConference(lastOpened.id)
  }
</script>

{#if $conferences.length === 0}
  <div class="page-shell relative h-screen min-h-0 overflow-y-auto bg-background">
    <div class="page-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true"></div>
    <div class="page-orb page-orb-primary pointer-events-none" aria-hidden="true"></div>
    <div class="page-orb page-orb-secondary pointer-events-none" aria-hidden="true"></div>

    <main
      class="relative z-10 mx-auto grid min-h-full w-full max-w-6xl items-center gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-16"
    >
      <Empty.Root class="min-h-0 items-start justify-center border-0 bg-transparent p-0 text-left">
        <Empty.Media variant="icon" class="size-12 rounded-2xl bg-primary/10 text-primary">
          <Sparkles class="size-6" />
        </Empty.Media>
        <Empty.Header class="max-w-2xl items-start">
          <Badge
            variant="outline"
            class="mb-1 border-primary/25 bg-primary/5 px-3 py-1 text-primary"
          >
            组织者工作区
          </Badge>
          <Empty.Title class="text-4xl leading-tight tracking-tight sm:text-5xl">
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
        <div class="absolute inset-x-0 top-0 h-1 bg-primary/70" aria-hidden="true"></div>
        <Card.Header class="gap-3 p-6 pb-5">
          <div class="flex items-center justify-between gap-4">
            <Card.Title class="text-lg">会议蓝图</Card.Title>
            <Badge variant="secondary">READY</Badge>
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
{:else}
  <div class="page-shell relative flex h-screen min-h-0 flex-col overflow-hidden bg-background">
    <div class="page-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true"></div>
    <div
      class="page-orb page-orb-primary page-orb-primary-compact pointer-events-none"
      aria-hidden="true"
    ></div>

    <header
      class="relative z-10 shrink-0 border-b bg-background/75 px-6 py-6 backdrop-blur-xl sm:px-8 lg:px-10"
    >
      <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div class="min-w-0">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
              <TextAnimate
                text="继续你的会议节奏"
                className="font-semibold"
                as="span"
                by="word"
                animation="blurInUp"
                startOnView={false}
                once
              />
            </h1>
            <p class="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>每一场大会, 都值得</span>
              <TypingAnimation
                words={['准备充分', '秩序井然', '观点交汇']}
                className="font-medium text-foreground"
                typeSpeed={75}
                deleteSpeed={38}
                pauseDelay={900}
                loop
                startOnView={false}
              />
            </p>
          </div>

          <Button size="lg" class="shrink-0" onclick={openCreatePage}>
            <Plus data-icon="inline-start" />
            创建大会
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <InputGroup.Root class="max-w-xl flex-1 bg-background/70">
            <InputGroup.Addon>
              <Search />
            </InputGroup.Addon>
            <InputGroup.Input
              bind:value={query}
              placeholder="搜索大会或委员会..."
              aria-label="搜索大会或委员会"
            />
          </InputGroup.Root>
          <Badge variant="secondary" class="self-start px-3 py-1 sm:self-auto">
            {filteredConferences.length} / {conferenceStats.total} 场大会
          </Badge>
        </div>
      </div>
    </header>

    <ScrollArea class="relative z-10 min-h-0 flex-1">
      <main
        class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10 lg:py-10"
      >
        <section aria-labelledby="overview-heading" class="grid gap-3 sm:grid-cols-3">
          <h2 id="overview-heading" class="sr-only">大会概览</h2>
          <Card.Root class="bg-card/70 shadow-sm backdrop-blur-sm">
            <Card.Header class="pb-2">
              <Card.Description>大会</Card.Description>
              <Card.Title class="text-3xl tracking-tight">{conferenceStats.total}</Card.Title>
            </Card.Header>
            <Card.Content class="pt-0 text-xs text-muted-foreground">你的会议总数</Card.Content>
          </Card.Root>
          <Card.Root class="bg-card/70 shadow-sm backdrop-blur-sm">
            <Card.Header class="pb-2">
              <Card.Description>委员会</Card.Description>
              <Card.Title class="text-3xl tracking-tight">{conferenceStats.committees}</Card.Title>
            </Card.Header>
            <Card.Content class="pt-0 text-xs text-muted-foreground">已配置的讨论空间</Card.Content>
          </Card.Root>
          <Card.Root class="bg-card/70 shadow-sm backdrop-blur-sm">
            <Card.Header class="pb-2">
              <Card.Description>席位</Card.Description>
              <Card.Title class="text-3xl tracking-tight">{conferenceStats.seats}</Card.Title>
            </Card.Header>
            <Card.Content class="pt-0 text-xs text-muted-foreground">等待参与者入场</Card.Content>
          </Card.Root>
        </section>

        {#if lastOpened && !query.trim()}
          <section aria-labelledby="continue-heading">
            <div class="mb-3 flex items-end justify-between gap-4">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  最近打开
                </p>
                <h2 id="continue-heading" class="mt-1 text-lg font-semibold tracking-tight">
                  回到上次的现场
                </h2>
              </div>
              <Badge variant="outline" class="hidden sm:inline-flex">快速进入</Badge>
            </div>

            <Card.Root
              class="group relative cursor-pointer overflow-hidden border-primary/25 bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              role="link"
              tabindex={0}
              onclick={resumeConference}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  resumeConference()
                }
              }}
            >
              <div class="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true"></div>
              <Card.Content class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <div
                  class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                >
                  <Play class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                    继续上次
                  </p>
                  <p class="mt-1 truncate text-lg font-semibold">{lastOpened.name}</p>
                  <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1.5">
                      <Building2 class="size-3.5" />
                      {lastOpened.committees.length} 个会场
                    </span>
                    <span class="flex items-center gap-1.5">
                      <CalendarDays class="size-3.5" />
                      {formatDate(lastOpened.createdAt)}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <Users class="size-3.5" />
                      {lastOpened.committees.reduce(
                        (count, committee) => count + committee.seats.length,
                        0
                      )} 个席位
                    </span>
                  </div>
                </div>
                <Button
                  class="shrink-0"
                  onclick={(event) => {
                    event.stopPropagation()
                    resumeConference()
                  }}
                >
                  进入工作台
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Card.Content>
            </Card.Root>
          </section>
        {/if}

        <section aria-labelledby="conference-list-heading">
          <div class="mb-3 flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                你的收藏
              </p>
              <h2 id="conference-list-heading" class="mt-1 text-lg font-semibold tracking-tight">
                所有大会
              </h2>
            </div>
            {#if query.trim()}
              <span class="text-xs text-muted-foreground">搜索结果已实时更新</span>
            {/if}
          </div>

          {#if filteredConferences.length === 0}
            <Empty.Root class="min-h-64 border bg-card/45 shadow-sm">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <Search class="size-4" />
                </Empty.Media>
                <Empty.Title>未找到匹配的大会</Empty.Title>
                <Empty.Description>试试其他关键词，或者清空搜索重新浏览。</Empty.Description>
              </Empty.Header>
              <Empty.Content>
                <Button variant="outline" size="sm" onclick={() => (query = '')}>清空搜索</Button>
              </Empty.Content>
            </Empty.Root>
          {:else}
            <div class="flex flex-col gap-3">
              {#each filteredConferences as conference (conference.id)}
                <ConferenceCard {conference} />
              {/each}
            </div>
          {/if}
        </section>
      </main>
      <div class="h-10"></div>
    </ScrollArea>
  </div>
{/if}

<style>
  .page-shell {
    isolation: isolate;
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

  .page-orb-primary-compact {
    top: -24rem;
    right: -16rem;
    width: min(40rem, 55vw);
    opacity: 0.12;
  }

  @media (prefers-reduced-motion: reduce) {
    .page-orb {
      filter: blur(52px);
    }
  }
</style>
