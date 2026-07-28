<script lang="ts">
  import { ScrollText, Gavel, Mic, Vote, MessageSquare, Coffee, Pause, Play, Flag, FileText, Calendar, Check, X, UserPlus, UserCheck } from '@lucide/svelte'
  import { currentConference } from '$lib/stores/conference/conference-store'
  import { ACTION_LABELS } from '$lib/types-conference'
  import type { ConferenceActionType } from '$lib/types-conference'

  const conf = $derived($currentConference)

  const recentMinutes = $derived(
    conf ? [...conf.minutes].reverse().slice(0, 50) : []
  )

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function getEventIcon(eventType: ConferenceActionType): typeof ScrollText {
    switch (eventType) {
      case 'roll_call_completed':
      case 'conference_created':
        return Flag
      case 'speaker_ready':
      case 'speaker_started':
      case 'speaker_finished':
        return Mic
      case 'yield':
        return UserPlus
      case 'motion_proposed':
      case 'motion_voted':
      case 'motion_approved':
      case 'motion_rejected':
        return MessageSquare
      case 'voting_started':
      case 'voting_ended':
        return Vote
      case 'caucus_started':
      case 'caucus_ended':
        return Coffee
      case 'meeting_suspended':
        return Pause
      case 'meeting_resumed':
        return Play
      case 'meeting_closed':
        return X
      case 'phase_changed':
        return Gavel
      case 'resolution_introduced':
      case 'resolution_passed':
      case 'resolution_failed':
        return FileText
      case 'point_proposed':
        return MessageSquare
      case 'attendance_changed':
        return UserCheck
      default:
        return Calendar
    }
  }

  function getEventColor(eventType: ConferenceActionType): string {
    if (eventType.includes('speaker') || eventType === 'yield') return 'text-emerald-500'
    if (eventType.includes('motion')) return 'text-indigo-500'
    if (eventType.includes('voting') || eventType.includes('vote')) return 'text-blue-500'
    if (eventType.includes('caucus')) return 'text-amber-500'
    if (eventType.includes('phase') || eventType.includes('roll_call') || eventType.includes('created')) return 'text-purple-500'
    if (eventType.includes('suspended') || eventType.includes('closed')) return 'text-red-500'
    if (eventType.includes('resolution')) return 'text-rose-500'
    if (eventType.includes('point')) return 'text-amber-500'
    if (eventType.includes('attendance')) return 'text-teal-500'
    return 'text-muted-foreground'
  }
</script>

<aside class="flex h-full w-[300px] shrink-0 flex-col border-l bg-muted/20">
  <div class="flex items-center gap-2 border-b px-4 py-3">
    <ScrollText size={14} class="text-muted-foreground" />
    <span class="text-xs font-semibold text-foreground">会议记录</span>
    <span class="ml-auto text-[10px] text-muted-foreground">
      {conf?.minutes.length ?? 0} 条
    </span>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if recentMinutes.length === 0}
      <div class="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <ScrollText size={28} class="opacity-20" />
        <p class="text-xs text-muted-foreground">暂无会议记录</p>
      </div>
    {:else}
      <div class="relative">
        <!-- 时间线 -->
        <div class="absolute left-5 top-0 bottom-0 w-px bg-border"></div>

        {#each recentMinutes as entry (entry.id)}
          {@const Icon = getEventIcon(entry.actionType)}
          {@const colorClass = getEventColor(entry.actionType)}
          <div class="relative flex gap-3 px-4 py-2">
            <!-- 时间线 dot -->
            <div class="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card {colorClass}">
              <Icon size={10} />
            </div>

            <!-- 内容 -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
                <span class="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                </span>
              </div>
              <p class="mt-0.5 text-[11px] leading-relaxed text-foreground">
                {entry.description}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</aside>
