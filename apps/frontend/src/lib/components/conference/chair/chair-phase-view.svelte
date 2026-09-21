<script lang="ts">
  import { AlertTriangle, Gavel, Play, Users } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import { ScrollArea } from '$lib/components/ui/scroll-area'
  import PlaceholderPage from '$lib/components/conference/layout/placeholder-page.svelte'
  import CaucusSetupView from '$lib/components/conference/caucus/caucus-setup-view.svelte'
  import GeneralDebateView from '$lib/components/conference/speakers/general-debate-view.svelte'
  import ModeratedCaucusView from '$lib/components/conference/speakers/moderated-caucus-view.svelte'
  import CaucusCountdownView from '$lib/components/conference/speakers/caucus-countdown-view.svelte'
  import VotingView from '$lib/components/conference/voting/voting-view.svelte'
  import type { ChairScreen } from '$lib/classes/utils/committee/chair-presentation'

  let {
    screen,
    onStartRollCall
  }: {
    screen: ChairScreen
    onStartRollCall: () => void
  } = $props()
</script>

<div class="flex min-h-0 flex-1 overflow-hidden p-6">
  {#if screen.kind === 'preamble'}
    <PlaceholderPage title="会前准备" subtitle="所有参会席位已就位，准备开始点名" icon={Users}>
      <Button size="lg" class="gap-2 bg-indigo-600 hover:bg-indigo-700" onclick={onStartRollCall}>
        <Play size={18} />
        开始点名
      </Button>
    </PlaceholderPage>
  {:else if screen.kind === 'roll_call'}
    <PlaceholderPage title="点名进行中" subtitle="点名页面已在独立页面中打开" icon={Users}>
      <Button size="lg" class="gap-2 bg-indigo-600 hover:bg-indigo-700" onclick={onStartRollCall}>
        <Play size={18} />
        进入点名页面
      </Button>
    </PlaceholderPage>
  {:else if screen.kind === 'pending_speakers_list'}
    <PlaceholderPage
      title="等待开启主发言名单"
      subtitle="点名已完成，需由代表动议「开启主发言名单」以进入一般性辩论"
      icon={Users}
    />
  {:else if screen.kind === 'general_debate'}
    <ScrollArea class="flex-1">
      <GeneralDebateView />
    </ScrollArea>
  {:else if screen.kind === 'caucus_setup'}
    <ScrollArea class="flex-1">
      <CaucusSetupView />
    </ScrollArea>
  {:else if screen.kind === 'moderated_caucus'}
    <ScrollArea class="flex-1">
      <ModeratedCaucusView />
    </ScrollArea>
  {:else if screen.kind === 'caucus_countdown'}
    <ScrollArea class="flex-1">
      <CaucusCountdownView mode={screen.mode} />
    </ScrollArea>
  {:else if screen.kind === 'voting'}
    <ScrollArea class="flex-1">
      <VotingView />
    </ScrollArea>
  {:else if screen.kind === 'suspended'}
    <PlaceholderPage title="会议休会中" subtitle="点击「恢复会议」继续" icon={Gavel} />
  {:else if screen.kind === 'closed'}
    <PlaceholderPage title="会议已闭幕" subtitle="感谢各位代表的参与" icon={Gavel} />
  {:else}
    <PlaceholderPage title="会议状态异常" subtitle={screen.message} icon={AlertTriangle} />
  {/if}
</div>
